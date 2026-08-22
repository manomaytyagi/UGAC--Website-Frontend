import { useState, useEffect } from "react";
import { apiFetch } from "../lib/apiBridge";
import { COLORS as C } from "../styles/colors.js";
import "../styles/EventsPage.css";

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
  upcoming: [],
  past: [],
};

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function getDay(iso)   { return new Date(iso).getDate(); }
function getMonth(iso) { return new Date(iso).toLocaleString("en-IN", { month: "short" }).toUpperCase(); }
function getYear(iso)  { return new Date(iso).getFullYear(); }

function useIsMobile(bp = 640) {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= bp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  return mobile;
}

function toYouTubeEmbed(url) {
  if (!url) return "";
  const params = "playsinline=1&rel=0&modestbranding=1";
  const join = (base) => (base.includes("?") ? `${base}&${params}` : `${base}?${params}`);
  try {
    if (url.includes("/embed/")) return join(url);
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else id = u.searchParams.get("v") || "";
    if (!id) id = url;
    return join(`https://www.youtube.com/embed/${id}`);
  } catch {
    return join(`https://www.youtube.com/embed/${url}`);
  }
}

function toCanvaEmbed(url) {
  if (!url) return "";
  if (url.includes("?embed") || url.includes("&embed")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}embed`;
}

function EventBanner({ bannerKey, title, variant = "full" }) {
  // "full"  — natural height, used by the upcoming cards.
  // "cover" — fills its container and crops, used by the past archive cards.
  const isCover = variant === "cover";
  // If the value is already a full URL, use it directly as the image.
  const isDirectUrl = typeof bannerKey === "string" && /^https?:\/\//.test(bannerKey);

  const [url, setUrl] = useState(isDirectUrl ? bannerKey : null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!bannerKey || isDirectUrl) return;          // skip the API call for direct URLs
    apiFetch(`/api/v1/events/banner?key=${encodeURIComponent(bannerKey)}`, null)
      .then(res => { if (res?.data?.url) setUrl(res.data.url); })
      .catch(() => {});
  }, [bannerKey, isDirectUrl]);

  if (!url || err) {
    return (
      <div
        className={isCover ? "uc-past-fill uc-past-ph" : ""}
        style={isCover ? undefined : S.bannerPlaceholder}
      >
        <span style={isCover ? undefined : S.bannerPlaceholderText} className={isCover ? "uc-past-ph-text" : ""}>
          {title.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <img
      src={url} alt={title}
      onError={() => setErr(true)}
      loading="lazy"
      className={isCover ? "uc-past-fill" : ""}
      style={isCover ? undefined : S.bannerImg}
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
  const isPast = new Date(event.date) < new Date();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const overlayVisible = isMobile ? open : hovered;

  return (
    <div
      style={S.upCard}
      tabIndex={0}
      onMouseEnter={() => !isMobile && setHovered(true)}
      onMouseLeave={() => !isMobile && setHovered(false)}
    >
      {/* Full-bleed banner — sizes to image intrinsic height */}
      <div style={S.upMedia}>
        <EventBanner bannerKey={event.banner_key} title={event.title} />
        <div style={S.upTopScrim} />
      </div>

      {/* Mobile: tap-to-reveal button sitting on top of the image */}
      {isMobile && !open && (
        <button style={S.upMobileBtn} onClick={() => setOpen(true)}>
          View Details
        </button>
      )}

      {/* Always-visible: date badge */}
      <div style={S.dateBadge}>
        <span style={S.dateBadgeDay}>{getDay(event.date)}</span>
        <span style={S.dateBadgeMonth}>{getMonth(event.date)}</span>
      </div>

      {/* Always-visible: audience badge */}
      {event.audience && (
        <span style={S.audienceBadge}>{event.audience}</span>
      )}

      {/* Overlay: slides up on hover (desktop) or tap (mobile) */}
      <div style={{
        ...S.upOverlay,
        transform: overlayVisible ? "translateY(0)" : "translateY(100%)",
      }}>
        {isMobile && (
          <button
            style={S.upCloseBtn}
            onClick={() => setOpen(false)}
            aria-label="Hide details"
          >✕</button>
        )}
        <h3 style={S.upTitle}>{event.title}</h3>
        <p style={S.upDesc}>{event.desc}</p>

        <div style={S.upMeta}>
          {event.time  && <span style={S.upMetaItem}> {event.time}</span>}
          {event.venue && <span style={S.upMetaItem}> {event.venue}</span>}
          <span style={S.upMetaItem}> {formatDate(event.date)}</span>
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

function PastEventCard({ event, onOpen }) {
  const ts = tagStyle(event.tag);
  const hasVideo = !!event.youtube_url;
  const hasCanva = !!event.canva_url;
  const docCount = event.documents ? event.documents.length : 0;
  const hasDetails = hasVideo || hasCanva || docCount > 0;

  return (
    <article className="uc-past-card">
      {/* Media panel — the same banner the upcoming cards use */}
      <div className="uc-past-media">
        <EventBanner bannerKey={event.banner_key} title={event.title} variant="cover" />
        <div className="uc-past-scrim" />

        <div className="uc-past-date">
          <span className="uc-past-date-day">{getDay(event.date)}</span>
          <span className="uc-past-date-month">{getMonth(event.date)}</span>
          <span className="uc-past-date-year">{getYear(event.date)}</span>
        </div>

        {/* Chips say what survives from the event, not what it was */}
        {hasDetails && (
          <div className="uc-past-chips">
            {hasVideo && <span className="uc-past-chip">▶ Recording</span>}
            {hasCanva && <span className="uc-past-chip">🖼 Slides</span>}
            {docCount > 0 && (
              <span className="uc-past-chip">📎 {docCount} {docCount === 1 ? "file" : "files"}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="uc-past-body">
        <div className="uc-past-head">
          <h3 className="uc-past-title">{event.title}</h3>
          <span className="uc-past-tag" style={{ background: ts.bg, color: ts.color }}>
            {event.tag}
          </span>
        </div>

        {event.desc && <p className="uc-past-desc">{event.desc}</p>}

        <div className="uc-past-meta">
          {event.venue && <span className="uc-past-pill"> {event.venue}</span>}
          {event.audience && <span className="uc-past-pill"> {event.audience}</span>}
          <span className="uc-past-pill"> {formatDate(event.date)}</span>
        </div>

        <div className="uc-past-actions">
          {hasDetails && (
            <button className="uc-past-btn uc-past-btn-primary" onClick={() => onOpen(event)}>
              View details →
            </button>
          )}
          {event.report_key && <ReportDownload fileKey={event.report_key} className="uc-past-btn uc-past-btn-ghost" />}
        </div>
      </div>
    </article>
  );
}

function PastCardSkeleton() {
  return (
    <div className="uc-past-card uc-past-skel" aria-hidden="true">
      <div className="uc-past-media" />
      <div className="uc-past-body">
        <div className="uc-skel-bar" style={{ width: "62%", height: 16 }} />
        <div className="uc-skel-bar" style={{ width: "94%", height: 11 }} />
        <div className="uc-skel-bar" style={{ width: "80%", height: 11 }} />
        <div className="uc-skel-bar" style={{ width: "34%", height: 28, marginTop: 8, borderRadius: 8 }} />
      </div>
    </div>
  );
}

function EventDetailsModal({ event, onClose }) {
  const isMobile = useIsMobile();
  const hasVideo = !!event.youtube_url;
  const hasCanva = !!event.canva_url;
  const docs     = event.documents || [];

  // Only one medium is shown at a time. Default to the video when present.
  const [mediaTab, setMediaTab] = useState(hasVideo ? "video" : "canva");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div style={S.modalBackdrop} onClick={onClose}>
      <div
        style={S.modalBox}
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
      >
        {/* Header */}
        <div style={S.modalHeader}>
          <div style={{ minWidth: 0 }}>
            <p style={S.modalEyebrow}>{getMonth(event.date)} {getDay(event.date)} · {event.tag}</p>
            <h2 style={S.modalTitle}>{event.title}</h2>
          </div>
          <button style={S.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Toggle — only when both media exist (one visible at a time) */}
        {hasVideo && hasCanva && (
          <div style={S.mediaToggle}>
            <button
              style={{ ...S.mediaToggleBtn, ...(mediaTab === "video" ? S.mediaToggleActive : {}) }}
              onClick={() => setMediaTab("video")}
            >▶ Recording</button>
            <button
              style={{ ...S.mediaToggleBtn, ...(mediaTab === "canva" ? S.mediaToggleActive : {}) }}
              onClick={() => setMediaTab("canva")}
            >🖼 Slides</button>
          </div>
        )}

        {/* Media area */}
        <div style={S.mediaArea}>
          {mediaTab === "video" && hasVideo && (
            <div style={S.embedWrap}>
              <iframe
                style={S.embedFrame}
                src={toYouTubeEmbed(event.youtube_url)}
                title={`${event.title} — recording`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          )}

          {mediaTab === "canva" && hasCanva && (
            isMobile ? (
              <a
                href={event.canva_url}
                target="_blank" rel="noopener noreferrer"
                style={S.canvaLinkBtn}
              >
                🖼 Open slides in Canva ↗
              </a>
            ) : (
              <div style={S.embedWrap}>
                <iframe
                  style={S.embedFrame}
                  src={toCanvaEmbed(event.canva_url)}
                  title={`${event.title} — slides`}
                  allow="fullscreen"
                  allowFullScreen
                />
              </div>
            )
          )}
        </div>

        {/* Documents & links */}
        {docs.length > 0 && (
          <div style={S.docsSection}>
            <p style={S.docsHeading}>Documents &amp; Links</p>
            <div style={S.docsList}>
              {docs.map((d, i) => (
                <a
                  key={i} href={d.url}
                  target="_blank" rel="noopener noreferrer"
                  style={S.docLink}
                >
                  📎 {d.label} ↗
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDownload({ fileKey, className = "" }) {
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
    <>
      <a
        href="#"
        onClick={handleClick}
        className={className}
        style={className ? { opacity: fetching ? 0.5 : 1 } : { ...S.reportBtn, opacity: fetching ? 0.5 : 1 }}
      >
        {fetching ? "⏳ Fetching…" : "📄 Download report"}
      </a>
      {err && <span className="uc-past-err">{err}</span>}
    </>
  );
}
export default function EventsPage({ onBack }) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [usingFallback, setFallback]  = useState(false);
  const [apiWaking, setApiWaking]     = useState(false);
  const [activeTab, setActiveTab]     = useState("upcoming");
  const [filterTag, setFilterTag]     = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  // Filters now apply to PAST events only, so the tag list is built from past events.
  const pastTags = ["All", ...new Set(past.map(e => e.tag))];

  const filteredUpcoming = upcoming;                                  // no filter on upcoming
  const filteredPast     = past.filter(e => filterTag === "All" || e.tag === filterTag);

  return (
    <div className="uc-events" style={{ ...S.page, ...cssVars }}>

      {/* Wake toast */}
      {apiWaking && <div style={S.wakeToast}>⏳ API is waking up, please wait…</div>}
      {usingFallback && !loading && (
        <div style={S.staleBanner}>📋 Showing cached data — live data is loading</div>
      )}

      {/* Header */}
      <div style={S.pageHeader}>
        <button style={S.backBtn} onClick={onBack} aria-label="Back">←</button>
        <div style={S.headerText}>
          <p style={S.eyebrow}>UGAC · IIT Mandi</p>
          <h1 style={S.pageH1}>Events</h1>
          <p style={S.pageSubtitle}>
            Open forums, workshops, surveys, and launches — what we're organising for you.
          </p>
        </div>
      </div>

      {/* Tag filter — PAST events only */}
      {activeTab === "past" && (
        <div style={S.filterRow}>
          {pastTags.map(tag => (
            <button key={tag}
              style={{ ...S.filterBtn, ...(filterTag === tag ? S.filterBtnActive : {}) }}
              onClick={() => setFilterTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

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
              <p style={S.emptyText}>No upcoming events right now.</p>
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
            <div className="uc-past-list">
              {Array.from({ length: 3 }).map((_, i) => <PastCardSkeleton key={i} />)}
            </div>
          ) : filteredPast.length === 0 ? (
            <div style={S.empty}>
              <p style={S.emptyIcon}>📜</p>
              <p style={S.emptyText}>
                {filterTag === "All"
                  ? "Nothing archived yet -past events show up here once they're done."
                  : `No past events tagged "${filterTag}". Try another filter.`}
              </p>
            </div>
          ) : (
            <div className="uc-past-list">
              {filteredPast.map(e => <PastEventCard key={e.id} event={e} onOpen={setSelectedEvent} />)}
            </div>
          )
        )}

      </div>

      {/* View Details popup */}
      {selectedEvent && (
        <EventDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

/* The past-events section is styled in EventsPage.css so it can use hover,
   media queries and line clamping. These vars hand the JS colour tokens to
   that stylesheet, so the palette still has a single source of truth. */
const cssVars = {
  "--uc-navy-deep": C.navyDeep,
  "--uc-navy-mid":  C.navyMid,
  "--uc-orange":    C.orange,
  "--uc-white":     C.white,
  "--uc-off-white": C.offWhite,
  "--uc-border":    C.border,
  "--uc-text-muted": C.textMuted,
  "--uc-text-dim":   C.textDim,
};

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
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 18,
  },
  headerText: { width: "100%" },
  backBtn: {
    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
    width: 40, height: 40, padding: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 19, fontWeight: 700, lineHeight: 1,
    color: C.navyMid, flexShrink: 0, fontFamily: "inherit",
    boxShadow: "0 1px 3px rgba(13,27,62,0.06)",
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: 2.5,
    textTransform: "uppercase", color: C.orange, margin: "0 0 8px",
  },
  pageH1: {
    fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800,
    letterSpacing: -1, color: C.navyDeep, margin: "0 0 10px", lineHeight: 1.1,
  },
  pageSubtitle: { fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 560, lineHeight: 1.6 },

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
    alignItems: "start",
  },
  card: {
    background: C.white, border: `1px solid ${C.border}`,
    borderRadius: 14, overflow: "hidden",
    boxShadow: "0 2px 12px rgba(13,27,62,0.06)",
    display: "flex", flexDirection: "column",
  },

  /* ── Upcoming card: image-only until hover ───────────────── */
  upCard: {
    position: "relative",
    border: `1px solid ${C.border}`,
    borderRadius: 14,
    overflow: "hidden",
    background: C.navyDeep,
    boxShadow: "0 2px 12px rgba(13,27,62,0.06)",
    transition: "box-shadow 0.25s ease",
    cursor: "default",
    display: "flex",
    flexDirection: "column",
  },
  upMedia: { position: "relative", width: "100%", flexShrink: 0 },
  upTopScrim: {
    position: "absolute", top: 0, left: 0, right: 0, height: 90,
    background: "linear-gradient(to bottom, rgba(13,27,62,0.35), rgba(13,27,62,0))",
    pointerEvents: "none",
  },
  audienceBadge: {
    position: "absolute", top: 12, right: 12, zIndex: 2,
    background: "rgba(13,27,62,0.9)", color: C.white,
    borderRadius: 6, padding: "5px 10px",
    fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
  },
  upMobileBtn: {
    position: "absolute", bottom: 12, right: 12, zIndex: 3,
    background: "rgba(13,27,62,0.78)", color: C.white,
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 8, padding: "7px 14px",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    fontFamily: "inherit",
    backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
  },
  upCloseBtn: {
    position: "absolute", top: 10, right: 10, zIndex: 4,
    width: 28, height: 28, borderRadius: 8,
    background: "rgba(255,255,255,0.16)", color: C.white,
    border: "1px solid rgba(255,255,255,0.3)",
    fontSize: 13, lineHeight: 1, cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  upOverlay: {
    position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 2,
    padding: "18px 18px 20px",
    background: "linear-gradient(to top, rgba(13,27,62,0.97) 60%, rgba(13,27,62,0))",
    display: "flex", flexDirection: "column",
    transform: "translateY(100%)",
    transition: "transform 0.3s ease",
  },
  upTitle: { fontSize: 16, fontWeight: 800, color: C.white, margin: "0 0 8px", lineHeight: 1.3 },
  upDesc:  { fontSize: 12.5, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", margin: "0 0 12px" },
  upMeta:  { display: "flex", flexWrap: "wrap", gap: "4px 14px", marginBottom: 4 },
  upMetaItem: { fontSize: 11.5, color: "rgba(255,255,255,0.7)", fontWeight: 500 },

  bannerImg: { width: "100%", height: "auto", display: "block" },
  bannerPlaceholder: {
    width: "100%", height: 220,
    background: `linear-gradient(135deg, ${C.navyDeep}, ${C.navyMid})`,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  bannerPlaceholderText: {
    fontSize: 36, fontWeight: 800, color: "rgba(255,255,255,0.15)",
    letterSpacing: -1,
  },
  dateBadge: {
    position: "absolute", top: 12, left: 12, zIndex: 2,
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
    marginTop: 10,
  },

  reportBtn: {
    display: "inline-block",
    background: "none", border: `1px solid ${C.border}`,
    borderRadius: 7, padding: "6px 14px",
    fontSize: 12, fontWeight: 700, color: C.navyMid, textDecoration: "none", cursor: "pointer",
  },

  /* ── Details modal ───────────────────────────────────────── */
  modalBackdrop: {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(13,27,62,0.55)",
    display: "flex", alignItems: "flex-start", justifyContent: "center",
    padding: "48px 16px", overflowY: "auto",
  },
  modalBox: {
    background: C.white, borderRadius: 16, width: "100%", maxWidth: 760,
    boxShadow: "0 20px 60px rgba(13,27,62,0.35)",
    display: "flex", flexDirection: "column",
    animation: "rise 0.25s ease",
  },
  modalHeader: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    gap: 16, padding: "22px 24px 16px",
  },
  modalEyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
    textTransform: "uppercase", color: C.orange, margin: "0 0 6px",
  },
  modalTitle: { fontSize: 20, fontWeight: 800, color: C.navyDeep, margin: 0, letterSpacing: -0.4, lineHeight: 1.3 },
  modalClose: {
    flexShrink: 0, width: 34, height: 34, borderRadius: 9,
    border: `1px solid ${C.border}`, background: C.white, color: C.textMuted,
    fontSize: 14, cursor: "pointer", fontFamily: "inherit", lineHeight: 1,
  },
  mediaToggle: { display: "flex", gap: 6, padding: "0 24px 14px" },
  mediaToggleBtn: {
    background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "8px 16px", fontSize: 13, fontWeight: 700, color: C.textMuted,
    cursor: "pointer", fontFamily: "inherit",
  },
  mediaToggleActive: { background: C.navyDeep, color: C.white, borderColor: C.navyDeep },
  mediaArea: { padding: "0 24px" },
  embedWrap: {
    position: "relative", width: "100%", paddingTop: "56.25%",
    background: "#000", borderRadius: 12, overflow: "hidden",
  },
  embedFrame: { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" },
  canvaLinkBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: C.orange, color: C.white, textDecoration: "none",
    borderRadius: 12, padding: "20px", fontSize: 14, fontWeight: 700,
  },
  docsSection: { padding: "18px 24px 24px" },
  docsHeading: {
    fontSize: 12, fontWeight: 700, letterSpacing: 1,
    textTransform: "uppercase", color: C.textDim, margin: "0 0 10px",
  },
  docsList: { display: "flex", flexDirection: "column", gap: 8 },
  docLink: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: C.offWhite, border: `1px solid ${C.border}`, borderRadius: 8,
    padding: "10px 14px", fontSize: 13, fontWeight: 600, color: C.navyMid,
    textDecoration: "none",
  },

  empty: { textAlign: "center", padding: "60px 0" },
  emptyIcon: { fontSize: 36, margin: "0 0 12px" },
  emptyText: { fontSize: 15, color: C.textMuted, margin: 0 },
};