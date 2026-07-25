import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/apiBridge";
import "../styles/AnnouncementsPage.css";

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Category palette — keeps every card colourful but within the site's forest/teal/orange family.
const CATEGORY_META = {
  academic:     { color: "#0f766e", bg: "rgba(15, 118, 110, 0.12)" },   // teal
  exam:         { color: "#b03a42", bg: "rgba(176, 58, 66, 0.12)" },    // red
  event:        { color: "#1d4ed8", bg: "rgba(29, 78, 216, 0.12)" },    // blue
  admission:    { color: "#7e22ce", bg: "rgba(126, 34, 206, 0.12)" },   // purple
  general:      { color: "#d18a3e", bg: "rgba(209, 138, 62, 0.14)" },   // gold
  holiday:      { color: "#15803d", bg: "rgba(21, 128, 61, 0.12)" },    // green
  notice:       { color: "#cf7d0f", bg: "rgba(207, 125, 15, 0.14)" },   // amber
  placement:    { color: "#37548f", bg: "rgba(55, 84, 143, 0.12)" },    // navy
};
const DEFAULT_META = { color: "#12372a", bg: "rgba(18, 55, 42, 0.10)" };

const catMeta = (cat) => {
  const key = (cat || "").toString().trim().toLowerCase();
  return CATEGORY_META[key] || DEFAULT_META;
};
const catLabel = (cat) => {
  const k = (cat || "").toString().trim();
  return k && k.length ? k.charAt(0).toUpperCase() + k.slice(1) : "Notice";
};

const BELL = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const SEARCH = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const LINK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

function formatDate(iso) {
  if (!iso) return null;
  const s = String(iso).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return { day: dt.getDate(), mon: MON[dt.getMonth()], year: dt.getFullYear(), full: dt };
}
function timeAgo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return null;
}

function AnnouncementCard({ a, onOpen }) {
  const m = catMeta(a.category);
  const d = formatDate(a.publishedAt);
  const ago = timeAgo(a.publishedAt);
  return (
    <button
      type="button"
      className="ann-card"
      style={{ "--cat": m.color, "--cat-bg": m.bg }}
      onClick={() => onOpen(a)}
    >
      <div className="ann-card__top">
        <span className="ann-tag">{catLabel(a.category)}</span>
      </div>

      <span className="ann-card__date">
        {d ? <><b>{d.day}</b> {d.mon} {d.year}</> : "Recently"}
        {ago ? ` · ${ago}` : ""}
      </span>

      <h3 className="ann-card__title">{a.title}</h3>
      {a.content && <p className="ann-card__body">{a.content}</p>}

      <div className="ann-card__foot">
        <span className="ann-card__read">Read more →</span>
        {a.attachmentUrl && <span className="ann-card__attach">{LINK} Attachment</span>}
      </div>
    </button>
  );
}

function AnnouncementModal({ a, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const m = catMeta(a.category);
  const d = formatDate(a.publishedAt);
  return (
    <div className="ann-modal__overlay" onClick={onClose}>
      <div
        className="ann-modal"
        style={{ "--cat": m.color, "--cat-bg": m.bg }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={a.title}
      >
        <div className="ann-modal__hero">
          <button className="ann-modal__close" onClick={onClose} aria-label="Close">✕</button>
          <div className="ann-modal__tagrow">
            <span className="ann-tag">{catLabel(a.category)}</span>
          </div>
          {d && <span className="ann-modal__date">{d.day} {d.mon} {d.year}</span>}
          <h2 className="ann-modal__title">{a.title}</h2>
        </div>
        <div className="ann-modal__body">
          {a.content || "No additional details were provided for this announcement."}
          {a.attachmentUrl && (
            <div className="ann-modal__attach">
              <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer">
                {LINK} Open attachment
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await apiFetch("/api/v1/announcements", []);
      if (!alive) return;
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  // Category chips derived from the data, with counts.
  const categories = useMemo(() => {
    const counts = {};
    announcements.forEach((a) => {
      const k = catLabel(a.category);
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ label, count }));
  }, [announcements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      const catOk = activeCat === "all" || catLabel(a.category) === activeCat;
      const qOk = !q ||
        a.title.toLowerCase().includes(q) ||
        (a.content || "").toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [announcements, search, activeCat]);

  const closeModal = useCallback(() => setOpenItem(null), []);

  return (
    <div className="ann-page">
      {/* Hero */}
      <header className="ann-hero">
        <div className="ann-hero__inner">
          <button className="ann-back" type="button" onClick={() => navigate("/")}>
            ← Back to home
          </button>
         <h1 className="ann-hero__title">Announcements</h1>
   
        </div>
      </header>

      {/* Controls */}
      <div className="ann-controls">
        <div className="ann-search">
          <span className="ann-search__icon" aria-hidden="true">{SEARCH}</span>
          <input
            className="ann-search__input"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search announcements"
          />
          {search && (
            <button className="ann-search__clear" onClick={() => setSearch("")} aria-label="Clear search">✕</button>
          )}
        </div>

        <div className="ann-chips">
          <button
            className={`ann-chip ${activeCat === "all" ? "ann-chip--active" : ""}`}
            onClick={() => setActiveCat("all")}
          >
            All <span className="ann-chip__count">{announcements.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.label}
              className={`ann-chip ${activeCat === c.label ? "ann-chip--active" : ""}`}
              onClick={() => setActiveCat(c.label)}
            >
              {c.label} <span className="ann-chip__count">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="ann-container">
        {loading ? (
          <div className="ann-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="ann-skeleton" key={i}>
                <div className="ann-skeleton__line" style={{ width: "30%", height: 16 }} />
                <div className="ann-skeleton__line" style={{ width: "80%" }} />
                <div className="ann-skeleton__line" style={{ width: "95%", height: 22, marginBottom: 16 }} />
                <div className="ann-skeleton__line" style={{ width: "90%", height: 11 }} />
                <div className="ann-skeleton__line" style={{ width: "70%", height: 11 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="ann-empty">
            <p className="ann-empty__icon">🔔</p>
            <h3 className="ann-empty__title">
              {announcements.length === 0 ? "No announcements yet" : "Nothing matches your search"}
            </h3>
            <p className="ann-empty__text">
              {announcements.length === 0
                ? "The council hasn't posted anything yet. Check back soon — fresh notices land here as they're published."
                : "Try a different keyword or clear the filters to see everything."}
            </p>
            {(search || activeCat !== "all") && (
              <button
                className="ann-empty__btn"
                onClick={() => { setSearch(""); setActiveCat("all"); }}
              >
                Reset filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="ann-grid">
              {filtered.map((a) => (
                <AnnouncementCard key={a.id} a={a} onOpen={setOpenItem} />
              ))}
            </div>
          </>
        )}

      
      </div>

      {openItem && <AnnouncementModal a={openItem} onClose={closeModal} />}
    </div>
  );
}
