import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/apiBridge.js";
import "../styles/CoursesPage.css"

const C = {
  navyDeep:  "#0d1b3e",
  navyMid:   "#1e3a6e",
  navyLight: "#2e509e",
  orange:    "#ee9116",
  white:     "#ffffff",
  offWhite:  "#edebe7",
  border:    "#dce3f0",
  textMuted: "#5a6a8a",
  textDim:   "#8a9abc",
  ink:       "#101935",
};

function tint(hex, a) {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const NAV_OFFSET = 92;

const FALLBACK_DEPARTMENTS = [
  // left column
  { id: "cse",  name: "Computer Science",        short: "CS", color: "#4f7cc4" },
  { id: "ece",  name: "Electronics & Comm.",     short: "EC", color: "#d18a3e" },
  { id: "ee",   name: "Electrical Engineering",  short: "EE", color: "#e0aa6b" },
  { id: "me",   name: "Mechanical Engineering",  short: "ME", color: "#4e9b72" },
  { id: "ce",   name: "Civil Engineering",       short: "CE", color: "#c25b52" },
  { id: "dse",  name: "Data Science & Eng.",     short: "DS", color: "#2f8f86" },
  // right column
  { id: "math", name: "Mathematics",             short: "MA", color: "#37548f" },
  { id: "phy",  name: "Physics",                 short: "PH", color: "#6f7bd0" },
  { id: "chem", name: "Chemistry",               short: "CH", color: "#9c4a52" },
  { id: "bt",   name: "Biotechnology",           short: "BT", color: "#2f6e54" },
  { id: "mse",  name: "Materials Engineering",   short: "MT", color: "#a8682c" },
  { id: "hss",  name: "Humanities & Soc. Sci.",  short: "HS", color: "#7a6cae" },
];

const DEPT_META = Object.fromEntries(FALLBACK_DEPARTMENTS.map(d => [d.id, d]));
const DEPT_PALETTE = FALLBACK_DEPARTMENTS.map(d => d.color);

function decorateDepts(list) {
  return list.map((d, i) => {
    const meta = DEPT_META[d.id] || {};
    return {
      ...d,
      short: d.short || meta.short || d.code || d.name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase(),
      color: d.color || meta.color || DEPT_PALETTE[i % DEPT_PALETTE.length],
    };
  });
}

function mk(prefix, dept, rows) {
  return rows.map(([lvl, ser, title, credits, prac]) => ({
    code: `${prefix}${lvl}${String(ser).padStart(2, "0")}${prac ? "P" : ""}`,
    title, dept, credits,
  }));
}

const RAW_COURSES = [
  ...mk("CS", "cse", [
    [1, 1, "Introduction to Programming", 4],
    [1, 2, "Programming Laboratory", 2, true],
    [2, 1, "Discrete Mathematics", 3],
    [3, 1, "Data Structures & Algorithms", 4],
    [3, 2, "Computer Networks", 3],
    [3, 3, "Networks Laboratory", 2, true],
    [4, 1, "Operating Systems", 4],
    [5, 1, "Machine Learning", 3],
    [6, 1, "Distributed Systems", 3],
  ]),
  ...mk("EC", "ece", [
    [1, 1, "Basic Electronics", 3],
    [2, 1, "Signals & Systems", 4],
    [3, 1, "Digital Signal Processing", 3],
    [3, 2, "DSP Laboratory", 2, true],
    [4, 1, "Communication Systems", 4],
    [5, 1, "VLSI Design", 3],
  ]),
  ...mk("EE", "ee", [
    [1, 1, "Electrical Circuits", 4],
    [2, 1, "Electromagnetic Fields", 3],
    [3, 1, "Power Systems", 4],
    [3, 2, "Machines Laboratory", 2, true],
    [4, 1, "Control Systems", 3],
    [5, 1, "Power Electronics", 3],
  ]),
  ...mk("ME", "me", [
    [1, 1, "Engineering Mechanics", 4],
    [2, 1, "Strength of Materials", 4],
    [3, 1, "Thermodynamics", 3],
    [3, 2, "Manufacturing Laboratory", 2, true],
    [4, 1, "Heat Transfer", 3],
    [5, 1, "Robotics", 3],
  ]),
  ...mk("CE", "ce", [
    [1, 1, "Surveying", 3],
    [2, 1, "Fluid Mechanics", 4],
    [3, 1, "Structural Analysis", 4],
    [3, 2, "Concrete Laboratory", 2, true],
    [4, 1, "Geotechnical Engineering", 3],
    [6, 1, "Earthquake Engineering", 3],
  ]),
  ...mk("DS", "dse", [
    [1, 1, "Foundations of Data Science", 3],
    [2, 1, "Statistical Learning", 4],
    [3, 1, "Database Systems", 3],
    [3, 2, "Data Wrangling Laboratory", 2, true],
    [4, 1, "Deep Learning", 4],
    [5, 1, "Big Data Systems", 3],
  ]),
  ...mk("MA", "math", [
    [1, 1, "Calculus", 4],
    [1, 2, "Linear Algebra", 4],
    [2, 1, "Probability & Statistics", 4],
    [3, 1, "Numerical Methods", 3],
    [4, 1, "Real Analysis", 3],
    [5, 1, "Optimization", 3],
  ]),
  ...mk("PH", "phy", [
    [1, 1, "Engineering Physics", 4],
    [1, 2, "Physics Laboratory", 2, true],
    [2, 1, "Quantum Mechanics", 4],
    [3, 1, "Electromagnetic Theory", 3],
    [4, 1, "Statistical Mechanics", 3],
    [5, 1, "Solid State Physics", 3],
  ]),
  ...mk("CH", "chem", [
    [1, 1, "Engineering Chemistry", 3],
    [1, 2, "Chemistry Laboratory", 2, true],
    [2, 1, "Physical Chemistry", 4],
    [3, 1, "Organic Chemistry", 3],
    [4, 1, "Spectroscopy", 3],
  ]),
  ...mk("BT", "bt", [
    [1, 1, "Cell Biology", 3],
    [2, 1, "Biochemistry", 4],
    [3, 1, "Molecular Biology", 3],
    [3, 2, "Genetics Laboratory", 2, true],
    [4, 1, "Bioinformatics", 3],
  ]),
  ...mk("MT", "mse", [
    [1, 1, "Introduction to Materials", 3],
    [2, 1, "Thermodynamics of Materials", 4],
    [3, 1, "Mechanical Behaviour", 3],
    [3, 2, "Characterization Laboratory", 2, true],
    [4, 1, "Nanomaterials", 3],
  ]),
  ...mk("HS", "hss", [
    [1, 1, "Communication Skills", 2],
    [2, 1, "Principles of Economics", 3],
    [3, 1, "Psychology", 3],
    [4, 1, "Ethics & Society", 2],
    [5, 1, "Philosophy of Science", 3],
  ]),
];
const FALLBACK_COURSES = RAW_COURSES.map((c, i) => ({ id: i + 1, ...c }));

function parseCode(code) {
  const s = (code || "").trim();
  const m = /^([A-Za-z]{2,4})(\d)(\d+)(P)?$/i.exec(s);
  if (!m) return { level: null, practical: /p$/i.test(s) };
  return { level: Number(m[2]), practical: !!m[4] };
}
function withMeta(c) {
  const p = parseCode(c.code);
  return { ...c, level: c.level ?? p.level, practical: c.practical ?? p.practical };
}

function deptPrefix(dep) {
  const base = (dep.short || dep.name || "").replace(/[^A-Za-z]/g, "");
  return (base.slice(0, 2) || "XX").toUpperCase();
}
function codePrefix(code) {
  const m = /^([A-Za-z]{2,4})/.exec((code || "").trim());
  return m ? m[1] : "";
}

function resolveCourseDept(course, depts) {
  const raw = (course.dept ?? "").toString().trim().toLowerCase();
  if (raw) {
    for (const dep of depts) {
      if (raw === String(dep.id).toLowerCase()
        || raw === String(dep.name).toLowerCase()
        || raw === String(dep.short || "").toLowerCase()) return dep.id;
    }
  }
  const pre = codePrefix(course.code).toLowerCase();
  if (pre) {
    for (const dep of depts) {
      if (String(dep.short || "").toLowerCase() === pre || deptPrefix(dep).toLowerCase() === pre) return dep.id;
    }
  }
  return course.dept;
}

function buildPlaceholderCourses(depts) {
  const TEMPLATE = [
    [1, "Foundations", 4, false],
    [1, "Laboratory", 2, true],
    [2, "Core Principles", 3, false],
    [3, "Methods & Analysis", 4, false],
    [3, "Applied Laboratory", 2, true],
    [4, "Advanced Topics", 3, false],
    [5, "Special Elective", 3, false],
    [6, "Capstone Seminar", 3, false],
  ];
  const out = [];
  depts.forEach(dep => {
    const prefix = deptPrefix(dep);
    TEMPLATE.forEach(([lvl, label, credits, prac], i) => {
      out.push({
        id: `ph-${dep.id}-${i + 1}`,
        code: `${prefix}${lvl}${String(i + 1).padStart(2, "0")}${prac ? "P" : ""}`,
        title: `${dep.name} ${label}`,
        dept: dep.id,
        credits,
      });
    });
  });
  return out;
}

const FLAME_PATH = "M202.282 182.635C201.935 183.082 201.802 183.609 201.8 183.844C201.8 185.258 201.802 186.571 201.817 187.326C201.834 188.186 201.867 188.318 201.884 188.911C201.934 191.686 202.056 192.281 202.084 193.022C202.134 194.386 202.079 194.958 202.334 195.702C202.534 196.286 202.728 196.797 202.884 197.352C203.034 197.886 203.167 198.418 203.3 198.951L203.301 198.952C203.434 199.486 203.606 200.01 203.701 200.552C203.8 201.12 204.025 201.684 204.184 202.252C204.334 202.786 204.592 203.295 204.784 203.852C204.968 204.386 205.248 204.912 205.484 205.452C205.702 205.952 206.045 206.372 206.285 206.868C206.534 207.386 206.84 207.83 207.118 208.386C207.502 209.154 207.846 209.856 208.218 210.335C208.568 210.786 209.039 211.382 209.519 211.952C209.968 212.486 210.297 212.954 210.702 213.452C211.136 213.986 211.526 214.509 211.918 214.935C212.302 215.352 212.753 215.834 213.219 216.251C213.702 216.686 214.102 217.149 214.636 217.468C215.336 217.886 215.853 218.243 216.402 218.534C216.936 218.818 217.38 219.19 217.902 219.451C218.436 219.718 218.922 219.995 219.419 220.234C219.936 220.484 220.436 220.746 221.002 220.817C221.536 220.884 222.088 220.959 222.602 221.167C223.136 221.384 224.269 221.523 225.816 221.533C228.182 221.55 229.834 221.638 230.408 221.633C232.436 221.616 233.321 221.646 234.103 221.449C234.77 221.282 235.362 221.05 235.986 220.949C236.604 220.85 237.286 220.836 237.802 220.632C238.438 220.382 239.297 220.037 240.17 219.665C240.836 219.382 241.312 219.029 241.902 218.899C242.436 218.782 242.825 218.296 243.419 217.848C244.036 217.382 244.56 217.039 245.186 216.565C245.736 216.148 246.349 215.496 246.919 214.965C247.402 214.514 248.028 214.102 248.518 213.281C248.836 212.748 249.201 212.172 250.22 211.347C250.836 210.848 251.319 210.444 251.752 209.764C252.102 209.214 252.493 208.744 252.818 208.248C253.168 207.714 253.446 207.144 253.818 206.665C254.168 206.214 254.491 205.711 254.785 205.064C255.034 204.514 255.262 203.995 255.501 203.448C255.734 202.914 255.836 202.373 256.001 201.848C256.168 201.314 256.491 200.811 256.785 200.164C257.034 199.614 257.244 199.096 257.318 198.447C257.5 196.828 257.6 194.364 257.383 193.096C257.266 192.414 257.238 191.868 257.083 191.097C256.966 190.514 256.911 189.244 256.817 188.28C256.732 187.414 256.57 186.55 256.517 185.814C256.466 185.114 256.341 184.513 256.2 183.948L255.8 182.348C255.666 181.814 255.547 181.263 255.366 180.664C255.2 180.114 255.122 179.559 254.883 179.048C254.632 178.514 254.346 177.697 254.083 177.048C253.866 176.514 253.679 175.976 253.399 175.448C253.098 174.88 252.845 174.245 252.566 173.748L252.52 173.666C252.236 173.161 251.955 172.659 251.616 171.981C251.332 171.414 251.058 170.887 250.716 170.348C250.403 169.855 250.167 169.383 249.91 168.87L249.899 168.848C249.632 168.314 249.355 167.777 248.882 167.465C248.398 167.148 247.7 166.847 247.132 166.181C246.732 165.714 246.416 165.169 245.999 164.648C245.598 164.148 245.148 163.57 244.916 162.948C244.866 162.814 244.833 162.682 244.817 162.905C244.8 163.128 244.818 163.69 244.783 164.037C244.7 164.854 244.641 165.587 244.5 166.152C244.366 166.686 244.243 167.22 244.117 167.752C243.998 168.252 243.799 168.718 243.516 169.252C243.232 169.786 242.962 170.573 242.298 170.751C241.186 171.05 239.491 171.132 238.998 170.916C238.464 170.682 237.976 170.29 237.482 169.965C236.998 169.648 236.565 169.158 236.182 168.665C235.832 168.214 235.473 167.696 235.199 167.148C234.932 166.614 234.68 166.092 234.6 165.548C234.5 164.878 234.552 164.068 234.383 163.13C234.266 162.48 234.223 161.61 234.1 160.948C234 160.414 233.801 159.906 233.733 159.145C233.632 158.014 233.567 157.323 233.316 156.748C233.098 156.248 232.807 155.759 232.499 155.248C232.198 154.748 231.866 154.282 231.599 153.748C231.332 153.214 231.07 152.68 230.699 152.064C230.366 151.514 230.111 150.933 229.766 150.465C229.432 150.014 229.142 149.501 228.682 149.131C228.164 148.716 227.675 148.338 227.064 148.283C226.698 148.25 226.333 148.282 226.132 148.485C226.032 148.586 225.945 148.712 225.916 148.852C225.8 149.42 225.797 150.04 225.583 150.569C225.332 151.186 225.104 151.707 224.916 152.252C224.732 152.786 224.495 153.329 224.283 153.852C224.066 154.386 223.907 154.94 223.599 155.452C223.298 155.952 222.913 156.431 222.165 157.202C221.664 157.718 221.233 158.089 220.698 158.535C220.198 158.952 219.714 159.401 219.299 159.851C218.898 160.286 218.469 160.723 218.082 161.168C217.632 161.686 217.335 162.183 216.882 162.652C216.398 163.152 215.978 163.674 215.482 164.034C214.998 164.386 214.487 164.798 214.015 165.251C213.598 165.652 213.1 165.95 212.699 166.351C212.298 166.752 211.754 166.994 211.315 167.451C210.898 167.886 210.44 168.374 210.116 168.868C209.798 169.352 209.429 169.791 209.116 170.268C208.798 170.752 208.498 171.195 208.199 171.685C207.832 172.286 207.552 172.812 207.316 173.352C207.098 173.852 206.766 174.318 206.499 174.852C206.232 175.386 205.958 175.913 205.616 176.452C205.298 176.952 204.966 177.418 204.699 177.952C204.432 178.486 204.268 179.068 203.966 179.552C203.632 180.086 203.352 180.612 203.116 181.152C202.898 181.652 202.644 182.169 202.282 182.635Z";

function star(px, py, s) {
  const o = s * 0.34;
  return `M${px} ${py - s} L${px + o} ${py - o} L${px + s} ${py} L${px + o} ${py + o} L${px} ${py + s} L${px - o} ${py + o} L${px - s} ${py} L${px - o} ${py - o} Z`;
}

function BookFlameEmblem({ size = 300, reduce }) {
  return (
    <div style={{ width: "100%", maxWidth: size, margin: "0 auto" }}>
      <svg viewBox="103 107 251 251" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} role="img" aria-label="An open book lit by a flame">
        <defs>
          <radialGradient id="ucMedal" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#1a2c54" />
            <stop offset="100%" stopColor="#081734" />
          </radialGradient>
          <radialGradient id="ucGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ee9116" stopOpacity="0.5" />
            <stop offset="60%"  stopColor="#ee9116" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#ee9116" stopOpacity="0" />
          </radialGradient>
        </defs>

        {}
        <circle cx="228.5" cy="232.5" r="120" fill="url(#ucMedal)" />
        <circle cx="228.5" cy="232.5" r="120" fill="none" stroke="#ee9116" strokeWidth="2" opacity="0.45" />
        <circle cx="228.5" cy="232.5" r="111" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.07" />
        {}
        <circle cx="228" cy="188" r="74" fill="url(#ucGlow)" />

        {}
        <path d="M240 239L314 194L319 200V270C297.333 283.167 252.6 310 247 312C241.4 314 240 312.833 240 312V239Z" fill="#c7ccd4" />
        <path d="M222.5 243L148.5 198L143.5 204V274C165.167 287.167 209.9 314 215.5 316C221.1 318 222.5 316.833 222.5 316V243Z" fill="#aab0bd" />
        <path d="M231 240V314" fill="none" stroke="#7e8596" strokeWidth="2" />

        {}
        <path
          d={FLAME_PATH}
          fill="#ee9116"
          style={{ transformBox: "fill-box", transformOrigin: "center bottom", animation: reduce ? "none" : "flicker 2.6s ease-in-out infinite" }}
        />

        {}
        <path d={star(199, 166, 7)} fill="#ffffff" opacity="0.92" />
        <path d={star(264, 180, 5)} fill="#ffd9a8" />
      </svg>
    </div>
  );
}

function DeptButton({ dept, side, count, onPick }) {
  const [hot, setHot] = useState(false);
  const left = side === "left";
  return (
    <button
      type="button"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      onClick={() => onPick(dept)}
      aria-label={`Open ${dept.name} courses`}
      style={{
        ...S.deptBtn,
        flexDirection: left ? "row-reverse" : "row",
        textAlign: left ? "right" : "left",
        borderColor: hot ? dept.color : C.border,
        boxShadow: hot ? "0 10px 24px rgba(13,27,62,0.12)" : "0 2px 8px rgba(13,27,62,0.05)",
        transform: hot ? (left ? "translateX(-4px)" : "translateX(4px)") : "none",
      }}
    >
      <span style={{ ...S.deptAccent, background: dept.color }} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: left ? "flex-end" : "flex-start", minWidth: 0 }}>
        <span style={S.deptName}>{dept.name}</span>
        <span style={S.deptMeta}>{dept.short} · {count} course{count === 1 ? "" : "s"}</span>
      </span>
    </button>
  );
}

function DeptSkeleton({ side }) {
  const left = side === "left";
  return (
    <div style={{ ...S.deptBtn, justifyContent: left ? "flex-end" : "flex-start", animation: "pulse 1.5s ease-in-out infinite" }}>
      <span style={{ height: 14, width: "62%", background: "#dfe4ee", borderRadius: 6 }} />
    </div>
  );
}

function CourseCard({ course, accent, onSelect }) {
  return (
    <div
      className="course-card"
      style={S.courseCard}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(course.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(course.id); } }}
    >
      <div style={S.cardTop}>
        <span style={{ ...S.courseCode, color: accent }}>{course.code}</span>
        <span style={S.creditsBadge}>{course.credits} cr</span>
      </div>
      <h3 style={S.courseTitle}>{course.title}</h3>
      <div style={S.tagRow}>
        {course.level != null && <span style={S.levelTag}>Level {course.level}</span>}
        <span style={course.practical ? S.pracTag : S.theoryTag}>{course.practical ? "Practical" : "Theory"}</span>
      </div>
      <div style={{ ...S.cardFooter, color: accent }}>View details →</div>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div style={{ ...S.courseCard, animation: "pulse 1.5s ease-in-out infinite" }}>
      <div style={{ ...S.skelLine, width: "40%", height: 12, marginBottom: 12 }} />
      <div style={{ ...S.skelLine, width: "78%", height: 18, marginBottom: 14 }} />
      <div style={{ ...S.skelLine, width: "52%", height: 12 }} />
    </div>
  );
}

function Pill({ active, color, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...S.pill, ...(active ? { background: color, color: C.white, borderColor: color } : {}) }}
    >
      {children}
    </button>
  );
}

function useMedia(query) {
  const [match, setMatch] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatch(mq.matches);
    handler();
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler); };
  }, [query]);
  return match;
}

export default function CoursesPage() {
  const navigate = useNavigate();
  const isDesktop = useMedia("(min-width: 900px)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)");

  const [departments, setDepartments] = useState([]);
  const [courses, setCourses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiWaking, setApiWaking]     = useState(false);

  const [view, setView]           = useState("home"); 
  const [activeDept, setActiveDept] = useState(null);

  const [search, setSearch] = useState("");
  const [cred, setCred]     = useState("all");
  const [level, setLevel]   = useState("all");
  const [type, setType]     = useState("all");

  useEffect(() => {
    let wakeTimer;
    const load = async () => {
      setLoading(true);
      wakeTimer = setTimeout(() => setApiWaking(true), 4000);

      const [deptRes, courseRes] = await Promise.all([
        api.departments(FALLBACK_DEPARTMENTS),
        api.coursesLite(FALLBACK_COURSES),
      ]);

      clearTimeout(wakeTimer);
      setApiWaking(false);

      const depts = decorateDepts(deptRes.data);
      const deptIds = new Set(depts.map(d => d.id));

      const liveCourses = (courseRes.data || [])
        .map(c => withMeta({ ...c, dept: resolveCourseDept(c, depts) }));
      const joinable = liveCourses.filter(c => deptIds.has(c.dept));

      let finalCourses = joinable;
      let synthesized = false;
      if (joinable.length === 0) {
        finalCourses = buildPlaceholderCourses(depts).map(withMeta);
        synthesized = true;
      }

      setDepartments(depts);
      setCourses(finalCourses);
      setUsingFallback(deptRes.source === "fallback" || courseRes.source === "fallback" || synthesized);
      setLoading(false);
    };
    load();
    return () => clearTimeout(wakeTimer);
  }, []);

  useEffect(() => {
    setSearch(""); setCred("all"); setLevel("all"); setType("all");
  }, [activeDept]);

  const countByDept = useMemo(() => {
    const m = {};
    courses.forEach(c => { m[c.dept] = (m[c.dept] || 0) + 1; });
    return m;
  }, [courses]);

  const left  = departments.slice(0, 6);
  const right = departments.slice(6, 12);

  const openDept = (d) => { setActiveDept(d); setView("dept"); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); };

  const visible = useMemo(() => {
    if (!activeDept) return [];
    const q = search.trim().toLowerCase();
    return courses.filter(c => c.dept === activeDept.id)
      .filter(c => !q || c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .filter(c => cred === "all" || c.credits === Number(cred))
      .filter(c => level === "all" || c.level === Number(level))
      .filter(c => type === "all" || (type === "practical" ? c.practical : !c.practical));
  }, [activeDept, courses, search, cred, level, type]);

  const renderHome = (fixed) => {
    const emblemSize = isDesktop ? "min(300px, 26vw, 36vh)" : 248;
    return (
      <div style={fixed ? S.homeColFixed : { ...S.home, animation: reduce ? "none" : "rise .5s ease both" }}>
        <div style={S.topbar}>
          <button style={S.backBtn} onClick={() => navigate("/")}>← Back</button>
          <button style={S.linkBtn} onClick={() => navigate("/curriculum")}>View full curriculum →</button>
        </div>

        <div style={S.homeHeader}>
          <p style={S.eyebrow}>Academic Resources</p>
          <h1 style={S.pageH1}>Course Catalogue</h1>
          <p style={S.lede}>Pick a department to open its courses, then filter by credits, level, or practical vs theory.</p>
        </div>

        {isDesktop ? (
          <div style={fixed ? S.heroWrapFixed : undefined}>
            <div style={S.heroGrid}>
              <div style={S.deptCol}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <DeptSkeleton key={i} side="left" />)
                  : left.map(d => <DeptButton key={d.id} dept={d} side="left" count={countByDept[d.id] || 0} onPick={openDept} />)}
              </div>

              <div style={S.emblemWrap}>
                <BookFlameEmblem size={emblemSize} reduce={reduce} />
                <p style={S.emblemCaption}>Knowledge, kept alight.</p>
              </div>

              <div style={S.deptCol}>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <DeptSkeleton key={i} side="right" />)
                  : right.map(d => <DeptButton key={d.id} dept={d} side="right" count={countByDept[d.id] || 0} onPick={openDept} />)}
              </div>
            </div>
          </div>
        ) : (
          <div style={S.heroStack}>
            <BookFlameEmblem size={emblemSize} reduce={reduce} />
            <div style={S.deptGridMobile}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <DeptSkeleton key={i} side="right" />)
                : departments.map(d => <DeptButton key={d.id} dept={d} side="right" count={countByDept[d.id] || 0} onPick={openDept} />)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDept = () => (
    <div style={{ ...S.dept, animation: reduce ? "none" : "rise .4s ease both" }}>
      <div style={{ ...S.accentBar, background: activeDept.color }} />

      <div style={S.deptHeader}>
        <button style={S.backBtn} onClick={() => setView("home")}>← Departments</button>
        <div>
          <p style={{ ...S.eyebrow, color: activeDept.color }}>{activeDept.short} · Department</p>
          <h1 style={S.pageH1Sm}>{activeDept.name}</h1>
        </div>
      </div>

      <div style={S.controlRow}>
        <div style={{ ...S.controlGroup, flex: "1 1 240px" }}>
          <span style={S.groupLabel}>Search</span>
          <input
            style={S.searchInput}
            placeholder="Name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={S.controlGroup}>
          <span style={S.groupLabel}>Credits</span>
          <div style={S.pillRow}>
            {["all", "2", "3", "4"].map(v => (
              <Pill key={v} active={cred === v} color={activeDept.color} onClick={() => setCred(v)}>
                {v === "all" ? "All" : v}
              </Pill>
            ))}
          </div>
        </div>

        <div style={S.controlGroup}>
          <span style={S.groupLabel}>Level</span>
          <div style={S.pillRow}>
            {["all", "1", "2", "3", "4", "5", "6"].map(v => (
              <Pill key={v} active={level === v} color={activeDept.color} onClick={() => setLevel(v)}>
                {v === "all" ? "All" : v}
              </Pill>
            ))}
          </div>
        </div>

        <div style={S.controlGroup}>
          <span style={S.groupLabel}>Type</span>
          <div style={S.pillRow}>
            {[["all", "All"], ["theory", "Theory"], ["practical", "Practical"]].map(([v, lbl]) => (
              <Pill key={v} active={type === v} color={activeDept.color} onClick={() => setType(v)}>
                {lbl}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      <div style={S.resultMeta}>
        {loading ? "Loading…" : `${visible.length} course${visible.length === 1 ? "" : "s"}`}
      </div>

      <div style={S.grid}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CourseSkeleton key={i} />)
          : visible.length > 0
            ? visible.map(c => <CourseCard key={c.id} course={c} accent={activeDept.color} onSelect={(id) => navigate(`/courses/${id}`)} />)
            : <p style={S.empty}>No courses match these filters. Try clearing one.</p>}
      </div>
    </div>
  );

  const homeFixed = view === "home" && isDesktop;

  return (
    <div className="uc-page" style={homeFixed ? S.pageHomeFixed : S.page}>
      {apiWaking && <div style={S.wakeToast}>API is waking up, please wait…</div>}
      {usingFallback && !loading && (
        <div style={S.staleBanner}>Showing sample data — live data unavailable.</div>
      )}

      {view === "home" ? renderHome(homeFixed) : renderDept()}
    </div>
  );
}
/* ===================================================================== */
/*  Styles                                                               */
/* ===================================================================== */
const S = {
  page: {
    minHeight: "100vh", background: C.offWhite, color: C.ink,
    padding: `${NAV_OFFSET}px 24px 72px`, fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
  },
  pageHomeFixed: {
    height: "100dvh", overflow: "hidden", boxSizing: "border-box",
    background: C.offWhite, color: C.ink,
    padding: `${NAV_OFFSET}px 24px 18px`, fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative", display: "flex", flexDirection: "column",
  },
  homeColFixed: {
    flex: 1, minHeight: 0, maxWidth: 1180, width: "100%", margin: "0 auto",
    display: "flex", flexDirection: "column",
    animation: "rise .5s ease both",
  },
  heroWrapFixed: {
    flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  wakeToast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 200,
    background: C.navyDeep, color: C.white, borderRadius: 10,
    padding: "12px 20px", fontSize: 13, fontWeight: 600,
    boxShadow: "0 4px 20px rgba(13,27,62,0.25)",
  },
  staleBanner: {
    maxWidth: 1180, margin: "0 auto 14px", flexShrink: 0,
    background: tint(C.orange, 0.14), color: C.navyDeep,
    borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600,
    border: `1px solid ${tint(C.orange, 0.3)}`, textAlign: "center",
  },
  home: { maxWidth: 1180, margin: "0 auto" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 16, flexShrink: 0 },
  backBtn: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
    color: C.navyMid, fontFamily: "inherit", whiteSpace: "nowrap",
  },
  linkBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, color: C.navyLight, fontFamily: "inherit", whiteSpace: "nowrap",
  },
  homeHeader: { textAlign: "center", maxWidth: 620, margin: "0 auto", flexShrink: 0 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.orange, margin: "0 0 6px" },
  pageH1: { fontSize: "clamp(28px, 3.8vw, 46px)", fontWeight: 800, letterSpacing: -1.4, color: C.navyDeep, margin: 0, lineHeight: 1.02 },
  pageH1Sm: { fontSize: "clamp(26px, 3.6vw, 38px)", fontWeight: 800, letterSpacing: -1, color: C.navyDeep, margin: 0 },
  lede: { fontSize: "clamp(13px, 1.3vw, 16px)", color: C.textMuted, margin: "10px auto 0", maxWidth: 440 },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(190px, 1fr) auto minmax(190px, 1fr)",
    alignItems: "center", gap: "clamp(18px, 3.5vw, 52px)",
    marginTop: 18, width: "100%",
  },
  deptCol: { display: "flex", flexDirection: "column", gap: 10 },
  emblemWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10 },
  emblemCaption: { fontSize: 11.5, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: C.textDim, margin: 0 },
  heroStack: { display: "flex", flexDirection: "column", alignItems: "center", gap: 26, marginTop: 24 },
  deptGridMobile: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, width: "100%" },
  deptBtn: {
    display: "flex", alignItems: "center", gap: 13,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "12px 15px", cursor: "pointer", fontFamily: "inherit",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
    width: "100%",
  },
  deptAccent: { width: 4, height: 32, borderRadius: 4, flexShrink: 0 },
  deptName: { fontSize: 15, fontWeight: 700, color: C.navyDeep, lineHeight: 1.2 },
  deptMeta: { fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4, color: C.textDim, textTransform: "uppercase" },
  dept: { maxWidth: 1100, margin: "0 auto", position: "relative" },
  accentBar: { width: 64, height: 5, borderRadius: 4, marginBottom: 20 },
  deptHeader: { display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 },
  controlRow: { display: "flex", flexWrap: "wrap", gap: "18px 32px", alignItems: "flex-start", marginBottom: 18 },
  controlGroup: { display: "flex", flexDirection: "column", gap: 8 },
  groupLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.textDim },
  searchInput: {
    width: "100%", boxSizing: "border-box", minWidth: 200,
    border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "11px 16px", fontSize: 14, color: C.navyDeep,
    background: C.white, outline: "none", fontFamily: "inherit",
  },
  pillRow: { display: "flex", gap: 7, flexWrap: "wrap" },
  pill: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 20,
    padding: "7px 15px", fontSize: 13, fontWeight: 600, color: C.textMuted,
    cursor: "pointer", fontFamily: "inherit", minWidth: 38,
    transition: "background .12s ease, color .12s ease, border-color .12s ease",
  },
  resultMeta: {
    fontSize: 13, fontWeight: 600, color: C.textMuted,
    padding: "4px 2px 16px", borderBottom: `1px solid ${C.border}`, marginBottom: 22,
  },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 18,
  },
  courseCard: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: "22px 22px", cursor: "pointer",
    boxShadow: "0 2px 8px rgba(13,27,62,0.05)",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  courseCode: { fontSize: 11, fontWeight: 800, letterSpacing: 1.3, textTransform: "uppercase" },
  creditsBadge: {
    background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 6,
    padding: "2px 8px", fontSize: 11, fontWeight: 700, color: C.textMuted,
  },
  courseTitle: { fontSize: 16.5, fontWeight: 700, color: C.navyDeep, margin: "0 0 14px", lineHeight: 1.3 },
  tagRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  levelTag: {
    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
    background: C.offWhite, color: C.navyMid, border: `1px solid ${C.border}`,
  },
  theoryTag: {
    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
    background: tint(C.navyLight, 0.1), color: C.navyMid,
  },
  pracTag: {
    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6,
    background: tint(C.orange, 0.16), color: "#a8620a",
  },
  cardFooter: {
    marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`,
    fontSize: 12.5, fontWeight: 700, letterSpacing: 0.2,
  },
  empty: { color: C.textMuted, fontSize: 15, gridColumn: "1/-1", padding: "44px 0", textAlign: "center" },
  skelLine: { background: "#e2e8f0", borderRadius: 6, display: "block" },
};