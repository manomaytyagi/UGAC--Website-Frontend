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

const FALLBACK_COURSE = {
  id: 1, code: "CS301", title: "Data Structures & Algorithms",
  dept: "Computer Science and Engineering", credits: 4,
  lecture_hours: 3, tutorial_hours: 1, practical_hours: 0,
  description: "Covers fundamental data structures (arrays, linked lists, trees, graphs, hash tables) and algorithmic paradigms including sorting, searching, dynamic programming, and greedy algorithms. Emphasis on analysing time and space complexity and on choosing the right structure for a given problem.",
  syllabus_url: null,
  prerequisites: ["CS101 — Introduction to Programming", "CS201 — Discrete Mathematics"],
  reviews: [
    { author: "Anonymous", semester: "Autumn 2025", rating: 5, text: "Excellent course. Assignments are challenging but very rewarding, and the instructor explains complex ideas clearly." },
    { author: "Anonymous", semester: "Spring 2025", rating: 4, text: "Good content but the mid-semester exam felt rushed. Start the assignments early." },
  ],
};

function Stars({ rating, size = 15 }) {
  const full = Math.round(rating);
  return (
    <span style={{ fontSize: size, lineHeight: 1, letterSpacing: 1, whiteSpace: "nowrap" }}>
      <span style={{ color: C.orange }}>{"★".repeat(full)}</span>
      <span style={{ color: C.border }}>{"★".repeat(Math.max(0, 5 - full))}</span>
      <span style={{ color: C.textMuted, fontWeight: 700, fontSize: size - 2, marginLeft: 6 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function SkeletonBlock({ width = "100%", height = 16, mb = 10 }) {
  return <div style={{ background: "#dfe4ee", borderRadius: 6, width, height, marginBottom: mb, animation: "pulse 1.5s ease-in-out infinite" }} />;
}

function ReviewForm({ courseId, accent, onSubmit }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (!text.trim() || text.length < 20) return;
    setSubmitting(true);
    setSubmitError(null);
    const payload = { course_id: courseId, rating, text, author: anon ? "Anonymous" : (name || "Anonymous"), semester: "This semester" };
    try {
      await api.submitReview(payload);
      setDone(true);
      if (onSubmit) onSubmit(payload);
    } catch (err) {
      setSubmitError("Review save nahi ho saki — please thodi der baad dobara try karein.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <div style={S.reviewSuccess}>
      Review submitted successfully! Thank you for sharing your feedback.
      <span style={{ display: "block", marginTop: 6, fontWeight: 500, fontSize: 13 }}>.
      </span>
    </div>
  );

  const tooShort = text.trim().length < 20;

  return (
    <div style={S.reviewForm}>
      <h4 style={S.reviewFormTitle}>Leave a review</h4>

      <span style={S.fieldLabel}>Your rating</span>
      <div style={S.starPicker}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            style={{ ...S.starBtn, color: n <= rating ? C.orange : C.border }}
            onClick={() => setRating(n)}
          >★</button>
        ))}
      </div>

      <label style={S.anonRow}>
        <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ marginRight: 8 }} />
        Submit anonymously
      </label>
      {!anon && (
        <input style={S.input} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      )}

      <textarea
        style={{ ...S.input, ...S.textarea }}
        placeholder="What stood out — workload, teaching, assessments?"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
      />
      <div style={S.charCountRow}>
        <span style={{ ...S.charCount, color: tooShort ? "#c0392b" : "#22863a" }}>
          {text.length} / 20{tooShort ? ` — ${20 - text.length} more needed` : " ✓"}
        </span>
      </div>
      <div
        title={tooShort ? `Write ${20 - text.length} more character${20 - text.length !== 1 ? "s" : ""} to submit` : ""}
        style={{ display: "inline-block" }}
      >
        <button
          type="button"
          style={{ ...S.submitBtn, background: accent, opacity: tooShort ? 0.45 : 1, cursor: tooShort ? "not-allowed" : "pointer" }}
          disabled={tooShort || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
      {submitError && (
        <p style={S.reviewError}>{submitError}</p>
      )}
    </div>
  );
}

export default function CourseDetailPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [apiWaking, setApiWaking] = useState(false);
  const [localReviews, setLocalReviews] = useState([]);

  useEffect(() => {
    if (!courseId) return;
    let wakeTimer;
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

  const allReviews = [...(course?.reviews || []), ...localReviews];
  const avg = allReviews.length ? allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length : 0;
  const accent = course ? accentFor(course.dept) : C.orange;
  const meta = course ? parseCode(course.code) : { level: null, practical: false };

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
                  {allReviews.length > 0 && (
                    <span style={S.chipPlain}><Stars rating={avg} size={13} /></span>
                  )}
                </div>
                {(course.lecture_hours != null || course.tutorial_hours != null || course.practical_hours != null) && (
                  <div style={S.ltp}>
                    {[
                      ["L", course.lecture_hours],
                      ["T", course.tutorial_hours],
                      ["P", course.practical_hours],
                    ].map(([label, val]) => val != null && (
                      <span key={label} style={S.ltpItem}>
                        <span style={{ ...S.ltpLabel, color: accent }}>{label}</span>
                        <span style={S.ltpVal}>{val}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {course.syllabus_url && (
                <a href={course.syllabus_url} target="_blank" rel="noopener noreferrer" style={{ ...S.syllabusBtn, background: C.navyDeep }}>
                  Download syllabus ↗
                </a>
              )}
            </div>

            <section style={S.section}>
              <h2 style={S.sectionH2}>About this course</h2>
              <p style={S.desc}>{course.description}</p>
            </section>

            {course.prerequisites?.length > 0 && (
              <section style={S.section}>
                <h2 style={S.sectionH2}>Prerequisites</h2>
                <ul style={S.prereqList}>
                  {course.prerequisites.map(p => (
                    <li key={p} style={S.prereqItem}>
                      <span style={{ ...S.prereqDot, background: accent }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section style={S.section}>
              <div style={S.reviewHead}>
                <h2 style={S.sectionH2}>Student reviews ({allReviews.length})</h2>
                {allReviews.length > 0 && <Stars rating={avg} size={16} />}
              </div>
              {allReviews.length === 0 && (
                <p style={S.muted}>No reviews yet — be the first to share what this course is like.</p>
              )}
              <div style={S.reviewsGrid}>
                {allReviews.map((r, i) => (
                  <div key={i} style={S.reviewCard}>
                    <div style={S.reviewTop}>
                      <span style={S.reviewAuthor}>{r.author}</span>
                      {r.semester && <span style={S.reviewSem}>{r.semester}</span>}
                    </div>
                    <Stars rating={r.rating} size={13} />
                    <p style={S.reviewText}>{r.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ ...S.section, marginBottom: 8 }}>
              <ReviewForm courseId={courseId} accent={accent} onSubmit={r => setLocalReviews(prev => [r, ...prev])} />
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
  chipPlain: { display: "inline-flex", alignItems: "center", padding: "3px 4px" },
  chipTheory: {
    fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
    background: tint(C.navyLight, 0.1), color: C.navyMid,
  },
  chipPrac: {
    fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 7,
    background: tint(C.orange, 0.16), color: "#a8620a",
  },

  ltp: { display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" },
  ltpItem: {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 7,
    padding: "4px 10px",
  },
  ltpLabel: { fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" },
  ltpVal: { fontSize: 13, fontWeight: 700, color: C.navyDeep },
  syllabusBtn: {
    display: "inline-flex", alignItems: "center", gap: 8, color: C.white,
    borderRadius: 9, padding: "12px 22px", fontSize: 13, fontWeight: 700,
    textDecoration: "none", flexShrink: 0,
    boxShadow: "0 6px 18px rgba(13,27,62,0.22)",
  },

  section: { marginBottom: 44 },
  sectionH2: { fontSize: 19, fontWeight: 800, color: C.navyDeep, margin: 0, letterSpacing: -0.4 },
  desc: { fontSize: 15.5, lineHeight: 1.8, color: C.textMuted, margin: "14px 0 0" },

  prereqList: { listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 8 },
  prereqItem: {
    display: "flex", alignItems: "center", gap: 12,
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "12px 16px", fontSize: 14, color: C.navyMid, fontWeight: 600,
  },
  prereqDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  reviewHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 4 },
  muted: { color: C.textMuted, fontSize: 14, margin: "14px 0 0" },
  reviewsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginTop: 18 },
  reviewCard: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(13,27,62,0.05)" },
  reviewTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  reviewAuthor: { fontSize: 13, fontWeight: 800, color: C.navyDeep },
  reviewSem: { fontSize: 11, fontWeight: 600, color: C.textDim },
  reviewText: { fontSize: 13.5, lineHeight: 1.7, color: C.textMuted, margin: "10px 0 0" },

  reviewForm: { background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 26px", boxShadow: "0 2px 8px rgba(13,27,62,0.05)" },
  reviewFormTitle: { fontSize: 17, fontWeight: 800, color: C.navyDeep, margin: "0 0 18px" },
  fieldLabel: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: C.textDim, marginBottom: 8 },
  starPicker: { display: "flex", gap: 4, marginBottom: 18 },
  starBtn: { background: "none", border: "none", fontSize: 28, lineHeight: 1, cursor: "pointer", padding: "0 2px", fontFamily: "inherit" },
  anonRow: { display: "flex", alignItems: "center", fontSize: 13, color: C.textMuted, marginBottom: 14, cursor: "pointer", fontWeight: 600 },
  input: {
    width: "100%", boxSizing: "border-box", border: `1px solid ${C.border}`, borderRadius: 9,
    padding: "11px 14px", fontSize: 14, color: C.navyDeep, background: C.offWhite,
    marginBottom: 12, outline: "none", fontFamily: "inherit",
  },
  textarea: { resize: "vertical", minHeight: 104, lineHeight: 1.6, marginBottom: 4 },
  charCountRow: { display: "flex", justifyContent: "flex-end", marginBottom: 12 },
  charCount: { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, transition: "color 0.2s" },
  submitBtn: { color: C.white, border: "none", borderRadius: 9, padding: "12px 26px", fontSize: 14, fontWeight: 700, fontFamily: "inherit" },
  reviewSuccess: {
    background: tint("#22c55e", 0.14), color: "#166534", border: `1px solid ${tint("#22c55e", 0.35)}`,
    borderRadius: 12, padding: "18px 22px", fontSize: 14, fontWeight: 700,
  },
  reviewError: {
    background: tint("#ef4444", 0.1), color: "#991b1b", border: `1px solid ${tint("#ef4444", 0.3)}`,
    borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginTop: 10,
  },
};
