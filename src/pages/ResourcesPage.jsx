import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resourcesApi } from "../lib/apiBridge";
import { COLORS as C } from "../styles/colors.js";
import { PROCEDURES } from "../components/Resources/Registry.jsx";
import "../styles/ResourcesPage.css";

const TABS = [
  { id: "documents",  label: " Forms & Documents" },
  { id: "links",      label: " Useful Links" },
  { id: "procedures", label: " Procedures" },
];

const FALLBACKS = {
  documents: [
    {
      title: "UG Academic Regulations 2024",
      desc: "Official rulebook governing academic policies, attendance, grading, and promotion criteria.",
      tag: "PDF",
      file_key: "docs/ug-regulations-2024.pdf",
    },
    {
      title: "Academic Calendar 2025–26",
      desc: "Semester dates, exam schedules, holidays, and registration deadlines.",
      tag: "PDF",
      file_key: "docs/academic-calendar-2526.pdf",
    },
    {
      title: "Code of Conduct",
      desc: "Expected standards of academic integrity and professional behaviour.",
      tag: "PDF",
      file_key: "docs/code-of-conduct.pdf",
    },
    {
      title: "Grading & Credit System Handbook",
      desc: "Explains the credit system, SGPA/CGPA calculation, and grade thresholds.",
      tag: "PDF",
      file_key: "docs/grading-handbook.pdf",
    },
    {
      title: "PhD & PG Programme Guidelines",
      desc: "Structure, milestones, and requirements for postgraduate students.",
      tag: "PDF",
      file_key: "docs/pg-guidelines.pdf",
    },
  ],
  links: [
    {
      title: "IIT Mandi ERP Portal",
      desc: "Course registration, grade reports, and timetable access.",
      tag: "Portal",
      url: "https://erp.iitmandi.ac.in",
    },
    {
      title: "Academic Office",
      desc: "Official page for the Dean of Academic Affairs — notices, circulars.",
      tag: "Official",
      url: "https://www.iitmandi.ac.in/academics",
    },
    {
      title: "Moodle LMS",
      desc: "Course materials, assignments, and lecture slides uploaded by faculty.",
      tag: "Portal",
      url: "https://moodle.iitmandi.ac.in",
    },
    {
      title: "Library & Digital Resources",
      desc: "Access to journals, e-books, and the NPTEL/SWAYAM catalogue.",
      tag: "Library",
      url: "https://library.iitmandi.ac.in",
    },
    {
      title: "NPTEL Online Courses",
      desc: "Free IIT-delivered online courses eligible for institute credit transfer.",
      tag: "External",
      url: "https://nptel.ac.in",
    },
    {
      title: "SWAYAM Portal",
      desc: "Government MOOCs platform with certificate courses across disciplines.",
      tag: "External",
      url: "https://swayam.gov.in",
    },
  ],
};

const TAG_COLORS = {
  PDF:       { bg: "#eff6ff", color: "#1d4ed8" },
  Portal:    { bg: "#f0fdf4", color: "#15803d" },
  Official:  { bg: "#faf5ff", color: "#7e22ce" },
  Library:   { bg: "#fff7ed", color: "#c2410c" },
  External:  { bg: "#f0f9ff", color: "#0369a1" },
  Form:      { bg: "#fefce8", color: "#854d0e" },
  Guide:     { bg: "#fdf4ff", color: "#86198f" },
  Archive:   { bg: "#fff1f2", color: "#be123c" },
  Drive:     { bg: "#f0fdf4", color: "#15803d" },
  Flowchart: { bg: "#eef2fb", color: "#3b4a7a" },
};

function TagBadge({ tag }) {
  const style = TAG_COLORS[tag] || { bg: C.offWhite, color: C.textMuted };
  return (
    <span style={{ ...S.tag, background: style.bg, color: style.color }}>
      {tag}
    </span>
  );
}

function CardSkeleton() {
  return (
    <div style={S.skeletonCard}>
      <div style={{ ...S.skeletonLine, width: "30%", height: 12, marginBottom: 14 }} />
      <div style={{ ...S.skeletonLine, width: "80%", height: 16, marginBottom: 10 }} />
      <div style={{ ...S.skeletonLine, width: "65%", height: 12, marginBottom: 6 }} />
      <div style={{ ...S.skeletonLine, width: "50%", height: 12 }} />
    </div>
  );
}

function ResourceCard({ item }) {
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const hasDirectUrl = item.url && item.url !== "#";
  const hasFileKey = !!item.file_key;
  const isLocked = !hasDirectUrl && !hasFileKey;

  const handleClick = async (e) => {
    if (isLocked) { e.preventDefault(); return; }
    if (hasDirectUrl) return;

    e.preventDefault();
    setFetching(true);
    setFetchError("");
    try {
      const res = await resourcesApi.presignedUrl(item.file_key);
      if (res?.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        setFetchError("Could not fetch download link. Please try again.");
      }
    } catch {
      setFetchError("Network error. Please try again.");
    } finally {
      setFetching(false);
    }
  };

  return (
    <div style={{ ...S.card, ...(isLocked ? S.cardLocked : {}) }}>
      <div style={S.cardTop}>
        <TagBadge tag={item.tag} />
        <span style={S.cardArrow}>
          {isLocked ? "🔒" : fetching ? "⏳" : hasFileKey ? "⬇" : "↗"}
        </span>
      </div>
      <h3 style={S.cardTitle}>{item.title}</h3>
      <p style={S.cardDesc}>{item.desc}</p>
      {fetchError && <p style={S.cardError}>{fetchError}</p>}
      {!isLocked && (
        <a
          href={hasDirectUrl ? item.url : "#"}
          target={hasDirectUrl ? "_blank" : undefined}
          rel="noopener noreferrer"
          style={{ ...S.cardBtn, ...(fetching ? S.cardBtnDisabled : {}) }}
          onClick={handleClick}
        >
          {fetching ? "Fetching link…" : hasFileKey ? "Download" : "Open →"}
        </a>
      )}
    </div>
  );
}

function ProcedureCard({ proc, onOpen }) {
  return (
    <div style={S.card}>
      <div style={S.cardTop}>
        <TagBadge tag={proc.tag} />
        {proc.icon && <span style={S.cardArrow}>{proc.icon}</span>}
      </div>
      <h3 style={S.cardTitle}>{proc.title}</h3>
      <p style={S.cardDesc}>{proc.desc}</p>
      <button style={S.cardBtn} onClick={onOpen}>
        View procedure →
      </button>
    </div>
  );
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Allow deep-linking a tab (e.g. the back button on a procedure page returns
  // here with { state: { tab: "procedures" } }).
  const [activeTab, setActiveTab] = useState(location.state?.tab || "documents");
  const [search, setSearch] = useState("");

  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiWaking, setApiWaking] = useState(false);

  useEffect(() => {
    if (activeTab === "procedures") return; // static tab, no card data to fetch
    if (tabData[activeTab]?.loaded) return;

    let wakeTimer;
    const load = async () => {
      setLoading(true);
      wakeTimer = setTimeout(() => setApiWaking(true), 4000);

      const fallback = FALLBACKS[activeTab] || [];
      const res = await resourcesApi.category(activeTab, fallback);

      clearTimeout(wakeTimer);
      setApiWaking(false);
      setTabData((prev) => ({
        ...prev,
        [activeTab]: { items: res.data, source: res.source, loaded: true },
      }));
      setLoading(false);
    };
    load();
    return () => clearTimeout(wakeTimer);
  }, [activeTab]);

  const current = tabData[activeTab];
  const items = current?.items || [];
  const isStale = current?.source === "fallback";

  const matches = (title, desc) =>
    !search ||
    title.toLowerCase().includes(search.toLowerCase()) ||
    (desc || "").toLowerCase().includes(search.toLowerCase());

  const filtered = items.filter((item) => matches(item.title, item.desc));
  const filteredProcedures = PROCEDURES.filter((p) => matches(p.title, p.desc));

  const isProcedures = activeTab === "procedures";

  return (
    <div className="uc-resources" style={S.page}>

      {apiWaking && (
        <div style={S.wakeToast}>⏳ API is waking up, please wait…</div>
      )}

      {isStale && !loading && !isProcedures && (
        <div style={S.staleBanner}>
          📋 Showing cached data — live data is loading in the background
        </div>
      )}

      <div style={S.pageHeader}>
        <button style={S.backBtn} onClick={() => navigate("/")}>
          ← Back
        </button>
        <div>
          <p style={S.eyebrow}>UGAC · IIT Mandi</p>
          <h1 style={S.pageH1}>Resources</h1>
          <p style={S.pageSubtitle}>
            Forms, documents, useful links, and step-by-step procedures —
            everything a UGAC student needs in one place.
          </p>
        </div>
      </div>

      <div style={S.searchWrap}>
        <span style={S.searchIcon}>🔍</span>
        <input
          style={S.searchInput}
          placeholder={isProcedures ? "Search procedures…" : "Search resources…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={S.clearBtn} onClick={() => setSearch("")}>✕</button>
        )}
      </div>

      <div style={S.tabsWrap}>
        <div style={S.tabs}>
          {TABS.map((t) => {
            const count =
              t.id === "procedures"
                ? PROCEDURES.length
                : tabData[t.id]?.items?.length;
            return (
              <button
                key={t.id}
                style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
                onClick={() => {
                  setActiveTab(t.id);
                  setSearch("");
                }}
              >
                {t.label}
                {count !== undefined && (
                  <span
                    style={{
                      ...S.tabCount,
                      ...(activeTab === t.id ? S.tabCountActive : {}),
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={S.container}>
        {isProcedures ? (
          filteredProcedures.length === 0 && search ? (
            <div style={S.empty}>
              <p style={S.emptyIcon}>🔍</p>
              <p style={S.emptyText}>No procedures match "{search}"</p>
              <button style={S.clearSearchBtn} onClick={() => setSearch("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div style={S.grid}>
              {filteredProcedures.map((p) => (
                <ProcedureCard
                  key={p.slug}
                  proc={p}
                  onOpen={() => navigate(`/resources/procedures/${p.slug}`)}
                />
              ))}
            </div>
          )
        ) : loading ? (
          <div style={S.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 && search ? (
          <div style={S.empty}>
            <p style={S.emptyIcon}>🔍</p>
            <p style={S.emptyText}>No resources match "{search}"</p>
            <button style={S.clearSearchBtn} onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div style={S.grid}>
            {filtered.map((item, i) => (
              <ResourceCard key={i} item={item} />
            ))}
          </div>
        )}

        {!search && !loading && !isProcedures && (
          <p style={S.footNote}>
            Locked items will be available once uploaded to the file store. To
            contribute resources, reach out to the council or open a PR on
            GitHub.
          </p>
        )}
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: C.offWhite,
    padding: "104px 24px 80px",
    fontFamily: "'Inter', system-ui, sans-serif",
    position: "relative",
    color: C.ink,
  },

  wakeToast: {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 200,
    background: C.navyDeep,
    color: C.white,
    borderRadius: 10,
    padding: "12px 20px",
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 4px 20px rgba(13,27,62,0.25)",
  },
  staleBanner: {
    background: "#fde9c0",
    color: C.navyDeep,
    borderRadius: 8,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 24,
  },

  pageHeader: {
    maxWidth: 1100,
    margin: "0 auto 32px",
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
  },
  backBtn: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: C.navyMid,
    marginTop: 6,
    flexShrink: 0,
    fontFamily: "inherit",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.orange,
    margin: "0 0 6px",
  },
  pageH1: {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    letterSpacing: -1,
    color: C.navyDeep,
    margin: "0 0 8px",
  },
  pageSubtitle: {
    fontSize: 15,
    color: C.textMuted,
    margin: 0,
    lineHeight: 1.6,
  },

  searchWrap: {
    maxWidth: 1100,
    margin: "0 auto 28px",
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 14,
    fontSize: 15,
    pointerEvents: "none",
  },
  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "12px 44px",
    fontSize: 14,
    color: C.navyDeep,
    background: C.white,
    outline: "none",
    fontFamily: "inherit",
  },
  clearBtn: {
    position: "absolute",
    right: 14,
    background: "none",
    border: "none",
    fontSize: 14,
    color: C.textDim,
    cursor: "pointer",
    padding: 4,
  },

  tabsWrap: {
    maxWidth: 1100,
    margin: "0 auto 32px",
    borderBottom: `1px solid ${C.border}`,
    overflowX: "auto",
  },
  tabs: { display: "flex", gap: 0, minWidth: "max-content" },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: "12px 20px",
    fontSize: 13,
    fontWeight: 600,
    color: C.textMuted,
    cursor: "pointer",
    whiteSpace: "nowrap",
    marginBottom: -1,
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "inherit",
  },
  tabActive: { color: C.navyDeep, borderBottomColor: C.orange },
  tabCount: {
    background: C.border,
    color: C.textMuted,
    borderRadius: 20,
    padding: "1px 7px",
    fontSize: 11,
    fontWeight: 700,
  },
  tabCountActive: { background: "#fde9c0", color: "#a06210" },

  container: { maxWidth: 1100, margin: "0 auto" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 20,
  },

  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    boxShadow: "0 2px 8px rgba(13,27,62,0.04)",
  },
  cardLocked: { opacity: 0.6 },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardArrow: { fontSize: 16, color: C.textDim },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: C.navyDeep,
    margin: "0 0 8px",
    lineHeight: 1.35,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 1.65,
    color: C.textMuted,
    margin: "0 0 16px",
    flexGrow: 1,
  },
  cardError: { fontSize: 12, color: "#dc2626", margin: "0 0 8px" },
  cardBtn: {
    display: "inline-block",
    alignSelf: "flex-start",
    background: C.navyDeep,
    color: C.white,
    borderRadius: 7,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
    cursor: "pointer",
    border: "none",
    fontFamily: "inherit",
  },
  cardBtnDisabled: { opacity: 0.5, pointerEvents: "none" },

  tag: {
    display: "inline-block",
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
  },

  skeletonCard: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    padding: "22px 20px",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  skeletonLine: {
    background: "#dce3f0",
    borderRadius: 6,
    display: "block",
  },

  empty: { textAlign: "center", padding: "60px 24px" },
  emptyIcon: { fontSize: 36, margin: "0 0 12px" },
  emptyText: { fontSize: 15, color: C.textMuted, margin: "0 0 20px" },
  clearSearchBtn: {
    background: C.navyDeep,
    color: C.white,
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  footNote: {
    fontSize: 12,
    color: C.textDim,
    lineHeight: 1.7,
    textAlign: "center",
    maxWidth: 560,
    margin: "36px auto 0",
  },
};