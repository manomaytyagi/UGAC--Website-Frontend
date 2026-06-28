import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiBridge";
import "../styles/EventsPage.css";

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

const TAG_COLORS = {
  "Open Forum": { bg: "#eff6ff", color: "#1d4ed8" },
  "Launch":     { bg: "#f0fdf4", color: "#15803d" },
  "Survey":     { bg: "#fefce8", color: "#854d0e" },
  "Workshop":   { bg: "#fdf4ff", color: "#7e22ce" },
  "Talk":       { bg: "#fff1f2", color: "#be123c" },
  "Other":      { bg: C.offWhite, color: C.textMuted },
};
const tagStyle = (tag) => TAG_COLORS[tag] || TAG_COLORS["Other"];

const FALLBACK = {
  upcoming: [
    {
      id: "u1", title: "Academic Grievance Open House",
      desc: "An open forum for students to raise academic concerns directly with council members and faculty representatives. All concerns are documented and escalated appropriately.",
      date: "2026-06-28", time: "3:00 PM", venue: "Lecture Hall A",
      tag: "Open Forum", banner_key: null, form_url: null, report_key: null,
    },
    {
      id: "u2", title: "UGAC Website Launch — v1",
      desc: "Official launch of the UGAC website. Live demo walkthrough, feedback collection from students, and recognition of contributors who built the platform.",
      date: "2026-07-05", time: "5:00 PM", venue: "Main Auditorium",
      tag: "Launch", banner_key: null, form_url: null, report_key: null,
    },
    {
      id: "u3", title: "Curriculum Feedback Drive",
      desc: "Structured feedback collection from UG students on the current curriculum, grading policies, and course load. Results will be presented to the Academic Office.",
      date: "2026-07-20", time: null, venue: "Online",
      tag: "Survey", banner_key: null, form_url: null, report_key: null,
    },
    {
      id: "u4", title: "Academic Policy Workshop",
      desc: "Interactive workshop where students learn about academic regulations, promotion criteria, grade appeals, and their rights under the UG Academic Regulations 2024.",
      date: "2026-08-10", time: "2:00 PM", venue: "Seminar Room B",
      tag: "Workshop", banner_key: null, form_url: null, report_key: null,
    },
  ],
  past: [
    {
      id: "p1", title: "Semester Kickoff — Spring 2026",
      desc: "Introduction to UGAC, council structure, and academic resources available to students. Attended by over 200 undergraduate students.",
      date: "2026-01-08", time: "4:00 PM", venue: "Main Auditorium",
      tag: "Talk", banner_key: null, form_url: null, report_key: null,
    },
    {
      id: "p2", title: "Grievance Redressal Session — Jan 2026",
      desc: "Monthly open session for students to raise unresolved academic grievances. 12 concerns were formally logged and escalated.",
      date: "2026-01-25", time: "3:30 PM", venue: "Online",
      tag: "Open Forum", banner_key: null, form_url: null, report_key: null,
    },
    {
      id: "p3", title: "Exam Prep Resources Drive",
      desc: "Distribution of curated past papers, notes, and study resources across all branches ahead of end-semester examinations.",
      date: "2026-04-12", time: null, venue: "Online",
      tag: "Other", banner_key: null, form_url: null, report_key: null,
    },
  ],
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function getDay(iso)   { return new Date(iso).getDate(); }
function getMonth(iso) { return new Date(iso).toLocaleString("en-IN", { month: "short" }).toUpperCase(); }

function EventBanner({ bannerKey, title }) {
  const [url, setUrl]   = useState(null);
  const [err, setErr]   = useState(false);

  useEffect(() => {
    if (!bannerKey) return;
    apiFetch(`/api/v1/events/banner?key=${encodeURIComponent(bannerKey)}`, null)
      .then(res => { if (res?.data?.url) setUrl(res.data.url); })
      .catch(() => {});
  }, [bannerKey]);

  if (!url || err) {
    return (
      <div style={S.bannerPlaceholder}>
        <span style={S.bannerPlaceholderText}>{title.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <img
      src={url} alt={title}
      onError={() => setErr(true)}
      style={S.bannerImg}
    />
  );
}

function EventCardSkeleton() {
  return (
    <div style={{ ...S.card, animation: "pulse 1.5s ease-in-out infinite" }}>
      <div style={{ background: "#dce3f0", height: 140, borderRadius: "12px 12px 0 0" }} />
      <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: "#dce3f0", borderRadius: 5, width: "30%", height: 10 }} />
        <div style={{ background: "#e4e9f2", borderRadius: 5, width: "75%", height: 16 }} />
        <div style={{ background: "#eaecf4", borderRadius: 5, width: "90%", height: 11 }} />
        <div style={{ background: "#eaecf4", borderRadius: 5, width: "60%", height: 11 }} />
      </div>
    </div>
  );
}

function UpcomingCard({ event }) {
  const ts = tagStyle(event.tag);
  const isPast = new Date(event.date) < new Date();

  return (
    <div style={S.card}>
      {/* Banner */}
      <div style={S.bannerWrap}>
        <EventBanner bannerKey={event.banner_key} title={event.title} />
        {/* Date badge */}
        <div style={S.dateBadge}>
          <span style={S.dateBadgeDay}>{getDay(event.date)}</span>
          <span style={S.dateBadgeMonth}>{getMonth(event.date)}</span>
        </div>
        {/* Tag */}
        <span style={{ ...S.cardTag, background: ts.bg, color: ts.color }}>{event.tag}</span>
      </div>

      {/* Body */}
      <div style={S.cardBody}>
        <h3 style={S.cardTitle}>{event.title}</h3>
        <p style={S.cardDesc}>{event.desc}</p>

        <div style={S.cardMeta}>
          {event.time  && <span style={S.metaItem}>🕐 {event.time}</span>}
          {event.venue && <span style={S.metaItem}>📍 {event.venue}</span>}
          <span style={S.metaItem}>📅 {formatDate(event.date)}</span>
        </div>

        {event.form_url && !isPast && (
          <a href={event.form_url} target="_blank" rel="noopener noreferrer" style={S.rsvpBtn}>
            Register / RSVP →
          </a>
        )}
      </div>
    </div>
  );
}

function PastEventRow({ event }) {
  const ts = tagStyle(event.tag);
  return (
    <div style={S.pastRow}>
      {/* Date block */}
      <div style={S.pastDateBlock}>
        <span style={S.pastDay}>{getDay(event.date)}</span>
        <span style={S.pastMonth}>{getMonth(event.date)}</span>
      </div>

      <div style={S.pastDivider} />

      {/* Content */}
      <div style={S.pastContent}>
        <div style={S.pastTopRow}>
          <h3 style={S.pastTitle}>{event.title}</h3>
          <div style={S.pastBadges}>
            <span style={{ ...S.tagSmall, background: ts.bg, color: ts.color }}>{event.tag}</span>
            {event.venue && <span style={S.venuePill}>📍 {event.venue}</span>}
          </div>
        </div>
        <p style={S.pastDesc}>{event.desc}</p>
        {event.report_key && (
          <ReportDownload fileKey={event.report_key} />
        )}
      </div>
    </div>
  );
}

function ReportDownload({ fileKey }) {
  const [fetching, setFetching] = useState(false);
  const [err, setErr]           = useState("");

  const handleClick = async (e) => {
    e.preventDefault();
    setFetching(true);
    setErr("");
    try {
      const res = await apiFetch(
        `/api/v1/resources/presigned?key=${encodeURIComponent(fileKey)}`, null
      );
      if (res?.data?.url) window.open(res.data.url, "_blank", "noopener,noreferrer");
      else setErr("Could not fetch report. Try again.");
    } catch { setErr("Network error."); }
    finally { setFetching(false); }
  };

  return (
    <div>
      <a href="#" onClick={handleClick} style={{ ...S.reportBtn, opacity: fetching ? 0.5 : 1 }}>
        {fetching ? "⏳ Fetching…" : "📄 Download Report"}
      </a>
      {err && <span style={{ fontSize: 11, color: "#dc2626", marginLeft: 8 }}>{err}</span>}
    </div>
  );
}
export default function EventsPage({ onBack }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [usingFallback, setFallback]  = useState(false);
  const [apiWaking, setApiWaking]     = useState(false);
  const [activeTab, setActiveTab]     = useState("upcoming");
  const [filterTag, setFilterTag]     = useState("All");

  useEffect(() => {
    let wakeTimer;
    const load = async () => {
      setLoading(true);
      wakeTimer = setTimeout(() => setApiWaking(true), 4000);
      const res = await apiFetch("/api/v1/events", FALLBACK);
      clearTimeout(wakeTimer);
      setApiWaking(false);
      setData(res.data);
      setFallback(res.source === "fallback");
      setLoading(false);
    };
    load();
    return () => clearTimeout(wakeTimer);
  }, []);

  const upcoming = data?.upcoming || [];
  const past     = data?.past     || [];

  const allTags = ["All", ...new Set([...upcoming, ...past].map(e => e.tag))];

  const filteredUpcoming = upcoming.filter(e => filterTag === "All" || e.tag === filterTag);
  const filteredPast     = past.filter(e => filterTag === "All" || e.tag === filterTag);

  return (
    <div className="uc-events" style={S.page}>

      {/* Wake toast */}
      {apiWaking && <div style={S.wakeToast}>⏳ API is waking up, please wait…</div>}
      {usingFallback && !loading && (
        <div style={S.staleBanner}>📋 Showing cached data — live data is loading</div>
      )}

      {/* Header */}
      <div style={S.pageHeader}>
        <button style={S.backBtn} onClick={onBack}>← Back</button>
        <div>
          <p style={S.eyebrow}>UGAC · IIT Mandi</p>
          <h1 style={S.pageH1}>Events</h1>
          <p style={S.pageSubtitle}>
            Open forums, workshops, surveys, and launches — what we're organising for you.
          </p>
        </div>
      </div>

      {/* Tag filter */}
      <div style={S.filterRow}>
        {allTags.map(tag => (
          <button key={tag}
            style={{ ...S.filterBtn, ...(filterTag === tag ? S.filterBtnActive : {}) }}
            onClick={() => setFilterTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={S.tabsWrap}>
        <div style={S.tabs}>
          {[
            ["upcoming", `Upcoming (${filteredUpcoming.length})`],
            ["past",     `Past (${filteredPast.length})`],
          ].map(([id, label]) => (
            <button key={id}
              style={{ ...S.tab, ...(activeTab === id ? S.tabActive : {}) }}
              onClick={() => setActiveTab(id)}
            >{label}</button>
          ))}
        </div>
      </div>

      <div style={S.container}>
        {/* ── Upcoming ── */}
        {activeTab === "upcoming" && (
          loading ? (
            <div style={S.cardGrid}>
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : filteredUpcoming.length === 0 ? (
            <div style={S.empty}>
              <p style={S.emptyIcon}>📅</p>
              <p style={S.emptyText}>No upcoming events{filterTag !== "All" ? ` tagged "${filterTag}"` : ""}.</p>
            </div>
          ) : (
            <div style={S.cardGrid}>
              {filteredUpcoming.map(e => <UpcomingCard key={e.id} event={e} />)}
            </div>
          )
        )}

        {/* ── Past ── */}
        {activeTab === "past" && (
          loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
            </div>
          ) : filteredPast.length === 0 ? (
            <div style={S.empty}>
              <p style={S.emptyIcon}>📜</p>
              <p style={S.emptyText}>No past events{filterTag !== "All" ? ` tagged "${filterTag}"` : ""}.</p>
            </div>
          ) : (
            <div style={S.pastList}>
              {filteredPast.map(e => <PastEventRow key={e.id} event={e} />)}
            </div>
          )
        )}

      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh", background: C.offWhite,
    padding: "104px 24px 80px",
    fontFamily: "'Inter', system-ui, sans-serif", position: "relative",
    color: C.ink,
  },
  wakeToast: {
    position: "fixed", bottom: 24, right: 24, zIndex: 200,
    background: C.navyDeep, color: C.white, borderRadius: 10,
    padding: "12px 20px", fontSize: 13, fontWeight: 600,
    boxShadow: "0 4px 20px rgba(13,27,62,0.25)",
  },
  staleBanner: {
    background: "#fde9c0", color: C.navyDeep, borderRadius: 8,
    padding: "10px 18px", fontSize: 13, fontWeight: 600, marginBottom: 24,
  },
  pageHeader: {
    maxWidth: 1100, margin: "0 auto 28px",
    display: "flex", alignItems: "flex-start", gap: 20,
  },
  backBtn: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600,
    color: C.navyMid, marginTop: 6, flexShrink: 0, fontFamily: "inherit",
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    textTransform: "uppercase", color: C.orange, marginBottom: 6, margin: "0 0 6px",
  },
  pageH1: {
    fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800,
    letterSpacing: -1, color: C.navyDeep, margin: "0 0 6px",
  },
  pageSubtitle: { fontSize: 14, color: C.textMuted, margin: 0 },

  filterRow: {
    maxWidth: 1100, margin: "0 auto 24px",
    display: "flex", gap: 8, flexWrap: "wrap",
  },
  filterBtn: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 20,
    padding: "7px 16px", fontSize: 12, fontWeight: 600,
    color: C.textMuted, cursor: "pointer", whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  filterBtnActive: {
    background: C.navyDeep, color: C.white, borderColor: C.navyDeep,
  },

  tabsWrap: {
    maxWidth: 1100, margin: "0 auto 32px",
    borderBottom: `1px solid ${C.border}`,
  },
  tabs: { display: "flex", gap: 0 },
  tab: {
    background: "none", border: "none",
    borderBottom: "2px solid transparent",
    padding: "12px 24px", fontSize: 14, fontWeight: 600,
    color: C.textMuted, cursor: "pointer", marginBottom: -1,
    transition: "color 0.15s, border-color 0.15s",
    fontFamily: "inherit",
  },
  tabActive: { color: C.navyDeep, borderBottomColor: C.orange },

  container: { maxWidth: 1100, margin: "0 auto" },

  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 22,
  },
  card: {
    background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 14, overflow: "hidden",
    boxShadow: "0 2px 12px rgba(13,27,62,0.06)",
    display: "flex", flexDirection: "column",
  },

  bannerWrap: { position: "relative", height: 140, flexShrink: 0 },
  bannerImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  bannerPlaceholder: {
    width: "100%", height: "100%",
    background: `linear-gradient(135deg, ${C.navyDeep}, ${C.navyMid})`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  bannerPlaceholderText: {
    fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.15)",
    letterSpacing: -1,
  },
  dateBadge: {
    position: "absolute", top: 12, left: 12,
    background: C.white, borderRadius: 10,
    padding: "6px 10px", display: "flex", flexDirection: "column",
    alignItems: "center", boxShadow: "0 2px 8px rgba(13,27,62,0.15)",
    minWidth: 42,
  },
  dateBadgeDay:   { fontSize: 20, fontWeight: 800, color: C.navyDeep, lineHeight: 1 },
  dateBadgeMonth: { fontSize: 9, fontWeight: 700, color: C.orange, letterSpacing: 1.5, marginTop: 2 },
  cardTag: {
    position: "absolute", top: 12, right: 12,
    borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700,
  },

  cardBody: { padding: "18px 18px", display: "flex", flexDirection: "column", flexGrow: 1 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: C.navyDeep, margin: "0 0 8px", lineHeight: 1.35 },
  cardDesc:  { fontSize: 13, lineHeight: 1.65, color: C.textMuted, margin: "0 0 14px", flexGrow: 1 },
  cardMeta:  { display: "flex", flexDirection: "column", gap: 5, marginBottom: 16 },
  metaItem:  { fontSize: 12, color: C.textDim, fontWeight: 500 },
  rsvpBtn: {
    display: "inline-block", alignSelf: "flex-start",
    background: C.orange, color: C.white, textDecoration: "none",
    borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700,
    marginTop: "auto",
  },

  pastList: { display: "flex", flexDirection: "column", gap: 0 },
  pastRow: {
    display: "flex", alignItems: "flex-start", gap: 24,
    borderTop: `1px solid ${C.border}`, padding: "28px 0",
  },
  pastDateBlock: {
    display: "flex", flexDirection: "column", alignItems: "center",
    background: C.navyDeep, borderRadius: 12, padding: "12px 16px",
    flexShrink: 0, minWidth: 58,
  },
  pastDay:   { fontSize: 24, fontWeight: 800, color: C.white, lineHeight: 1 },
  pastMonth: { fontSize: 10, fontWeight: 700, color: C.orange, letterSpacing: 2, marginTop: 4 },
  pastDivider: { width: 1, alignSelf: "stretch", background: C.border, flexShrink: 0 },
  pastContent: { flex: 1, minWidth: 0 },
  pastTopRow: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: 12, flexWrap: "wrap", marginBottom: 8,
  },
  pastTitle:  { fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: 0 },
  pastBadges: { display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 },
  pastDesc:   { fontSize: 13, lineHeight: 1.7, color: C.textMuted, margin: "0 0 10px" },
  tagSmall: { borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700 },
  venuePill: {
    background: C.offWhite, border: `1px solid ${C.border}`,
    borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 500, color: C.textMuted,
  },
  reportBtn: {
    display: "inline-block",
    background: "none", border: `1px solid ${C.border}`,
    borderRadius: 7, padding: "6px 14px",
    fontSize: 12, fontWeight: 700, color: C.navyMid, textDecoration: "none", cursor: "pointer",
  },

  empty: { textAlign: "center", padding: "60px 0" },
  emptyIcon: { fontSize: 36, margin: "0 0 12px" },
  emptyText: { fontSize: 15, color: C.textMuted, margin: 0 },
};