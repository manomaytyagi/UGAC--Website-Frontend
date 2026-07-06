export const API_BASE = import.meta.env.VITE_API_BASE || "/api-proxy";
export const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || "";
const REQUEST_TIMEOUT_MS = 12000;

async function request(path, { method = "GET", body, signal } = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = "";
      try {
        const errBody = await res.json();
        detail = errBody?.detail ? JSON.stringify(errBody.detail) : "";
      } catch {}
      throw new Error(
        `Request failed: ${res.status} ${res.statusText} ${detail}`,
      );
    }

    if (res.status === 204) return null;
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function withFallback(fn, fallbackData) {
  try {
    const data = await fn();
    return { data, source: "live" };
  } catch (err) {
    console.warn(
      "[apiBridge] live request failed, using fallback:",
      err.message,
    );
    return { data: fallbackData, source: "fallback" };
  }
}

function formatTime(isoString) {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    // Midnight UTC typically means no time was set — omit it
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return null;
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric", minute: "2-digit", hour12: true,
    });
  } catch {
    return null;
  }
}

function reshapeEvent(e) {
  return {
    id:          e.id,
    title:       e.title        || "",
    desc:        e.description  || "",
    date:        e.event_date   ? e.event_date.slice(0, 10) : null,
    time:        formatTime(e.event_date),
    venue:       e.location     || null,
    banner_key:  e.banner_key   || "",
    form_url:    e.registration_url || null,
    tag:         null,
    audience:    null,
    report_key:  null,
    youtube_url: null,
    canva_url:   null,
    documents:   [],
  };
}

function reshapeEvents(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const now  = new Date();
  const upcoming = [];
  const past     = [];

  list.forEach((e) => {
    const shaped = reshapeEvent(e);
    if (!shaped.date) return;
    if (new Date(shaped.date) >= now) {
      upcoming.push(shaped);
    } else {
      past.push(shaped);
    }
  });

  upcoming.sort((a, b) => new Date(a.date) - new Date(b.date)); // soonest first
  past.sort((a, b)     => new Date(b.date) - new Date(a.date)); // most recent first

  return { upcoming, past };
}

export async function apiFetch(path, fallbackData) {
  if (path === "/api/v1/team") {
    return withFallback(async () => {
      const members = await request("/team/");
      return reshapeTeam(members);
    }, fallbackData);
  }

  if (path === "/api/v1/events") {
    return withFallback(async () => {
      const events = await request("/events/");
      return reshapeEvents(events);
    }, fallbackData);
  }

  if (path === "/api/v1/faculty-advisers") {
    return withFallback(async () => {
      const faculty = await request("/faculty/");
      const shaped = reshapeAdvisers(faculty);
      if (!shaped.length) throw new Error("No faculty advisers returned");
      return shaped;
    }, fallbackData);
  }

  if (path === "/api/v1/important-contacts") {
    return withFallback(async () => {
      const faculty = await request("/faculty/");
      const shaped = reshapeContacts(faculty);
      if (!shaped.length) throw new Error("No contacts returned");
      return shaped;
    }, fallbackData);
  }

  if (path.startsWith("/api/v1/events/banner")) {
    return { data: fallbackData, source: "fallback" };
  }

  if (path.startsWith("/api/v1/team/photo")) {
    return { data: fallbackData, source: "fallback" };
  }

  console.warn(`[apiBridge] apiFetch called with unmapped path: ${path}`);
  return { data: fallbackData, source: "fallback" };
}

const BRANCH_META = {
  BIO:  { name: "Bio Engineering",                                color: "#6fa3d0" },
  CSE:  { name: "Computer Science and Engineering",               color: "#4f7cc4" },
  EE:   { name: "Electrical Engineering",                         color: "#37548f" },
  CE:   { name: "Civil Engineering",                              color: "#d98c80" },
  ME:   { name: "Mechanical Engineering",                         color: "#c25b52" },
  MNC:  { name: "Mathematics and Computing",                      color: "#9c4a52" },
  VLSI: { name: "Microelectronics and VLSI",                      color: "#84b88c" },
  EP:   { name: "Engineering Physics",                            color: "#4e9b72" },
  DSAI: { name: "Data Science and Artificial Intelligence",       color: "#2f6e54" },
  MSE:  { name: "Materials Science and Engineering",              color: "#e0aa6b" },
  GE:   { name: "General Engineering",                            color: "#d18a3e" },
  BS:   { name: "BS in Chemical Sciences",                        color: "#a8682c" },
  DSE:  { name: "Data Science and Engineering",                   color: "#2a3f6e" },  
  QSE:  { name: "Quantum Science and Engineering",                color: "#b03a42" },  
  AE:   { name: "Agricultural Engineering with Data Analytics",   color: "#1d4d38" },  
  CEDA: { name: "Chemical Engineering with Data Analytics",       color: "#7a4a1e" },  
};

/* ---------------------------------------------------------------------------
   Faculty  ->  Community pages (Faculty Advisers + Important Contacts)

   Both pages read from one `/faculty/` collection. Each row looks roughly like
   the admin "Faculty" form:

     { id, name, email, designation, department, photo_url, office_location,
       linkedin_url, is_active, branch, batch, type }

   `type` decides where a row appears:
     adviser        -> Faculty Advisers page (grouped by branch, split by batch)
     director       -> Important Contacts, group 1
     dean           -> Important Contacts, group 2
     student_body   -> Important Contacts, group 3
     school_chair   -> Important Contacts, group 4
     school_office  -> Important Contacts, group 5

   Reshapers are lenient about field names / spellings so the UI keeps working
   even if the backend labels differ slightly.
--------------------------------------------------------------------------- */

export function branchMeta(code) {
  const key = (code || "").toString().trim().toUpperCase();
  return BRANCH_META[key] || { name: key || "General", color: "#4f7cc4" };
}

const _pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

function normalizeFacultyType(raw) {
  const s = (raw || "").toString().toLowerCase().replace(/[\s._-]+/g, "");
  if (!s) return "";
  if (s.includes("adviser") || s.includes("advisor")) return "adviser";
  if (s.includes("director")) return "director";
  if (s.includes("dean")) return "dean";
  if (s.includes("student")) return "student_body";
  if (s.includes("chair")) return "school_chair";
  if (s.includes("office")) return "school_office";
  return s;
}

function normalizeFaculty(m) {
  const designation = _pick(m, "designation", "role", "position") || "";
  let type = normalizeFacultyType(_pick(m, "type", "category", "contact_type"));

  // If `type` is absent, infer from the designation as a fallback.
  if (!type && /chair/i.test(designation)) type = "school_chair";
  if (!type && /dean/i.test(designation)) type = "dean";
  if (!type && /director/i.test(designation)) type = "director";

  return {
    id: m.id ?? _pick(m, "email", "name"),
    name: _pick(m, "name") || "",
    email: _pick(m, "email"),
    phone: _pick(m, "phone", "phone_number"),
    link: _pick(m, "linkedin_url", "linkedin", "link", "profile_url"),
    photo: _pick(m, "photo_url", "photo", "image_url"),
    designation,
    department: _pick(m, "department", "department_name", "dept") || "",
    office: _pick(m, "office_location", "office"),
    branch: _pick(m, "branch", "branch_code"),
    batch: _pick(m, "batch", "batch_year", "year"),
    type,
    active: m.is_active ?? m.active ?? true,
  };
}

function batchSortKey(b) {
  if (b == null) return 9999;
  const n = parseInt(String(b).replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 9999;
}

// "1" / "1st Year" / "2023" -> a readable label for the adviser card.
export function batchLabel(b) {
  if (b == null || b === "") return "";
  const s = String(b).trim();
  if (/year/i.test(s)) return s;                    // already "2nd Year"
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 4) return `Batch ${digits}`; // admission year
  const n = parseInt(digits, 10);
  const ord = ["1st", "2nd", "3rd", "4th", "5th"];
  if (n >= 1 && n <= 5) return `${ord[n - 1]} Year`;
  return s;
}

function reshapeAdvisers(raw) {
  const advisers = (Array.isArray(raw) ? raw : [])
    .map(normalizeFaculty)
    .filter((m) => m.type === "adviser" && m.active !== false);

  const byBranch = {};
  for (const m of advisers) {
    const code = (m.branch || "GEN").toString().trim().toUpperCase();
    if (!byBranch[code]) {
      const meta = branchMeta(code);
      byBranch[code] = { id: code, code, name: meta.name, color: meta.color, advisers: [] };
    }
    byBranch[code].advisers.push({
      name: m.name || null,
      email: m.email,
      link: m.link,
      office: m.office,
      batch: m.batch,
      batchLabel: batchLabel(m.batch),
    });
  }

  return Object.values(byBranch)
    .map((b) => ({
      ...b,
      advisers: b.advisers.sort((a, z) => batchSortKey(a.batch) - batchSortKey(z.batch)),
      count: b.advisers.length,
    }))
    .sort((a, z) => a.name.localeCompare(z.name));
}

// Fixed order + colours for the Important Contacts groups.
const CONTACT_GROUPS = [
  { id: "director", type: "director",     title: "Director",                   sub: "Head of the institute",             color: "#37548f" },
  { id: "deans",    type: "dean",         title: "Deans",                      sub: "Deans & associate deans",           color: "#4e9b72" },
  { id: "student",  type: "student_body", title: "Student Body",               sub: "Council & student representatives", color: "#d18a3e" },
  { id: "chairs",   type: "school_chair", title: "Department / School Chairs", sub: "Academic heads across schools",      color: "#c25b52" },
  { id: "offices",  type: "school_office",title: "School Offices",             sub: "School administrative offices",      color: "#6fa3d0" },
];

function reshapeContacts(raw) {
  const people = (Array.isArray(raw) ? raw : [])
    .map(normalizeFaculty)
    .filter((m) => m.type && m.type !== "adviser" && m.active !== false);

  return CONTACT_GROUPS
    .map((g) => ({
      ...g,
      people: people
        .filter((m) => m.type === g.type)
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
    }))
    .filter((g) => g.people.length > 0);
}

function isSubCouncillorRole(role) {
  return (role || "").toLowerCase().includes("sub");
}

function normalizeMember(m) {
  return {
    id: m.id,
    name: m.name,
    role: m.role || "Council Member",
    phone: m.phone || null,
    photo_url: m.photo_url || null,
    email: m.email || null,
    linkedin: m.linkedin_url || null,
    code: m.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
  };
}

function reshapeTeam(members) {
  const list = Array.isArray(members) ? members : [];

  const secretaryRaw = list.find((m) => m.type === "secretary");
  const secretary = secretaryRaw
    ? { ...normalizeMember(secretaryRaw), description: secretaryRaw.bio || "Academic Secretary" }
    : null;

  const councilRaw = list.filter((m) => m.type === "council");
  const branchesMap = {};

  councilRaw
    .sort((a, b) => (a.order || 99) - (b.order || 99))
    .forEach((m) => {
      const code = m.branch_code;
      const meta = code && BRANCH_META[code];
      if (!meta) return;

      if (!branchesMap[code]) {
        branchesMap[code] = {
          id: code,
          code,
          name: meta.name,
          color: meta.color,
          councillor: null,
          subs: [],
        };
      }

      const norm = normalizeMember(m);
      if (!isSubCouncillorRole(m.role) && !branchesMap[code].councillor) {
        branchesMap[code].councillor = norm;
      } else {
        branchesMap[code].subs.push(norm);
      }
    });

  const supportRaw = list.filter((m) => m.type === "support");
  const supportTeams = supportRaw
    .sort((a, b) => (a.order || 99) - (b.order || 99))
    .map((m) => ({
      id: m.id,
      name: m.team_name || m.portfolio || m.name,
      lead: m.name,
      blurb: m.bio || "",
      featured: m.is_featured ?? (m.order || 0) === 0,
    }));

  return {
    secretary,
    branches: Object.values(branchesMap),
    supportTeams,
  };
}

const RESOURCE_TAB_TO_CATEGORY = {
  documents: "document",
  links: "link",
  forms: "form",
  papers: "paper",
};

function reshapeResource(r) {
  return {
    title: r.title,
    desc: r.academic_year
      ? `${r.category} · ${r.academic_year}`
      : r.category || "",
    tag: r.category
      ? r.category[0].toUpperCase() + r.category.slice(1)
      : "Resource",
    url: r.file_url || null,
    file_key: null,
  };
}

export const resourcesApi = {
  async category(tabId, fallbackItems) {
    const category = RESOURCE_TAB_TO_CATEGORY[tabId] || tabId;
    return withFallback(async () => {
      const items = await request(
        `/resources/?category=${encodeURIComponent(category)}`,
      );
      const reshaped = (items || []).map(reshapeResource);

      return reshaped.length > 0 ? reshaped : fallbackItems;
    }, fallbackItems);
  },

  async presignedUrl(fileKey) {
    return { data: { url: null }, source: "fallback" };
  },
};

export const api = {
  async departments(fallbackData) {
    return withFallback(async () => {
      const depts = await request("/departments/");
      return (depts || []).map((d) => ({
        id: d.id,
        name: d.name,
        code: d.code,
      }));
    }, fallbackData);
  },

  async coursesLite(fallbackData) {
    return withFallback(async () => {
      const courses = await request("/courses/lite");
      return (courses || []).map((c) => ({
        id: c.id,
        code: c.code,
        title: c.name,
        dept: c.department_id || null,
        credits: c.credits,
      }));
    }, fallbackData);
  },

  async courseDetail(courseId, fallbackData) {
    return withFallback(async () => {
      const [course, prereqs, reviews] = await Promise.all([
        request(`/courses/${courseId}`),
        request(`/courses/${courseId}/prerequisites`).catch(() => []),
        request(`/reviews/course/${courseId}`).catch(() => []),
      ]);

      let deptName = null;
      if (course.department_id) {
        try {
          const dept = await request(`/departments/${course.department_id}`);
          deptName = dept?.name || null;
        } catch {
          deptName = null;
        }
      }

      let prerequisites = [];
      if ((prereqs || []).length > 0) {
        try {
          const allCourses = await request("/courses/lite");
          const courseIndex = Object.fromEntries(
            (allCourses || []).map((c) => [c.id, c]),
          );
          prerequisites = prereqs.map((p) => {
            const c = courseIndex[p.prerequisite_id];
            return c ? `${c.code} — ${c.name}` : p.prerequisite_id;
          });
        } catch {
          prerequisites = prereqs.map((p) => p.prerequisite_id);
        }
      }

      return {
        id: course.id,
        code: course.code,
        title: course.name,
        dept: deptName,
        credits: course.credits,
        lecture_hours: course.lecture_hours ?? null,
        tutorial_hours: course.tutorial_hours ?? null,
        practical_hours: course.practical_hours ?? null,
        description:
          course.extra_data?.about || course.extra_data?.description || "No description available yet.",
        syllabus_url: course.syllabus_url || null,
        prerequisites,
        reviews: (reviews || [])
          .filter((r) => !r.status || r.status === "approved")
          .map((r) => ({
            author: r.student_name || "Anonymous",
            semester: r.semester_taken || "",
            rating: r.rating,
            text: r.review_text,
          })),
      };
    }, fallbackData);
  },

  async submitReview(payload) {
    return request("/reviews/", {
      method: "POST",
      body: {
        course_id: payload.course_id,
        student_name: payload.author === "Anonymous" ? null : payload.author,
        rating: payload.rating,
        review_text: payload.text,
      },
    });
  },

  async curriculum(deptId, fallbackData, { specialisation } = {}) {
    return withFallback(async () => {
      const [curricula, branches] = await Promise.all([
        request("/curricula/"),
        request("/branches/").catch(() => []),
      ]);

      if (!curricula || curricula.length === 0)
        throw new Error("No curriculum found");

      let match = null;
      const deptKey = String(deptId || "").toLowerCase();
      const candidateBranch = (branches || []).find(
        (b) =>
          b.code?.toLowerCase().includes(deptKey) ||
          b.name?.toLowerCase().includes(deptKey),
      );
      if (candidateBranch) {
        match = curricula.find((c) => c.branch_id === candidateBranch.id);
      }
      if (!match) match = curricula[0];

      const ccs = await request(`/curricula/${match.id}/courses`);

      const filteredCcs = (ccs || []).filter((cc) => {
        if (!specialisation) return true;
        return !cc.specialisation || cc.specialisation === specialisation;
      });

      const bySemester = {};
      for (const cc of filteredCcs) {
        bySemester[cc.semester] = bySemester[cc.semester] || [];
        bySemester[cc.semester].push(cc);
      }

      const allCourses = await request("/courses/lite");
      const courseIndex = Object.fromEntries(
        (allCourses || []).map((c) => [c.id, c]),
      );

      const semesters = Object.keys(bySemester)
        .sort((a, b) => Number(a) - Number(b))
        .map((semNum) => ({
          num: Number(semNum),
          courses: bySemester[semNum].map((cc) => {
            const c = courseIndex[cc.course_id];
            return {
              id: c?.id || null,
              code: c?.code || "—",
              title: c?.name || "Unknown course",
              credits: c?.credits || 0,
              category: cc.category || null,
              specialisation: cc.specialisation || null,
            };
          }),
        }));

      const credits = match ? {
        total: match.total_credits || 0,
        rows: [
          { label: "Institute Core",       credits: match.ic_credits || 0 },
          { label: "HSS / IKS",            credits: match.hss_iks_credits || 0 },
          { label: "Discipline Core",      credits: match.dc_credits || 0 },
          { label: "Discipline Elective",  credits: match.de_credits || 0 },
          { label: "Free Elective",        credits: match.fe_credits || 0 },
          { label: "MTP",                  credits: match.mtp_credits || 0 },
          { label: "ISTP",                 credits: match.istp_credits || 0 },
        ].filter((r) => r.credits > 0),
      } : null;

      const allBranchCurricula = (curricula || []).filter(
        (c) => match && c.branch_id === match.branch_id
      );
      const batches = allBranchCurricula
        .map((c) => String(c.batch_year))
        .filter(Boolean)
        .sort((a, b) => b - a); 

      return { dept: deptId, name: match.name, semesters, credits, batches };
    }, fallbackData);
  },

  async electiveBaskets(fallbackData) {
    return withFallback(async () => {
      const curricula = await request("/curricula/");
      const match = (curricula || [])[0];
      if (!match) throw new Error("No curriculum found");
      const baskets = await request(`/curricula/${match.id}/elective-baskets`);
      return (baskets || []).map((b) => ({
        name: b.name,
        description: `${b.min_credits}–${b.max_credits} credits · Semester ${b.semester}`,
        courses: [],
      }));
    }, fallbackData);
  },
};