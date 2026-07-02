export const API_BASE = "/api-proxy";
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
      return events;
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
  BIO:  { name: "Bio Engineering",                 color: "#6fa3d0" },
  CSE:  { name: "Computer Science and Engineering", color: "#4f7cc4" },
  EE:   { name: "Electrical Engineering",           color: "#37548f" },
  CE:   { name: "Civil Engineering",                color: "#d98c80" },
  ME:   { name: "Mechanical Engineering",           color: "#c25b52" },
  MNC:  { name: "Mathematics and Computing",        color: "#9c4a52" },
  VLSI: { name: "Microelectronics and VLSI",        color: "#84b88c" },
  EP:   { name: "Engineering Physics",              color: "#4e9b72" },
  DSAI: { name: "Data Science and Artificial Intelligence", color: "#2f6e54" },
  MSE:  { name: "Materials Science and Engineering", color: "#e0aa6b" },
  GE:   { name: "General Engineering",              color: "#d18a3e" },
  BS:   { name: "BS in Chemical Sciences",          color: "#a8682c" },
};

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

  async curriculum(deptId, fallbackData) {
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
      const bySemester = {};
      for (const cc of ccs || []) {
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
            };
          }),
        }));

      const credits = match ? {
        total: match.total_credits || 0,
        rows: [
          { label: "Institute Core",       credits: match.ic_compulsory_credits || 0 },
          { label: "IC Basket",            credits: match.icb_credits || 0 },
          { label: "HSS / IKS",            credits: match.hss_iks_credits || 0 },
          { label: "Discipline Core",      credits: match.dc_credits || 0 },
          { label: "Discipline Elective",  credits: match.de_credits || 0 },
          { label: "Free Elective",        credits: match.fe_credits || 0 },
          { label: "MTP",                  credits: match.mtp_credits || 0 },
          { label: "ISTP",                 credits: match.istp_credits || 0 },
          { label: "Research",             credits: match.research_credits || 0 },
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