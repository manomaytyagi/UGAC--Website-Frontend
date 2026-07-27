/* ===========================================================================
   UGAC WEBSITE — API BRIDGE
   ---------------------------------------------------------------------------
   One module sits between the React pages and the FastAPI backend documented
   in integration.md. The pages never speak HTTP; they ask this file for the
   exact shape they render, and this file does the fetching, paging, caching,
   joining and reshaping.

   Every read returns the same envelope:

       { data, source }        source: "live" | "fallback"

   so a page can always render something. If the network dies, the backend is
   cold, or a field is missing, the caller's fallback data is returned and the
   page shows its "sample data" banner instead of an error.

   PUBLIC SURFACE (this is the contract the pages rely on)
   ---------------------------------------------------------------------------
     apiFetch(path, fallback)        virtual endpoints  -> { data, source }
     api.departments(fb)             CoursesPage
     api.coursesLite(fb)             CoursesPage
     api.courseDetail(id, fb)        CourseDetailPage
     api.submitReview(payload)       CourseDetailPage  (throws on failure)
     api.curriculum(code, fb, opts)  CurriculumPage
     api.electiveBaskets(fb, opts)
     api.search(q, fb)
     resourcesApi.category(tab, fb)  ResourcesPage, Homepage
     resourcesApi.presignedUrl(key)  ResourcesPage
     branchMeta(code)                FacultyAdvisers
     batchLabel(value)
     submitFeedback(payload)         Community > Feedback (opt-in, see below)

   CONFIGURATION (Vite env vars, all optional)
   ---------------------------------------------------------------------------
     VITE_API_BASE          backend origin. Defaults to the deployed backend.
                            Set it to "/api-proxy" only if you actually add a
                            proxy rewrite — the repo currently has none.
     VITE_HCAPTCHA_TOKEN    dev-only hCaptcha token for review submission.
     VITE_FORMSPREE_ID      enables the feedback form.
     VITE_FEEDBACK_ENDPOINT overrides Formspree with your own POST endpoint.
   =========================================================================== */

const ENV = (typeof import.meta !== "undefined" && import.meta.env) || {};

export const API_BASE = String(
  ENV.VITE_API_BASE ||
    "https://ug-0ceb454fbac544039d40462fe569d71b.ecs.ap-south-1.on.aws"
).replace(/\/+$/, "");

export const FORMSPREE_ID = ENV.VITE_FORMSPREE_ID || "";
export const FEEDBACK_ENDPOINT =
  ENV.VITE_FEEDBACK_ENDPOINT ||
  (FORMSPREE_ID ? `https://formspree.io/f/${FORMSPREE_ID}` : "");

/* The backend scales to zero, so the first request of a session can take far
   longer than a warm one while the container starts. The pages show a "waking
   up" toast after 4s; these budgets let that actually pay off instead of
   aborting the request out from under it. */
const TIMEOUT_MS = 15000;      // normal request
const COLD_TIMEOUT_MS = 45000; // retry, assuming a cold start
const CACHE_TTL_MS = 5 * 60 * 1000;

/* ===========================================================================
   1. HTTP layer
   =========================================================================== */

export class ApiError extends Error {
  constructor(message, { status = 0, path = "", detail = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.path = path;
    this.detail = detail;
  }
}

/** Build a query string, dropping empty values. */
function qs(params) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    usp.append(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

/** Pull a human-readable message out of FastAPI's error bodies. */
function describeDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : null;
        return field ? `${field}: ${d.msg}` : d?.msg;
      })
      .filter(Boolean)
      .join("; ");
  }
  return JSON.stringify(detail);
}

async function once(path, { method, body, timeout, signal, headers }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort);
  }
  const timer = setTimeout(abort, timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : null),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = null;
      try {
        detail = (await res.json())?.detail ?? null;
      } catch {
        /* error body was not JSON — status alone will have to do */
      }
      const suffix = describeDetail(detail);
      throw new ApiError(
        `${method} ${path} failed: ${res.status}${suffix ? ` — ${suffix}` : ""}`,
        { status: res.status, path, detail }
      );
    }

    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === "AbortError") {
      throw new ApiError(`${method} ${path} timed out`, { status: 0, path });
    }
    throw new ApiError(`${method} ${path} failed: ${err?.message || err}`, {
      status: 0,
      path,
    });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", abort);
  }
}

const RETRYABLE_STATUS = new Set([0, 408, 429, 500, 502, 503, 504]);

/**
 * One backend request. GETs get a single retry on a cold start / transient
 * failure with a much longer budget. Writes are never retried — a duplicated
 * POST would mean a duplicated review.
 */
export async function request(path, options = {}) {
  const { method = "GET", body, signal, headers } = options;
  try {
    return await once(path, { method, body, timeout: TIMEOUT_MS, signal, headers });
  } catch (err) {
    const retryable =
      method === "GET" && err instanceof ApiError && RETRYABLE_STATUS.has(err.status);
    if (!retryable || signal?.aborted) throw err;
    return once(path, { method, body, timeout: COLD_TIMEOUT_MS, signal, headers });
  }
}

/* ===========================================================================
   2. Cache — TTL + in-flight de-duplication

   Several pages need the same collections at the same moment (CoursesPage asks
   for departments and courses in parallel; the curriculum view needs courses
   again; the community tabs both read /faculty/). Without this, one page load
   fires the same cold-start request three times.
   =========================================================================== */

const cache = new Map(); // path -> { expires, value }
const inflight = new Map(); // path -> Promise

async function getCached(path, ttl = CACHE_TTL_MS) {
  const hit = cache.get(path);
  if (hit && hit.expires > Date.now()) return hit.value;
  if (inflight.has(path)) return inflight.get(path);

  const promise = request(path)
    .then((value) => {
      cache.set(path, { expires: Date.now() + ttl, value });
      return value;
    })
    .finally(() => inflight.delete(path));

  inflight.set(path, promise);
  return promise;
}

/** Drop cached responses. Pass a prefix to clear one collection. */
export function clearApiCache(prefix) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/**
 * Walk a paginated list endpoint until it runs out. skip=0&limit=100 with no
 * filters is exactly the shape the backend serves from Redis, so the first
 * page of every collection stays cheap.
 */
async function getPaged(path, { params = {}, limit = 100, maxPages = 25 } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const chunk = await getCached(
      `${path}${qs({ ...params, skip: page * limit, limit })}`
    );
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    out.push(...chunk);
    if (chunk.length < limit) break;
  }
  return out;
}

/** Wrap a live read so a failure degrades to the caller's fallback data. */
async function withFallback(load, fallbackData) {
  try {
    return { data: await load(), source: "live" };
  } catch (err) {
    if (ENV.DEV) console.warn("[apiBridge] falling back:", err?.message || err);
    return { data: fallbackData, source: "fallback" };
  }
}

/* ===========================================================================
   3. Small shared helpers
   =========================================================================== */

/** The admin panel occasionally leaks a stringified Python object. Drop those. */
function clean(value) {
  if (typeof value !== "string") return value ?? null;
  const s = value.trim();
  if (!s || /^<.*object at 0x[0-9a-f]+>$/i.test(s)) return null;
  return s;
}

/** First non-empty value among the given keys. */
function pick(obj, ...keys) {
  for (const key of keys) {
    const v = clean(obj?.[key]);
    if (v !== null && v !== undefined && v !== "") return v;
  }
  return null;
}

const slugKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const isHttp = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const storageUrl = (key) =>
  key ? `${API_BASE}/storage/file/${String(key).replace(/^\/+/, "")}` : null;

function initials(name, max = 2) {
  const letters = String(name || "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return letters.slice(0, max);
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function titleCase(s) {
  const t = String(s || "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/* ===========================================================================
   4. Departments

   The picker shows the twelve departments the backend actually has — schools
   and centres, under their own names ("School of Computer and Electrical
   Engineering", "Centre for Quantum Science and Technology"). Nothing is
   remapped onto a curated discipline list, because that list was really a
   list of *branches*: it invented tiles the backend has no row for (ece, dse)
   and forced the merged schools to be split in half, which is where the
   0-course tiles came from.

   So a tile IS a backend row. `id` is the lowercased department code ("scee"),
   which is stable across redeploys and readable in a URL, while `apiId` keeps
   the UUID for joins. A course reaches its tile through `department_id`; the
   course-code prefix is only a fallback for rows where that column is null or
   points at a department that no longer exists.

   Branch names live in BRANCH_META (section 5) and are a separate namespace —
   curriculum and faculty advisers key off those, courses do not.
   =========================================================================== */

/* Colours are keyed by department code, not by array position, so adding or
   reordering a department never reshuffles the existing tiles. */
const DEPT_COLORS = {
  SCEE:  "#4f7cc4",
  SCENE: "#c25b52",
  SCS:   "#9c4a52",
  SHSS:  "#7a6cae",
  SMME:  "#4e9b72",
  SMSS:  "#37548f",
  SPS:   "#6f7bd0",
  SBB:   "#2f6e54",
  CAIR:  "#3f7d8c",
  CQST:  "#b03a42",
  IKS:   "#8a6d3b",
  SOM:   "#5c7a99",
};

const DEPT_PALETTE = [
  "#4f7cc4", "#d18a3e", "#4e9b72", "#c25b52", "#37548f", "#9c4a52",
  "#2f8f86", "#7a6cae", "#a8682c", "#2f6e54", "#6f7bd0", "#e0aa6b",
];

/**
 * Course-code prefix -> department code.
 *
 * Only consulted when a course has no usable `department_id`. A merged school
 * is not a problem here: CS and EE courses both belong to SCEE, so they map to
 * the same tile rather than needing to be told apart.
 *
 * DS/DSE/DSAI point at SCEE because Data Science is taught there. If that
 * changes, or if a code prefix is missing, this table is the one-line fix.
 */
const CODE_PREFIX_DEPT = {
  CS: "SCEE", CSE: "SCEE", EE: "SCEE", EEE: "SCEE", EC: "SCEE", ECE: "SCEE",
  DS: "SCEE", DSE: "SCEE", DSAI: "SCEE", VL: "SCEE", VLSI: "SCEE",
  ME: "SMME", MECH: "SMME", MT: "SMME", MS: "SMME", MSE: "SMME",
  CE: "SCENE", CIV: "SCENE", EV: "SCENE",
  CH: "SCS", CY: "SCS", CHM: "SCS", CHEM: "SCS",
  MA: "SMSS", MTH: "SMSS", MATH: "SMSS", MNC: "SMSS", MC: "SMSS", ST: "SMSS",
  PH: "SPS", PHY: "SPS", EP: "SPS",
  BT: "SBB", BIO: "SBB", BE: "SBB", BS: "SBB",
  HS: "SHSS", HSS: "SHSS", IC: "SHSS", HU: "SHSS",
  AI: "CAIR", RB: "CAIR",
  QT: "CQST", QST: "CQST", QS: "CQST",
  IK: "IKS", IKS: "IKS",
  MG: "SOM", MGT: "SOM", MBA: "SOM", MN: "SOM",
};

/** "scee" / "SCEE-2" / " scee " -> "SCEE". */
function normalizeDeptCode(raw) {
  const value = clean(raw);
  return value ? String(value).toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

/** "School of Chemical Sciences" -> "Chemical Sciences", for tight layouts. */
function trimDeptName(name) {
  return String(name || "")
    .replace(/^\s*(school|centre|center|department|dept\.?)\s+(of|for)\s+/i, "")
    .trim();
}

/** "CS301" -> "SCEE". Fallback only — `department_id` wins when present. */
function deptCodeFromCourseCode(code) {
  const prefix = /^([A-Za-z]{2,4})/.exec(String(code || "").trim())?.[1];
  if (!prefix) return null;
  const upper = prefix.toUpperCase();
  return (
    CODE_PREFIX_DEPT[upper] ||
    CODE_PREFIX_DEPT[upper.slice(0, 3)] ||
    CODE_PREFIX_DEPT[upper.slice(0, 2)] ||
    null
  );
}

/**
 * Fetch /departments/ once and index it three ways:
 *
 *   list    — the picker, one entry per backend row, in the order returned
 *   byApiId — UUID -> entry, for the course and faculty joins
 *   byCode  — "SCEE" -> entry, for the code-prefix fallback
 *
 * Every row becomes a tile. Nothing is dropped for failing to match a curated
 * table, because there is no curated table to match against any more.
 */
async function loadDepartmentIndex() {
  const rows = await getPaged("/departments/");
  if (!rows.length) throw new ApiError("No departments returned");

  const list = [];
  const byApiId = new Map();
  const byCode = new Map();

  rows.forEach((row, i) => {
    const code = normalizeDeptCode(row.code) || initials(row.name, 4) || `D${i}`;
    const name = clean(row.name) || clean(row.code) || "Department";

    const entry = {
      /* Tile id: the department code, lowercased. Stable, readable, and not
         tied to a UUID that changes when a row is recreated. */
      id: code.toLowerCase(),
      code,
      name,
      shortName: trimDeptName(name) || name,
      short: code,
      color: DEPT_COLORS[code] || DEPT_PALETTE[i % DEPT_PALETTE.length],
      apiId: row.id,
      apiCode: clean(row.code),
      apiName: clean(row.name),
      description: clean(row.description),
    };

    byApiId.set(row.id, entry);
    if (!byCode.has(code)) byCode.set(code, entry);
    list.push(entry);
  });

  return { list, byApiId, byCode };
}

/* ===========================================================================
   5. Branches

   Curriculum, Team and Faculty Advisers all key off branch codes. The backend
   stores branch codes with a degree suffix ("CSE-BT") and the pages use bare
   codes, plus a few historic spellings (BE/BIO, MC/MNC, QST/QSE), so every
   branch string goes through resolveBranchCode() before it is used as a key.
   =========================================================================== */

const BRANCH_META = {
  BIO:  { name: "Bio Engineering",                              color: "#6fa3d0" },
  CSE:  { name: "Computer Science and Engineering",             color: "#4f7cc4" },
  EE:   { name: "Electrical Engineering",                       color: "#37548f" },
  CE:   { name: "Civil Engineering",                            color: "#d98c80" },
  ME:   { name: "Mechanical Engineering",                       color: "#c25b52" },
  MNC:  { name: "Mathematics and Computing",                    color: "#9c4a52" },
  VLSI: { name: "Microelectronics and VLSI",                    color: "#84b88c" },
  EP:   { name: "Engineering Physics",                          color: "#4e9b72" },
  DSAI: { name: "Data Science and Artificial Intelligence",     color: "#2f6e54" },
  MSE:  { name: "Materials Science and Engineering",            color: "#e0aa6b" },
  GE:   { name: "General Engineering",                          color: "#d18a3e" },
  BS:   { name: "BS in Chemical Sciences",                      color: "#a8682c" },
  DSE:  { name: "Data Science and Engineering",                 color: "#2a3f6e" },
  QSE:  { name: "Quantum Science and Engineering",              color: "#b03a42" },
  AE:   { name: "Agricultural Engineering with Data Analytics", color: "#1d4d38" },
  CEDA: { name: "Chemical Engineering with Data Analytics",     color: "#7a4a1e" },
  CHE:  { name: "Chemical Engineering",                         color: "#3f7d8c" },
};

const BRANCH_BY_NAME = new Map(
  Object.entries(BRANCH_META).map(([code, meta]) => [slugKey(meta.name), code])
);

const BRANCH_ALIASES = {
  be: "BIO", bioengineering: "BIO", biotechnology: "BIO", bioengg: "BIO",
  mc: "MNC", mathematicsandcomputing: "MNC", maths: "MNC",
  qst: "QSE", quantumscienceandtechnology: "QSE", quantum: "QSE",
  microelectronicsandvlsi: "VLSI",
  che: "CHE", chemicalengineering: "CHE",
  ge: "GE", generalengineering: "GE",
  cs: "CSE", computerscience: "CSE",
  dsai: "DSAI", dsedataScience: "DSE",
};

/** Strip degree suffixes: "CSE-BT" / "CSE_BTECH" -> "CSE". */
function stripDegreeSuffix(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[-_\s]*(BT|BTECH|BE|MT|MTECH|MS|PHD|UG|PG)$/i, "")
    .trim();
}

/** Turn anything branch-ish (code, suffixed code, full name) into a key. */
export function resolveBranchCode(raw) {
  const value = clean(raw);
  if (!value) return "";

  const upper = String(value).trim().toUpperCase();
  if (BRANCH_META[upper]) return upper;

  const stripped = stripDegreeSuffix(upper).replace(/[^A-Z0-9]/g, "");
  if (BRANCH_META[stripped]) return stripped;

  const key = slugKey(value);
  if (BRANCH_BY_NAME.has(key)) return BRANCH_BY_NAME.get(key);
  if (BRANCH_ALIASES[key]) return BRANCH_ALIASES[key];
  if (BRANCH_ALIASES[slugKey(stripped)]) return BRANCH_ALIASES[slugKey(stripped)];

  return stripped || upper;
}

/** Display name + colour for a branch code. Never throws, never returns null. */
export function branchMeta(code) {
  const resolved = resolveBranchCode(code);
  if (BRANCH_META[resolved]) return { code: resolved, ...BRANCH_META[resolved] };
  return {
    code: resolved || "GEN",
    name: clean(code) || "General",
    color: "#4f7cc4",
  };
}

/** Fetch /branches/ once, indexed by UUID and by resolved code. */
async function loadBranchIndex() {
  const rows = await getPaged("/branches/");
  const byApiId = new Map();
  const byCode = new Map();

  for (const row of rows) {
    const code = resolveBranchCode(row.code) || resolveBranchCode(row.name);
    const entry = {
      apiId: row.id,
      apiCode: clean(row.code),
      code,
      name: BRANCH_META[code]?.name || clean(row.name) || code,
      color: branchMeta(code).color,
      departmentId: row.department_id ?? null,
    };
    byApiId.set(row.id, entry);
    if (code && !byCode.has(code)) byCode.set(code, entry);
  }

  return { rows, byApiId, byCode };
}

/* ===========================================================================
   6. Courses
   =========================================================================== */

/**
 * The full course list. /courses/ carries department_id (which /courses/lite
 * does not) and that join is what puts courses under the right department on
 * the catalogue page, so it is preferred; /courses/lite is the safety net.
 */
async function loadCourses() {
  try {
    const rows = await getPaged("/courses/");
    if (rows.length) return rows;
  } catch {
    /* fall through to the lite endpoint */
  }
  const lite = await getCached("/courses/lite");
  return Array.isArray(lite) ? lite : [];
}

/** UUID -> raw course row, for prerequisite and curriculum joins. */
async function loadCourseIndex() {
  const rows = await loadCourses();
  return new Map(rows.map((c) => [c.id, c]));
}

/**
 * `extra_data` is free-form JSON typed by admins, so "intended for" lists
 * arrive as either a real array or a comma/slash separated string.
 */
function shapeList(value) {
  const items = Array.isArray(value)
    ? value
    : String(value ?? "").split(/[,;/|\n]/);
  return items
    .map((item) =>
      typeof item === "string"
        ? clean(item)
        : clean(item?.name) || clean(item?.code) || clean(item?.title)
    )
    .filter(Boolean);
}

/** A document link may be a full URL or a storage key. Accept both. */
function documentUrl(...values) {
  for (const value of values) {
    const v = clean(value);
    if (!v) continue;
    return isHttp(v) ? v : storageUrl(v);
  }
  return null;
}

/**
 * Which department does this course belong to?
 *
 * `department_id` is authoritative — it is the backend's own answer and it
 * needs no interpretation now that a tile is a department rather than half of
 * one. The code prefix is consulted only when that column is null or points at
 * a department row that no longer exists (deleted and recreated schools leave
 * exactly that kind of dangling reference).
 */
function departmentForCourse(row, deptIndex) {
  const joined = deptIndex?.byApiId.get(row.department_id);
  if (joined) return joined.id;

  const code = deptCodeFromCourseCode(row.code);
  const guessed = code ? deptIndex?.byCode.get(code) : null;
  return guessed?.id ?? null;
}

function shapeCourseSummary(row, deptIndex) {
  return {
    id: row.id,
    code: clean(row.code) || "",
    title: clean(row.name) || "Untitled course",
    dept: departmentForCourse(row, deptIndex),
    /* true when the course reached its department through its code prefix
       rather than through department_id — i.e. the backend row is missing or
       dangling and this placement is a guess. */
    deptInferred: !deptIndex?.byApiId.has(row.department_id),
    credits: toNumber(row.credits),
  };
}

/* ===========================================================================
   7. Events
   =========================================================================== */

/** Events return ISO datetimes; midnight UTC means "no time was set". */
function eventTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null;
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const isoDate = (value) =>
  value ? String(value).slice(0, 10) : null;

/** The attachment list is free-form JSON; accept the shapes admins produce. */
function shapeDocuments(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((doc) => {
      if (typeof doc === "string") {
        return isHttp(doc)
          ? { label: "Document", url: doc }
          : { label: "Document", url: storageUrl(doc) };
      }
      const url =
        pick(doc, "url", "link", "file_url", "href") ||
        storageUrl(pick(doc, "key", "file_key", "storage_key"));
      if (!url) return null;
      return {
        label: pick(doc, "label", "name", "title", "filename") || "Document",
        url,
      };
    })
    .filter(Boolean);
}

function shapeEvent(row) {
  /* GET responses alias the columns: event_date -> date, banner_key ->
     image_key. Both spellings are read so a schema change can't blank the
     page. */
  const start = pick(row, "date", "event_date");
  const end = pick(row, "end_date");
  const tags = Array.isArray(row.tags) ? row.tags.filter(Boolean) : [];

  return {
    id: row.id,
    title: clean(row.title) || "Untitled event",
    desc: clean(row.description) || "",
    date: isoDate(start),
    endDate: isoDate(end),
    time: eventTime(start),
    venue: pick(row, "location", "venue"),
    audience: pick(row, "audience"),
    banner_key: pick(row, "image_key", "banner_key", "banner_url") || "",
    form_url: pick(row, "registration_url", "form_url"),
    report_key: pick(row, "report_key"),
    youtube_url: pick(row, "youtube_url"),
    canva_url: pick(row, "canva_url"),
    documents: shapeDocuments(row.documents),
    tags,
    tag: tags.length ? titleCase(tags[0]) : "Event",
    isFeatured: Boolean(row.is_featured),
  };
}

/**
 * Split into the two lists the Events page renders. A multi-day event stays
 * "upcoming" until its end date passes, and the comparison is against the
 * start of today so an event happening this afternoon is not already past.
 */
function shapeEvents(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];
  const past = [];

  for (const row of list) {
    if (row?.is_active === false) continue;
    const event = shapeEvent(row);
    if (!event.date) continue;
    const closes = new Date(event.endDate || event.date);
    (closes >= today ? upcoming : past).push(event);
  }

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date)); // soonest first
  past.sort((a, b) => new Date(b.date) - new Date(a.date));     // newest first

  return { upcoming, past };
}

/* ===========================================================================
   8. Announcements — camelCase, pinned first, then newest first.
   =========================================================================== */

function shapeAnnouncement(row) {
  return {
    id: row.id,
    title: clean(row.title) || "",
    content: clean(row.content) || "",
    category: clean(row.category) || "Notice",
    attachmentUrl: pick(row, "attachment_url"),
    publishedAt: pick(row, "published_at", "created_at"),
    isPinned: Boolean(row.is_pinned),
    isActive: row.is_active !== false,
  };
}

function shapeAnnouncements(rows) {
  const time = (a) => (a.publishedAt ? new Date(a.publishedAt).getTime() : 0);
  return (Array.isArray(rows) ? rows : [])
    .map(shapeAnnouncement)
    .filter((a) => a.isActive && a.title)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return time(b) - time(a);
    });
}

/* ===========================================================================
   9. Faculty -> Community pages

   /faculty/ is one flat collection feeding two pages. There is no "type"
   column: the role lives in `designation` ("Faculty Advisor", "Dean of
   Students", "Chairperson, SCEE"), so it is classified here. `branch_id` and
   `department_id` are UUIDs, so both lookup tables are joined in before
   grouping — without that join every adviser lands in one nameless bucket.
   =========================================================================== */

/** Order matters: "Dean of Students" is a dean, not a student rep. */
function classifyFaculty(text) {
  const s = String(text || "").toLowerCase().replace(/[\s._-]+/g, "");
  if (!s) return "";
  if (s.includes("adviser") || s.includes("advisor")) return "adviser";
  if (s.includes("director")) return "director";
  if (s.includes("dean")) return "dean";
  if (s.includes("chair")) return "school_chair";
  if (s.includes("office") || s.includes("registrar")) return "school_office";
  if (s.includes("secretary") || s.includes("council") || s.includes("student"))
    return "student_body";
  return "";
}

function normalizeFaculty(row, { branchIndex, deptIndex } = {}) {
  const designation = pick(row, "designation", "role", "position") || "";
  const explicit = classifyFaculty(pick(row, "type", "category", "contact_type"));

  const branchEntry = branchIndex?.byApiId.get(row.branch_id) || null;
  const deptEntry = deptIndex?.byApiId.get(row.department_id) || null;

  const deptLabel =
    deptEntry?.name || pick(row, "department", "dept") || "";

  return {
    id: row.id ?? pick(row, "email", "name"),
    name: clean(row.name) || "",
    email: pick(row, "email"),
    phone: pick(row, "phone", "phone_number", "contact"),
    link: pick(row, "linkedin_url", "linkedin", "profile_url", "link"),
    photo: pick(row, "photo_url", "photo", "image_url"),
    designation,
    department: deptLabel,
    office: pick(row, "office_location", "office"),
    branch: branchEntry?.code || resolveBranchCode(pick(row, "branch", "branch_code")),
    branchName: branchEntry?.name || null,
    batch: row.batch_year ?? pick(row, "batch", "year"),
    type: explicit || classifyFaculty(designation),
    active: row.is_active !== false,
  };
}

/** Sort key so 1st year comes before 4th, and unknowns sink to the bottom. */
function batchSortKey(batch) {
  if (batch === null || batch === undefined || batch === "") return 9999;
  const n = parseInt(String(batch).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 9999;
}

/** 1 -> "1st Year", 2023 -> "Batch 2023", "2nd Year" -> unchanged. */
export function batchLabel(batch) {
  if (batch === null || batch === undefined || batch === "") return "";
  const s = String(batch).trim();
  if (/year/i.test(s)) return s;

  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return `Batch ${digits}`;

  const n = parseInt(digits, 10);
  const ordinals = ["1st", "2nd", "3rd", "4th", "5th"];
  return n >= 1 && n <= 5 ? `${ordinals[n - 1]} Year` : s;
}

function shapeAdvisers(rows, indexes) {
  const people = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeFaculty(row, indexes))
    .filter((m) => m.active);

  /* Prefer an explicit "Faculty Advisor" designation. If nobody is labelled
     that way, fall back to anyone attached to a branch and a batch — that
     combination only exists for advisers. */
  let advisers = people.filter((m) => m.type === "adviser");
  if (!advisers.length) {
    advisers = people.filter((m) => m.branch && m.batch !== null && m.batch !== undefined);
  }

  const byBranch = new Map();
  for (const person of advisers) {
    const code = person.branch || "GEN";
    const known = Object.prototype.hasOwnProperty.call(BRANCH_META, code);
    const meta = branchMeta(code);
    const name = known ? meta.name : person.branchName || meta.name;

    if (!byBranch.has(code)) {
      byBranch.set(code, {
        id: code,
        code: known ? code : initials(name, 4) || code,
        name,
        color: meta.color,
        advisers: [],
      });
    }

    byBranch.get(code).advisers.push({
      name: person.name || null,
      email: person.email,
      phone: person.phone,
      link: person.link,
      office: person.office,
      batch: person.batch,
      batchLabel: batchLabel(person.batch),
    });
  }

  return [...byBranch.values()]
    .map((branch) => ({
      ...branch,
      advisers: branch.advisers.sort(
        (a, b) => batchSortKey(a.batch) - batchSortKey(b.batch)
      ),
      count: branch.advisers.length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* Fixed order and colours so the Important Contacts page looks the same
   whatever order the backend returns rows in. */
const CONTACT_GROUPS = [
  { id: "director", type: "director",     title: "Director",
    sub: "Head of the institute",             color: "#37548f" },
  { id: "deans",    type: "dean",         title: "Deans",
    sub: "Deans & associate deans",           color: "#4e9b72" },
  { id: "student",  type: "student_body", title: "Student Body",
    sub: "Council & student representatives", color: "#d18a3e" },
  { id: "chairs",   type: "school_chair", title: "Department / School Chairs",
    sub: "Academic heads across schools",     color: "#c25b52" },
  { id: "offices",  type: "school_office", title: "School Offices",
    sub: "School administrative offices",     color: "#6fa3d0" },
];

function shapeContacts(rows, indexes) {
  const people = (Array.isArray(rows) ? rows : [])
    .map((row) => normalizeFaculty(row, indexes))
    .filter((m) => m.active && m.type && m.type !== "adviser" && m.name);

  return CONTACT_GROUPS.map((group) => ({
    ...group,
    people: people
      .filter((m) => m.type === group.type)
      .map((m) => ({
        id: m.id,
        name: m.name,
        role: m.designation || m.department || "",
        department: m.department,
        email: m.email,
        phone: m.phone,
        link: m.link,
        office: m.office,
      })),
  })).filter((group) => group.people.length > 0);
}

/* ===========================================================================
   10. Team

   /team/ is already typed (council / secretary / support / faculty), so this
   is mostly grouping: councillors and sub-councillors under their branch, and
   support members collapsed into one card per team.
   =========================================================================== */

function shapeMember(row) {
  return {
    id: row.id,
    name: clean(row.name) || "",
    role: clean(row.role) || "Council Member",
    email: pick(row, "email"),
    phone: pick(row, "phone", "contact"),
    linkedin: pick(row, "linkedin_url", "linkedin"),
    photo_url: pick(row, "photo_url"),
    code: initials(row.name),
  };
}

const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999);
const isSubCouncillor = (role) => /\bsub|assoc|deputy/i.test(String(role || ""));

function shapeTeam(rows) {
  const list = (Array.isArray(rows) ? rows : []).filter((m) => m?.is_active !== false);

  /* Secretary — the featured one wins, otherwise the lowest order. */
  const secretaryRow =
    list.filter((m) => m.type === "secretary").sort((a, b) => {
      if (Boolean(b.is_featured) !== Boolean(a.is_featured))
        return Boolean(b.is_featured) - Boolean(a.is_featured);
      return byOrder(a, b);
    })[0] || null;

  const secretary = secretaryRow
    ? {
        ...shapeMember(secretaryRow),
        description: clean(secretaryRow.bio) || "Academic Secretary",
      }
    : null;

  /* Councillors, grouped by branch. */
  const branches = new Map();
  list
    .filter((m) => m.type === "council")
    .sort(byOrder)
    .forEach((row) => {
      const code = resolveBranchCode(pick(row, "branch_code", "branch"));
      if (!code) return;

      const meta = branchMeta(code);
      if (!branches.has(code)) {
        branches.set(code, {
          id: code,
          code,
          name: meta.name,
          color: meta.color,
          councillor: null,
          subs: [],
        });
      }

      const branch = branches.get(code);
      const member = shapeMember(row);
      if (!branch.councillor && !isSubCouncillor(row.role)) branch.councillor = member;
      else branch.subs.push(member);
    });

  /* Support teams — several members can share a team, so collapse by name and
     let the first (lowest order / featured) member be the listed lead. */
  const supportTeams = [];
  const teamsByName = new Map();
  list
    .filter((m) => m.type === "support")
    .sort(byOrder)
    .forEach((row) => {
      const name = pick(row, "team_name", "portfolio") || row.name || "Team";
      const key = slugKey(name);
      if (!teamsByName.has(key)) {
        const team = {
          id: key || row.id,
          name,
          lead: clean(row.name) || "",
          blurb: clean(row.bio) || "",
          featured: Boolean(row.is_featured),
          members: [],
        };
        teamsByName.set(key, team);
        supportTeams.push(team);
      }
      teamsByName.get(key).members.push(shapeMember(row));
    });

  /* The support screen highlights one card; if nobody is flagged, promote the
     first so the layout still has its feature slot filled. */
  if (supportTeams.length && !supportTeams.some((t) => t.featured)) {
    supportTeams[0].featured = true;
  }

  return { secretary, branches: [...branches.values()], supportTeams };
}

/* ===========================================================================
   11. Resources

   Resource categories are free text in the admin panel ("syllabus", "form",
   "Useful Link", …) while the page has three fixed tabs. Rather than trusting
   one exact string, the whole collection is fetched once and bucketed by
   keyword, with the file/URL shape as a tie-breaker.
   =========================================================================== */

const RESOURCE_BUCKETS = {
  forms: ["form", "application", "template", "undertaking", "affidavit"],
  links: ["link", "portal", "website", "external", "site", "drive"],
  papers: ["paper", "pyq", "question", "previous", "exam"],
  documents: [
    "document", "doc", "pdf", "regulation", "ordinance", "policy", "syllabus",
    "calendar", "handbook", "guide", "manual", "minutes", "circular", "notice",
    "report", "archive", "curriculum",
  ],
};

function bucketOf(resource) {
  const category = slugKey(resource.category);
  for (const [bucket, keywords] of Object.entries(RESOURCE_BUCKETS)) {
    if (keywords.some((k) => category.includes(k))) return bucket;
  }
  /* No usable category: a bare web link is a link, anything else is a doc. */
  const url = resource.file_url || "";
  if (isHttp(url) && !/\.(pdf|docx?|xlsx?|pptx?|csv|zip)(\?|$)/i.test(url)) return "links";
  return "documents";
}

/** Pick a badge that exists in the page's TAG_COLORS map where possible. */
function resourceTag(resource, bucket, url) {
  const category = slugKey(resource.category);
  if (bucket === "forms" || category.includes("form")) return "Form";
  if (/drive\.google\./i.test(url)) return "Drive";

  if (bucket === "links") {
    if (/library/i.test(url)) return "Library";
    if (/erp|moodle|portal|samarth/i.test(url)) return "Portal";
    if (/iitmandi\.ac\.in/i.test(url)) return "Official";
    return "External";
  }

  if (category.includes("archive")) return "Archive";
  if (category.includes("guide") || category.includes("handbook")) return "Guide";
  if (/\.pdf(\?|$)/i.test(url) || category.includes("pdf")) return "PDF";
  return "Document";
}

function shapeResource(row) {
  const bucket = bucketOf(row);
  const raw = pick(row, "file_url", "url", "link");
  const url = isHttp(raw) ? raw : null;
  /* A non-URL file_url is a storage key; the page trades it for a presigned
     download link when the card is clicked. */
  const fileKey = url ? pick(row, "file_key", "key", "storage_key") : raw;

  const description =
    pick(row, "description", "desc") ||
    [titleCase(row.category), clean(row.academic_year)].filter(Boolean).join(" · ");

  return {
    id: row.id,
    title: clean(row.title) || "Untitled",
    desc: description || "",
    tag: resourceTag(row, bucket, url || fileKey || ""),
    url,
    file_key: fileKey || null,
    bucket,
    academicYear: clean(row.academic_year),
  };
}

async function loadResources() {
  const rows = await getPaged("/resources/");
  return rows.filter((r) => r?.is_active !== false).map(shapeResource);
}

/** Presigned-URL responses may be a bare string or a wrapper object. */
function extractUrl(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return isHttp(payload) ? payload : null;
  return pick(payload, "url", "presigned_url", "signed_url", "file_url", "download_url");
}

/* ===========================================================================
   12. Curriculum
   =========================================================================== */

const GE_SPECIALISATIONS = {
  "GE-CS": "Computer Science",
  "GE-EE": "Electrical Engineering",
  "GE-ME": "Mechanical Engineering",
  "GE-CE": "Civil Engineering",
  "GE-BIO": "Bio Engineering",
  "GE-DSAI": "Data Science & AI",
};

/** True if a stored specialisation string matches the requested one. */
function specialisationMatches(stored, wanted) {
  if (!wanted) return true;
  if (!stored) return false;
  const a = slugKey(stored);
  const b = slugKey(wanted);
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const label = GE_SPECIALISATIONS[String(wanted).toUpperCase()];
  return label ? slugKey(label) === a || a.includes(slugKey(label)) : false;
}

/** Category-wise credit breakdown; the header total is the sum of the rows so
    it can never contradict the bars underneath it. */
function creditBreakdown(curriculum) {
  const rows = [
    ["Institute Compulsory", curriculum.ic_credits ?? curriculum.ic_compulsory_credits],
    ["ICB", curriculum.icb_credits],
    ["Discipline Core", curriculum.dc_credits],
    ["Discipline Elective", curriculum.de_credits],
    ["Free Elective", curriculum.fe_credits],
    ["HSS / IKS", curriculum.hss_iks_credits],
    ["MTP", curriculum.mtp_credits],
    ["ISTP", curriculum.istp_credits],
    ["Research", curriculum.research_credits],
  ].map(([label, value]) => ({ label, credits: toNumber(value) }));

  const summed = rows.reduce((total, row) => total + row.credits, 0);
  return {
    total: summed || toNumber(curriculum.total_credits),
    rows: rows.filter((row) => row.credits > 0),
  };
}

/** Curriculum-course rows may carry a specialisation in extra_data. */
function courseSpecialisation(link, curriculum) {
  return (
    pick(link, "specialisation", "specialization") ||
    pick(link.extra_data || {}, "specialisation", "specialization") ||
    pick(curriculum, "specialization", "specialisation")
  );
}

/* ===========================================================================
   13. apiFetch — the virtual endpoints the pages call by path
   =========================================================================== */

const VIRTUAL_ROUTES = [
  {
    match: (p) => p === "/api/v1/team",
    load: async () => shapeTeam(await getPaged("/team/", { params: { active_only: true } })),
  },
  {
    match: (p) => p === "/api/v1/events",
    load: async () =>
      shapeEvents(await getPaged("/events/", { params: { upcoming_only: false } })),
  },
  {
    match: (p) => p === "/api/v1/announcements",
    load: async () => shapeAnnouncements(await getPaged("/announcements/")),
  },
  {
    match: (p) => p === "/api/v1/faculty-advisers",
    load: async () => {
      const [rows, branchIndex, deptIndex] = await Promise.all([
        getPaged("/faculty/"),
        loadBranchIndex().catch(() => null),
        loadDepartmentIndex().catch(() => null),
      ]);
      const shaped = shapeAdvisers(rows, { branchIndex, deptIndex });
      if (!shaped.length) throw new ApiError("No faculty advisers returned");
      return shaped;
    },
  },
  {
    match: (p) => p === "/api/v1/important-contacts",
    load: async () => {
      const [rows, branchIndex, deptIndex] = await Promise.all([
        getPaged("/faculty/"),
        loadBranchIndex().catch(() => null),
        loadDepartmentIndex().catch(() => null),
      ]);
      const shaped = shapeContacts(rows, { branchIndex, deptIndex });
      if (!shaped.length) throw new ApiError("No contacts returned");
      return shaped;
    },
  },
  {
    match: (p) => p.startsWith("/api/v1/events/banner"),
    load: async (params) => {
      const key = params.get("key");
      if (!key) throw new ApiError("events/banner needs a key");
      const url = extractUrl(await getCached(`/events/banner${qs({ key })}`));
      if (!url) throw new ApiError("No banner URL returned");
      return { url, key };
    },
  },
  {
    match: (p) => p.startsWith("/api/v1/resources/presigned"),
    load: async (params) => {
      const key = params.get("key");
      if (!key) throw new ApiError("resources/presigned needs a key");
      const url = extractUrl(await getCached(`/resources/presigned${qs({ key })}`));
      if (!url) throw new ApiError("No presigned URL returned");
      return { url, key };
    },
  },
  {
    match: (p) => p === "/api/v1/resources",
    load: async (params) => {
      const all = await loadResources();
      const category = params.get("category");
      return category ? all.filter((r) => r.bucket === category) : all;
    },
  },
  {
    match: (p) => p.startsWith("/api/v1/search"),
    load: async (params) => {
      const q = params.get("q");
      if (!q) return [];
      return (await getCached(`/search/${qs({ q, limit: params.get("limit") || 10 })}`)) || [];
    },
  },
];

/**
 * Fetch one of the virtual endpoints above.
 * Always resolves — never rejects — so a page can render its fallback.
 */
export async function apiFetch(path, fallbackData) {
  const [pathname, query = ""] = String(path || "").split("?");
  const params = new URLSearchParams(query);

  const route = VIRTUAL_ROUTES.find((r) => r.match(pathname));
  if (!route) {
    console.warn(`[apiBridge] no route for "${path}" — using fallback`);
    return { data: fallbackData, source: "fallback" };
  }

  return withFallback(() => route.load(params), fallbackData);
}

/* ===========================================================================
   14. api — the typed calls
   =========================================================================== */

export const api = {
  /**
   * Department picker on the catalogue page — one tile per backend row, under
   * the department's own name. Render the list as-is; filtering it against a
   * hardcoded whitelist is what used to drop real departments.
   */
  async departments(fallbackData) {
    return withFallback(async () => {
      const { list } = await loadDepartmentIndex();
      return list;
    }, fallbackData);
  },

  /** Every course, joined to its department slug. */
  async coursesLite(fallbackData) {
    return withFallback(async () => {
      const [deptIndex, rows] = await Promise.all([
        loadDepartmentIndex().catch(() => null),
        loadCourses(),
      ]);
      if (!rows.length) throw new ApiError("No courses returned");
      return rows.map((row) => shapeCourseSummary(row, deptIndex));
    }, fallbackData);
  },

  /**
   * One course with its prerequisites and approved reviews. The three reads
   * run in parallel and the two optional ones degrade to empty lists, so a
   * missing review table never costs you the course page.
   */
  async courseDetail(courseId, fallbackData) {
    return withFallback(async () => {
      const [course, prerequisiteLinks, reviews, deptIndex, courseIndex] =
        await Promise.all([
          getCached(`/courses/${courseId}`),
          getCached(`/courses/${courseId}/prerequisites`).catch(() => []),
          request(`/reviews/course/${courseId}`).catch(() => []),
          loadDepartmentIndex().catch(() => null),
          loadCourseIndex().catch(() => new Map()),
        ]);

      if (!course) throw new ApiError(`Course ${courseId} not found`);

      /* Objects, not strings: CourseDetailPage links each prerequisite
         through to its own page, which needs the course id. */
      const prerequisites = (prerequisiteLinks || []).map((link) => {
        const prerequisite = courseIndex.get(link.prerequisite_id);
        return {
          id: prerequisite?.id ?? link.prerequisite_id ?? null,
          code: clean(prerequisite?.code) || "",
          title: clean(prerequisite?.name) || "",
        };
      });

      const extra = course.extra_data || {};

      /* Who the course is meant for, and the curriculum PDF. Both live in
         extra_data today, so several spellings are read and a top-level
         column wins if one is ever added. */
      const programs = shapeList(
        pick(course, "programs", "program") ??
          pick(extra, "programs", "program", "intended_programs", "degrees", "degree")
      );
      const branches = shapeList(
        pick(course, "branches", "branch") ??
          pick(extra, "branches", "branch", "intended_branches", "eligible_branches")
      ).map((value) => branchMeta(value));

      const curriculumUrl = documentUrl(
        pick(course, "curriculum_url", "curriculum_key"),
        pick(extra, "curriculum_url", "curriculum", "curriculum_key", "curriculum_file_key"),
        pick(course, "syllabus_url")
      );

      const deptId = departmentForCourse(course, deptIndex);
      const deptEntry = deptId ? deptIndex?.byCode.get(deptId.toUpperCase()) : null;

      return {
        id: course.id,
        code: clean(course.code) || "",
        title: clean(course.name) || "Untitled course",
        dept:
          deptEntry?.name ??
          deptIndex?.byApiId.get(course.department_id)?.name ??
          null,
        deptId: deptId ?? null,
        deptCode: deptEntry?.code ?? null,
        credits: toNumber(course.credits),
        lecture_hours: course.lecture_hours ?? null,
        tutorial_hours: course.tutorial_hours ?? null,
        practical_hours: course.practical_hours ?? null,
        description:
          pick(extra, "about", "description", "summary") ||
          "No description available yet.",
        syllabus_url: pick(course, "syllabus_url"),
        curriculum_url: curriculumUrl,
        curriculum_title:
          pick(extra, "curriculum_title", "curriculum_label") || null,
        programs,
        branches,
        prerequisites,
        reviews: (Array.isArray(reviews) ? reviews : [])
          .filter((r) => !r.status || r.status === "approved")
          .map((r) => ({
            author: "Anonymous", // the schema no longer stores a submitter
            semester: clean(r.semester_taken) || "",
            rating: toNumber(r.rating),
            text: clean(r.review_text) || "",
          })),
      };
    }, fallbackData);
  },

  /**
   * Submit a review. Deliberately throws on failure so the form can show its
   * error state rather than silently pretending it worked.
   *
   * NOTE: the backend verifies an hCaptcha token before creating the review.
   * Until an hCaptcha widget is mounted on the form, pass the token through
   * as payload.h_captcha_token or set VITE_HCAPTCHA_TOKEN; the built-in value
   * is hCaptcha's public test token and only works against test keys.
   */
  async submitReview(payload) {
    const token =
      payload?.h_captcha_token ||
      payload?.captchaToken ||
      ENV.VITE_HCAPTCHA_TOKEN ||
      "10000000-aaaa-bbbb-cccc-000000000000";

    const semester = String(payload?.semester || "").slice(0, 20);

    const created = await request("/reviews/", {
      method: "POST",
      body: {
        course_id: payload.course_id,
        rating: toNumber(payload.rating),
        review_text: payload.text,
        ...(semester ? { semester_taken: semester } : null),
        h_captcha_token: token,
      },
    });

    /* A new review lands as "pending" and needs moderation, so the list the
       page already fetched is still accurate — but drop the cache anyway so a
       later visit picks up the approved copy. */
    clearApiCache(`/reviews/course/${payload.course_id}`);
    return created;
  },

  /**
   * Curriculum for one branch.
   *
   * @param {string} branchCode  "CSE", "GE", … (the id used by the page)
   * @param {*}      fallbackData
   * @param {object} opts        { batchYear, specialisation }
   * @returns {{data: {name, semesters, credits, batches, specialisations}|null, source: string}}
   */
  async curriculum(branchCode, fallbackData, { batchYear, specialisation } = {}) {
    return withFallback(async () => {
      const [curricula, branchIndex] = await Promise.all([
        getPaged("/curriculum/"),
        loadBranchIndex().catch(() => null),
      ]);
      if (!curricula.length) throw new ApiError("No curricula returned");

      /* 1. Narrow to this branch — by branch_id where the branch table lines
            up, otherwise by the curriculum name ("B.Tech CSE 2026"). */
      const code = resolveBranchCode(branchCode);
      const branch = branchIndex?.byCode.get(code) || null;

      let forBranch = branch
        ? curricula.filter((c) => c.branch_id === branch.apiId)
        : [];

      if (!forBranch.length) {
        const needle = slugKey(code);
        const branchName = slugKey(BRANCH_META[code]?.name);
        forBranch = curricula.filter((c) => {
          const haystack = slugKey(`${c.name} ${c.branch?.code || ""} ${c.branch?.name || ""}`);
          return (
            (needle && haystack.includes(needle)) ||
            (branchName && haystack.includes(branchName))
          );
        });
      }
      if (!forBranch.length) throw new ApiError(`No curriculum for ${branchCode}`);

      /* 2. Apply the specialisation filter (General Engineering). */
      const specialisations = [
        ...new Set(forBranch.map((c) => clean(c.specialization)).filter(Boolean)),
      ];
      let candidates = forBranch;
      if (specialisation) {
        const matching = forBranch.filter((c) =>
          specialisationMatches(c.specialization, specialisation)
        );
        if (matching.length) candidates = matching;
      }

      /* 3. Pick the requested batch, else the most recent one. */
      const newestFirst = [...candidates].sort(
        (a, b) => toNumber(b.batch_year) - toNumber(a.batch_year)
      );
      const selected =
        (batchYear
          ? candidates.find((c) => String(c.batch_year) === String(batchYear))
          : null) || newestFirst[0];
      if (!selected) throw new ApiError("No matching curriculum");

      /* 4. Course list, joined to the course table for codes and titles. */
      const [links, courseIndex] = await Promise.all([
        getCached(`/curriculum/${selected.id}/courses`),
        loadCourseIndex().catch(() => new Map()),
      ]);

      const bySemester = new Map();
      for (const link of Array.isArray(links) ? links : []) {
        const spec = courseSpecialisation(link, selected);
        if (specialisation && spec && !specialisationMatches(spec, specialisation)) continue;

        const course = courseIndex.get(link.course_id);
        const semester = toNumber(link.semester);
        if (!bySemester.has(semester)) bySemester.set(semester, []);
        bySemester.get(semester).push({
          id: course?.id || null,
          code: clean(course?.code) || "—",
          title: clean(course?.name) || "Unknown course",
          credits: toNumber(course?.credits),
          category: clean(link.category),
          isOptional: Boolean(link.is_optional),
          basketId: link.basket_id ?? null,
          specialisation: spec,
        });
      }

      const semesters = [...bySemester.keys()]
        .sort((a, b) => a - b)
        .map((num) => ({
          num,
          courses: bySemester.get(num).sort(
            (a, b) =>
              String(a.category || "").localeCompare(String(b.category || "")) ||
              a.code.localeCompare(b.code)
          ),
        }));

      /* 5. Every batch year on offer for this branch, newest first. */
      const batches = [
        ...new Set(
          candidates.map((c) => (c.batch_year == null ? "" : String(c.batch_year))).filter(Boolean)
        ),
      ].sort((a, b) => Number(b) - Number(a));

      return {
        dept: branchCode,
        branch: code,
        name: clean(selected.name) || BRANCH_META[code]?.name || branchCode,
        specialisation: clean(selected.specialization),
        specialisations,
        semesters,
        credits: creditBreakdown(selected),
        batches,
      };
    }, fallbackData);
  },

  /** Elective baskets for a branch/batch, or the first curriculum on file. */
  async electiveBaskets(fallbackData, { branchCode, batchYear } = {}) {
    return withFallback(async () => {
      const curricula = await getPaged("/curriculum/");
      if (!curricula.length) throw new ApiError("No curricula returned");

      const code = branchCode ? resolveBranchCode(branchCode) : null;
      const branchIndex = code ? await loadBranchIndex().catch(() => null) : null;
      const branch = code ? branchIndex?.byCode.get(code) : null;

      const selected =
        curricula.find(
          (c) =>
            (!branch || c.branch_id === branch.apiId) &&
            (!batchYear || String(c.batch_year) === String(batchYear))
        ) || curricula[0];

      const baskets = await getCached(`/curriculum/${selected.id}/elective-baskets`);
      return (Array.isArray(baskets) ? baskets : []).map((b) => ({
        id: b.id,
        name: clean(b.name) || "Elective basket",
        description: [
          b.min_credits != null && b.max_credits != null
            ? `${b.min_credits}–${b.max_credits} credits`
            : null,
          b.semester != null ? `Semester ${b.semester}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        minCredits: toNumber(b.min_credits),
        maxCredits: toNumber(b.max_credits),
        semester: b.semester ?? null,
        courses: [],
      }));
    }, fallbackData);
  },

  /** Global search across courses, departments, branches, faculty, notices. */
  async search(query, fallbackData = []) {
    return withFallback(async () => {
      const q = String(query || "").trim();
      if (!q) return [];
      const results = await getCached(`/search/${qs({ q, limit: 10 })}`);
      return Array.isArray(results) ? results : [];
    }, fallbackData);
  },

  submitFeedback,
};

/* ===========================================================================
   15. resourcesApi
   =========================================================================== */

export const resourcesApi = {
  /**
   * Items for one Resources tab ("documents" | "links" | "forms" | "papers").
   * The whole collection is fetched once and bucketed, so switching tabs is
   * instant and a mis-typed category in the admin panel doesn't empty a tab.
   */
  async category(tabId, fallbackItems) {
    const result = await withFallback(async () => {
      const all = await loadResources();
      return all.filter((item) => item.bucket === tabId);
    }, fallbackItems);

    /* Live but empty is still nothing to render — hand back the sample list
       and say so, so the page shows its "sample data" banner honestly. */
    if (result.source === "live" && result.data.length === 0) {
      return { data: fallbackItems, source: "fallback" };
    }
    return result;
  },

  /** Trade a storage key for a time-limited download URL. */
  async presignedUrl(fileKey) {
    return withFallback(async () => {
      if (!fileKey) throw new ApiError("presignedUrl needs a file key");
      const url = extractUrl(await getCached(`/resources/presigned${qs({ key: fileKey })}`));
      if (!url) throw new ApiError("No presigned URL returned");
      return { url, key: fileKey };
    }, { url: null });
  },

  /** Same trade for an event banner. */
  async bannerUrl(bannerKey) {
    return withFallback(async () => {
      if (!bannerKey) throw new ApiError("bannerUrl needs a key");
      if (isHttp(bannerKey)) return { url: bannerKey, key: bannerKey };
      const url = extractUrl(await getCached(`/events/banner${qs({ key: bannerKey })}`));
      if (!url) throw new ApiError("No banner URL returned");
      return { url, key: bannerKey };
    }, { url: null });
  },
};

/* ===========================================================================
   16. Feedback

   The backend has no feedback table, so this posts to Formspree (or whatever
   endpoint you configure). Without VITE_FORMSPREE_ID / VITE_FEEDBACK_ENDPOINT
   it throws immediately rather than showing the user a false success screen.
   =========================================================================== */

export async function submitFeedback(payload) {
  if (!FEEDBACK_ENDPOINT) {
    throw new ApiError(
      "Feedback is not configured — set VITE_FORMSPREE_ID or VITE_FEEDBACK_ENDPOINT"
    );
  }

  const res = await fetch(FEEDBACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: payload?.name || "Anonymous",
      email: payload?.email || "",
      category: payload?.category || "General",
      message: payload?.message || "",
      submittedAt: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    throw new ApiError(`Feedback submission failed: ${res.status}`, {
      status: res.status,
      path: FEEDBACK_ENDPOINT,
    });
  }
  return true;
}

export default api;