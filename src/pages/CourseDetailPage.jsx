import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/apiBridge.js";
import { COLORS as C } from "../styles/colors.js";
import "../styles/CourseDetailPage.css";

const NAV_OFFSET = 92;

function tint(hex, a) {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const DEPT_COLOR = {
  "Computer Science": "#4f7cc4",
  "Electronics & Comm.": "#d18a3e",
  "Electrical Engineering": "#e0aa6b",
  "Mechanical Engineering": "#4e9b72",
  "Civil Engineering": "#c25b52",
  "Data Science & Eng.": "#2f8f86",
  "Mathematics": "#37548f",
  "Physics": "#6f7bd0",
  "Chemistry": "#9c4a52",
  "Biotechnology": "#2f6e54",
  "Materials Engineering": "#a8682c",
  "Humanities & Soc. Sci.": "#7a6cae",
};
const accentFor = (dept) => DEPT_COLOR[dept] || C.orange;

function parseCode(code) {
  const s = (code || "").trim();
  const m = /^([A-Za-z]{2,4})(\d)(\d+)(P)?$/i.exec(s);
  if (!m) return { level: null, practical: /p$/i.test(s) };
  return { level: Number(m[2]), practical: !!m[4] };
}

/* The API returns prerequisites as { id, code, title }; older payloads (and the
   fallback below) may still hold plain strings like "CS101 - Intro". Both are
   normalised here so the list can link through wherever an id exists. */
function normalizePrereqs(list) {
  return (list || []).map((p, i) => {
    if (typeof p === "string") {
      const m = /^\s*([A-Za-z]{2,4}\s?\d{2,4}P?)\s*[\u2014\u2013:-]?\s*(.*)$/.exec(p);
      return m
        ? { key: `s${i}`, id: null, code: m[1].trim(), title: m[2].trim() }
        : { key: `s${i}`, id: null, code: "", title: p };
    }
    return {
      key: p?.id || `o${i}`,
      id: p?.id ?? null,
      code: p?.code || "",
      title: p?.title || p?.name || "",
    };
  });
}

/* Branches arrive as { code, name, color } from the bridge, or as bare codes. */
function normalizeBranches(list) {
  return (list || []).map((b) =>
    typeof b === "string" ? { code: b, name: b, color: null } : b
  ).filter((b) => b && (b.code || b.name));
}

/* Minimal skeleton block used during loading. Kept local to avoid adding a new file. */
function SkeletonBlock({ width = "100%", height = 12, mb = 8 }) {
  const h = typeof height === "number" ? `${height}px` : height;
  const marginBottom = mb ? (typeof mb === "number" ? `${mb}px` : mb) : 0;
  return (
    <div style={{ width, height: h, background: tint(C.navyLight, 0.06), borderRadius: 8, marginBottom }} />
  );
}

const FALLBACK_COURSE = {
  id: 1, code: "CS301", title: "Data Structures & Algorithms",
  dept: "Computer Science and Engineering", credits: 4,
  lecture_hours: 3, tutorial_hours: 1, practical_hours: 0,
  description: "Covers fundamental data structures (arrays, linked lists, trees, graphs, hash tables) and algorithmic paradigms including sorting, searching, dynamic programming, and greedy algorithms. Emphasis on analysing time and space complexity and on choosing the right structure for a given problem.",
  syllabus_url: null,
  curriculum_url: null,
  curriculum_title: null,
  programs: ["B.Tech.", "B.Tech. (Honours)"],
  branches: ["CSE", "DSE"],
  prerequisites: [
    { id: 2, code: "CS101", title: "Introduction to Programming" },
    { id: 3, code: "CS201", title: "Discrete Mathematics" },
  ],
};

export default function CourseDetailPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiWaking, setApiWaking] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    let wakeTimer;
    window.scrollTo({ top: 0 });
    const load = async () => {
      setLoading(true);
      wakeTimer = setTimeout(() => setApiWaking(true), 4000);
      const res = await api.courseDetail(courseId, FALLBACK_COURSE);
      clearTimeout(wakeTimer);
      setApiWaking(false);
      setCourse(res.data);
      setUsingFallback(res.source === "fallback");
      setLoading(false);
    };
    load();
    return () => clearTimeout(wakeTimer);
  }, [courseId]);

  const accent = course ? accentFor(course.dept) : C.orange;
  const meta = course ? parseCode(course.code) : { level: null, practical: false };
  const prereqs = normalizePrereqs(course?.prerequisites);
  const programs = course?.programs || [];
  const branches = normalizeBranches(course?.branches);
  const curriculumUrl = course?.curriculum_url || course?.syllabus_url || null;
  const ltp = course
    ? [["L", course.lecture_hours], ["T", course.tutorial_hours], ["P", course.practical_hours]]
        .filter(([, val]) => val != null)
    : [];

  return (
    <div className="ucd-page" style={S.page}>

      {apiWaking && <div style={S.wakeToast}>API is waking up, please wait…</div>}

      <div style={S.inner}>
        <button style={S.backBtn} onClick={() => navigate("/courses")}>← All courses</button>

        {usingFallback && !loading && (
          <div style={S.staleBanner}>Showing sample data — live data is loading in the background.</div>
        )}

        {loading ? (
          <div style={{ marginTop: 8 }}>
            <SkeletonBlock width="28%" height={12} mb={16} />
            <SkeletonBlock width="62%" height={38} mb={18} />
            <SkeletonBlock width="40%" height={14} mb={36} />
            <SkeletonBlock width="100%" height={90} mb={16} />
            <SkeletonBlock width="100%" height={90} />
          </div>
        ) : course ? (
          <div style={{ animation: "rise .45s ease both" }}>
            <div style={{ ...S.accentBar, background: accent }} />

            <div style={S.headerRow}>
              <div style={{ minWidth: 0 }}>
                <p style={{ ...S.eyebrow, color: accent }}>{course.code} · {course.dept}</p>
                <h1 style={S.h1}>{course.title}</h1>
                <div style={S.chips}>
                  <span style={S.chip}>{course.credits} credits</span>
                  {meta.level != null && <span style={S.chip}>Level {meta.level}</span>}
                  <span style={meta.practical ? S.chipPrac : S.chipTheory}>{meta.practical ? "Practical" : "Theory"}</span>
                  {ltp.map(([label, val]) => (
                    <span key={label} style={S.ltpItem}>
                      <span style={{ ...S.ltpLabel, color: accent }}>{label}</span>
                      <span style={S.ltpVal}>{val}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(programs.length > 0 || branches.length > 0) && (
              <section style={S.section}>
                <h2 style={S.sectionH2}>Intended for</h2>
                {programs.length > 0 && (
                  <div style={S.metaBlock}>
                    <span style={S.metaLabel}>Programs</span>
                    <div style={S.pillList}>
                      {programs.map(pr => (
                        <span key={pr} style={S.progPill}>{pr}</span>
                      ))}
                    </div>
                  </div>
                )}
                {branches.length > 0 && (
                  <div style={S.metaBlock}>
                    <span style={S.metaLabel}>Branches</span>
                    <div style={S.pillList}>
                      {branches.map(b => (
                        <span key={b.code || b.name} style={S.branchPill}>
                          <span style={{ ...S.branchDot, background: b.color || accent }} />
                          {b.name || b.code}
                          {b.code && b.name && b.name !== b.code && (
                            <span style={S.branchCode}>{b.code}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {prereqs.length > 0 && (
              <section style={S.section}>
                <h2 style={S.sectionH2}>Prerequisites</h2>
                <ul style={S.prereqList}>
                  {prereqs.map(pq => (
                    <li key={pq.key} style={S.prereqLi}>
                      {pq.id ? (
                        <button
                          type="button"
                          className="ucd-prereq"
                          style={S.prereqBtn}
                          onClick={() => navigate(`/courses/${pq.id}`)}
                        >
                          <span style={{ ...S.prereqDot, background: accent }} />
                          {pq.code && <span style={{ ...S.prereqCode, color: accent }}>{pq.code}</span>}
                          <span style={S.prereqTitle}>{pq.title || pq.code}</span>
                          <span style={{ ...S.prereqGo, color: accent }}>→</span>
                        </button>
                      ) : (
                        <div style={S.prereqItem}>
                          <span style={{ ...S.prereqDot, background: accent }} />
                          {pq.code && <span style={{ ...S.prereqCode, color: accent }}>{pq.code}</span>}
                          <span style={S.prereqTitle}>{pq.title || pq.code}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section style={{ ...S.section, marginBottom: 8 }}>
              <h2 style={S.sectionH2}>Course curriculum</h2>
              {curriculumUrl ? (
                <div style={{ ...S.docCard, borderLeft: `4px solid ${accent}` }}>
                  <span style={{ ...S.docBadge, background: tint(accent, 0.14), color: accent }}>PDF</span>
                  <div style={S.docText}>
                    <p style={S.docTitle}>
                      {course.curriculum_title || `${course.code} curriculum`}
                    </p>
                    <p style={S.docSub}>
                      Units, contact hours, assessment split and the reading list, as approved by the department.
                    </p>
                  </div>
                  <div style={S.docActions}>
                    <a
                      className="ucd-doc-btn"
                      href={curriculumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...S.docPrimary, background: C.navyDeep }}
                    >
                      View PDF ↗
                    </a>
                    <a
                      className="ucd-doc-btn"
                      href={curriculumUrl}
                      download
                      style={S.docGhost}
                    >
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <p style={S.muted}>
                  The curriculum PDF is not uploaded yet. It will appear here once the department publishes it.
                </p>
              )}
            </section>

          </div>
        ) : (
          <p style={{ ...S.muted, marginTop: 40 }}>Course not found. It may have been moved — head back to the catalogue.</p>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: C.offWhite, color: C.ink,
    padding: `${NAV_OFFSET}px 24px 72px`, fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
  },
  inner: { maxWidth: 860, margin: "0 auto" },

  wakeToast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 200,
    background: C.navyDeep, color: C.white, borderRadius: 10,
    padding: "12px 20px", fontSize: 13, fontWeight: 600,
    boxShadow: "0 4px 20px rgba(13,27,62,0.25)",
  },
  staleBanner: {
    background: tint(C.orange, 0.14), color: C.navyDeep, borderRadius: 8,
    padding: "10px 18px", fontSize: 13, fontWeight: 600, marginBottom: 24,
    border: `1px solid ${tint(C.orange, 0.3)}`,
  },

  backBtn: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
    color: C.navyMid, marginBottom: 24, fontFamily: "inherit",
  },

  accentBar: { width: 56, height: 5, borderRadius: 4, marginBottom: 18 },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap", marginBottom: 40 },
  eyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", margin: "0 0 10px" },
  h1: { fontSize: "clamp(26px, 4vw, 40px)", fontWeight: 800, color: C.navyDeep, margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.05 },

  chips: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  chip: {
    fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
    background: C.white, border: `1px solid ${C.border}`, color: C.navyMid,
  },
  chipTheory: {
    fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
    background: tint(C.navyLight, 0.1), color: C.navyMid,
  },
  chipPrac: {
    fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
    background: tint(C.orange, 0.16), color: "#a8620a",
  },

  ltpItem: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "4px 10px",
  },
  ltpLabel: { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  ltpVal: { fontSize: 13, fontWeight: 700, color: C.navyDeep },
  metaBlock: { marginTop: 18 },
  metaLabel: {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    textTransform: "uppercase", color: C.textDim, marginBottom: 9,
  },
  pillList: { display: "flex", flexWrap: "wrap", gap: 8 },
  progPill: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 20,
    padding: "7px 15px", fontSize: 13, fontWeight: 700, color: C.navyMid,
  },
  branchPill: {
    display: "inline-flex", alignItems: "center", gap: 9,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 20,
    padding: "7px 15px", fontSize: 13, fontWeight: 600, color: C.navyMid,
  },
  branchDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  branchCode: { fontSize: 11, fontWeight: 800, letterSpacing: 0.8, color: C.textDim },

  docCard: {
    display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 14,
    padding: "22px 24px", marginTop: 16,
    boxShadow: "0 2px 8px rgba(13,27,62,0.05)",
  },
  docBadge: {
    fontSize: 11, fontWeight: 800, letterSpacing: 1.2, borderRadius: 8,
    padding: "10px 12px", flexShrink: 0,
  },
  docText: { flex: 1, minWidth: 200 },
  docTitle: { fontSize: 15.5, fontWeight: 800, color: C.navyDeep, margin: 0 },
  docSub: { fontSize: 13, lineHeight: 1.6, color: C.textMuted, margin: "5px 0 0" },
  docActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  docPrimary: {
    display: "inline-flex", alignItems: "center", gap: 8, color: C.white,
    borderRadius: 9, padding: "11px 20px", fontSize: 13, fontWeight: 700,
    textDecoration: "none", whiteSpace: "nowrap",
    boxShadow: "0 6px 18px rgba(13,27,62,0.22)",
  },
  docGhost: {
    display: "inline-flex", alignItems: "center", borderRadius: 9,
    padding: "11px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none",
    color: C.navyMid, background: C.offWhite, border: `1px solid ${C.border}`,
    whiteSpace: "nowrap",
  },

  section: { marginBottom: 44 },
  sectionH2: { fontSize: 19, fontWeight: 800, color: C.navyDeep, margin: 0, letterSpacing: -0.4 },

  prereqList: { listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8 },
  prereqLi: { display: "block" },
  prereqItem: {
    display: "flex", alignItems: "center", gap: 12,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 16px", fontSize: 14, color: C.navyMid, fontWeight: 600,
  },
  prereqBtn: {
    display: "flex", alignItems: "center", gap: 12, width: "100%",
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 16px", fontSize: 14, color: C.navyMid, fontWeight: 600,
    fontFamily: "inherit", textAlign: "left", cursor: "pointer",
  },
  prereqCode: { fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0 },
  prereqTitle: { flex: 1, minWidth: 0 },
  prereqGo: { fontSize: 15, fontWeight: 800, flexShrink: 0 },
  prereqDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  muted: { color: C.textMuted, fontSize: 14, margin: "14px 0 0" },
};