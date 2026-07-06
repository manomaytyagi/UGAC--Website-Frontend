import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Homepage.css";
import { apiFetch, resourcesApi } from "../lib/apiBridge";

const ARROW = "\u2192";
const HORIZON_DAYS = 7;
const MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const TAG_COLOR = { Circular: "var(--c-blue)", Form: "var(--c-green)", Minutes: "var(--c-navy)", Notice: "var(--c-gold)" };

const daysFromNow = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayDiff = (s) => {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  return Math.round((parseDate(s) - a) / 86400000);
};

/* ---- Demo data. Replace with live data from your backend. ---- */

const NOTIFICATIONS_FALLBACK = [
  { id: "f1", date: daysFromNow(-1),  tag: "Circular", title: "Mid-semester examination schedule released", isNew: true },
  { id: "f2", date: daysFromNow(-4),  tag: "Form",     title: "Branch change application 2025–26 is now open", isNew: true },
  { id: "f3", date: daysFromNow(-9),  tag: "Minutes",  title: "Academic Senate meeting — August minutes published" },
  { id: "f4", date: daysFromNow(-15), tag: "Circular", title: "Add / drop window closes 20 August" },
  { id: "f5", date: daysFromNow(-22), tag: "Notice",   title: "Revised academic calendar for the monsoon term" },
];

// Map an apiBridge announcement -> the shape this notice board renders.
const NEW_WINDOW_DAYS = 14;
function mapAnnouncement(a) {
  const date = a.publishedAt ? String(a.publishedAt).slice(0, 10) : null;
  const recent = date ? dayDiff(date) >= -NEW_WINDOW_DAYS : false;
  return {
    id: a.id,
    title: a.title,
    tag: a.category || "Notice",
    date,
    url: a.attachmentUrl || null,
    isNew: Boolean(a.isPinned) || recent,
  };
}

const REGISTER = [
  { code: "NTC \u00B7 Notices", title: "Notifications", to: "#notifications", acc: "var(--c-blue)",
    desc: "Minutes of meetings, circulars, and new forms — everything the council posts for all students." },
  { code: "CRS \u00B7 Courses", title: "Courses", to: "/courses", acc: "var(--c-terra)",
    desc: "The full catalogue by department, with course codes, credits, and student reviews." },
  { code: "CUR \u00B7 Curriculum", title: "Curriculum", to: "/curriculum", acc: "var(--c-green)",
    desc: "B.Tech. structures for every branch and batch, with prerequisite maps you can trace." },
  { code: "RES \u00B7 Resources", title: "Resources", to: "/resources", acc: "var(--c-gold)",
    desc: "Regulations, the academic calendar, forms, useful links, and step-by-step procedures." },
  { code: "COM \u00B7 Community", title: "Community", to: "/community/important-contacts", acc: "var(--c-navy)",
    desc: "Feedback, important contacts, and faculty advisers for every branch and year." },
];

const DOCS_FALLBACK = [
  { title: "UG Academic Regulations 2024", tag: "Document", url: null },
  { title: "Academic Calendar 2025\u201326", tag: "Document", url: null },
  { title: "Grading & Credit Handbook", tag: "Document", url: null },
  { title: "Code of Conduct", tag: "Document", url: null },
];
const PROCEDURES = [
  { t: "Internship Procedure", m: "Guide", to: "/resources/procedures/internships" },
  { t: "Bonafide Certificate", m: "Guide", to: "/resources/procedures/bonafide" },
  { t: "Placement Procedure", m: "Guide", to: "/resources" },
  { t: "Branch change & electives", m: "Guide", to: "/resources" },
];
const LINKS_FALLBACK = [
  { title: "IIT Mandi ERP Portal", tag: "Portal", url: "https://erp.iitmandi.ac.in" },
  { title: "Moodle LMS", tag: "Portal", url: "https://moodle.iitmandi.ac.in" },
  { title: "Library & Digital Resources", tag: "Library", url: "https://library.iitmandi.ac.in" },
  { title: "NPTEL Online Courses", tag: "External", url: "https://nptel.ac.in" },
  { title: "SWAYAM Portal", tag: "External", url: "https://swayam.gov.in" },
];

// Shared renderer for a resource row (documents/portals). Procedures use their
// own static markup with internal <Link> routes, so they don't go through this.
const isExternal = (u) => typeof u === "string" && /^https?:/i.test(u);
function ResItem({ item }) {
  const meta = item.tag + (isExternal(item.url) ? " \u2197" : "");
  return isExternal(item.url) ? (
    <a className="res-item" href={item.url} target="_blank" rel="noopener noreferrer">
      <span className="res-item__t">{item.title}</span><span className="res-item__m">{meta}</span>
    </a>
  ) : (
    <Link className="res-item" to={item.url || "/resources"}>
      <span className="res-item__t">{item.title}</span><span className="res-item__m">{item.tag}</span>
    </Link>
  );
}
const COMMUNITY = [
  { code: "COM.01", title: "Feedback", to: "/community/feedback", acc: "var(--c-blue)",
    desc: "Share academic concerns, suggestions, and issues directly with the council.", cta: "Open the form" },
  { code: "COM.02", title: "Important Contacts", to: "/community/important-contacts", acc: "var(--c-green)",
    desc: "The council team, courses team, and department chairs, all in one place.", cta: "View contacts" },
  { code: "COM.03", title: "Faculty Advisers", to: "/community/faculty-advisers", acc: "var(--c-gold)",
    desc: "Advisers for every branch and year, with direct email and profile links.", cta: "Find your adviser" },
];

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll(".reveal");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  });
  return ref;
}

const scrollToId = (id) => (e) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

export default function Homepage() {
  const ref = useReveal();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);     // mobile Community accordion
  const [commOpen, setCommOpen] = useState(false);   // desktop Community dropdown
  const ddRef = useRef(null);
  const closeMenu = () => { setMenuOpen(false); setSubOpen(false); };

  // Body scroll-lock + Escape-to-close + auto-close when resizing to desktop.
  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
    if (!menuOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    const mq = window.matchMedia("(min-width:641px)");
    const onMq = (ev) => { if (ev.matches) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      document.body.classList.remove("menu-open");
    };
  }, [menuOpen]);

  useEffect(() => { if (!menuOpen) setSubOpen(false); }, [menuOpen]);

  // Desktop Community dropdown: close on outside-click or Escape.
  useEffect(() => {
    if (!commOpen) return undefined;
    const onDoc = (e) => { if (ddRef.current && !ddRef.current.contains(e.target)) setCommOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setCommOpen(false); };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onDoc); document.removeEventListener("keydown", onKey); };
  }, [commOpen]);

  // ---- Live data (announcements / events / resources) with graceful fallback ----
  const [notifications, setNotifications] = useState(NOTIFICATIONS_FALLBACK);
  const [upcoming, setUpcoming] = useState([]);            // event spotlight source
  const [docs, setDocs] = useState(DOCS_FALLBACK);         // Forms & documents
  const [links, setLinks] = useState(LINKS_FALLBACK);      // Portals & external
  // Procedures stay static — see PROCEDURES above.

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ann, ev, docsRes, formsRes, linksRes] = await Promise.all([
          apiFetch("/api/v1/announcements", []),
          apiFetch("/api/v1/events", { upcoming: [], past: [] }),
          resourcesApi.category("documents", DOCS_FALLBACK),
          resourcesApi.category("forms", []),
          resourcesApi.category("links", LINKS_FALLBACK),
        ]);
        if (!alive) return;

        const mapped = (ann.data || []).map(mapAnnouncement);
        if (mapped.length) setNotifications(mapped);

        setUpcoming((ev.data && ev.data.upcoming) || []);

        const merged = [...(docsRes.data || []), ...(formsRes.data || [])];
        if (merged.length) setDocs(merged.slice(0, 6));

        if (linksRes.data && linksRes.data.length) setLinks(linksRes.data);
      } catch {
        /* keep the *_FALLBACK values already in state */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Event spotlight: nearest event inside the 7-day horizon, or none.
  const horizonEvent = useMemo(() => {
    const soon = (upcoming || [])
      .filter((e) => e && e.date)
      .map((e) => ({ e, diff: dayDiff(e.date) }))
      .filter((x) => x.diff >= 0 && x.diff <= HORIZON_DAYS)
      .sort((a, b) => a.diff - b.diff);
    if (!soon.length) return null;
    const { e, diff } = soon[0];
    const d = parseDate(e.date);
    const count = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `In ${diff} days`;
    return { ...e, count, dd: d.getDate(), mon: MON[d.getMonth()], yr: d.getFullYear() };
  }, [upcoming]);

  return (
    <div className="ugac-home" ref={ref}>
      <div className="masthead-rule" />

      <header className="site-head">
        <div className="wrap site-head__in">
          <Link className="brand" to="/" aria-label="UG Academic Council, IIT Mandi — home">
            <span className="brand__mark">UGAC</span>
            <span className="brand__sub">IIT&nbsp;Mandi</span>
          </Link>
          <nav className="nav" aria-label="Primary">
            <Link className="nav__link" to="/team">Team</Link>
            <Link className="nav__link" to="/events">Events</Link>
            <Link className="nav__link" to="/courses">Courses</Link>
            <Link className="nav__link" to="/curriculum">Curriculum</Link>
            <Link className="nav__link" to="/resources">Resources</Link>
            <div className="nav__dd" ref={ddRef} onMouseLeave={() => setCommOpen(false)}>
              <button
                className="nav__link nav__dd-btn"
                type="button"
                aria-haspopup="true"
                aria-expanded={commOpen}
                onClick={() => setCommOpen((o) => !o)}
              >
                Community <span className="nav__caret" aria-hidden="true">{"\u25BE"}</span>
              </button>
              <div className={`nav__menu ${commOpen ? "is-open" : ""}`} role="menu">
                <Link role="menuitem" to="/community/feedback" onClick={() => setCommOpen(false)}>Feedback</Link>
                <Link role="menuitem" to="/community/important-contacts" onClick={() => setCommOpen(false)}>Important Contacts</Link>
                <Link role="menuitem" to="/community/faculty-advisers" onClick={() => setCommOpen(false)}>Faculty Advisers</Link>
              </div>
            </div>
          </nav>
          <button
            className="nav__ham"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobileMenu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="nav__ham-box"><span className="nav__ham-line" /></span>
          </button>
        </div>
      </header>

      <nav
        className={`mobile-menu ${menuOpen ? "is-open" : ""}`}
        id="mobileMenu"
        aria-label="Mobile navigation"
      >
        <span className="eyebrow mobile-menu__eyebrow">Menu</span>
        <Link className="mobile-link" to="/team" style={{ "--acc": "var(--c-navy)" }} onClick={closeMenu}>
          <span className="mm-dot" />Team<span className="mm-arw">{ARROW}</span>
        </Link>
        <Link className="mobile-link" to="/events" style={{ "--acc": "var(--c-terra)" }} onClick={closeMenu}>
          <span className="mm-dot" />Events<span className="mm-arw">{ARROW}</span>
        </Link>
        <Link className="mobile-link" to="/courses" style={{ "--acc": "var(--c-blue)" }} onClick={closeMenu}>
          <span className="mm-dot" />Courses<span className="mm-arw">{ARROW}</span>
        </Link>
        <Link className="mobile-link" to="/curriculum" style={{ "--acc": "var(--c-green)" }} onClick={closeMenu}>
          <span className="mm-dot" />Curriculum<span className="mm-arw">{ARROW}</span>
        </Link>
        <Link className="mobile-link" to="/resources" style={{ "--acc": "var(--c-gold)" }} onClick={closeMenu}>
          <span className="mm-dot" />Resources<span className="mm-arw">{ARROW}</span>
        </Link>
        <button
          className="mobile-link mobile-link--parent"
          type="button"
          aria-expanded={subOpen}
          aria-controls="mSub"
          style={{ "--acc": "var(--c-teal)" }}
          onClick={() => setSubOpen((o) => !o)}
        >
          <span className="mm-dot" />Community<span className="mm-caret" aria-hidden="true">{"\u25BE"}</span>
        </button>
        <div className={`mobile-sub ${subOpen ? "is-open" : ""}`} id="mSub">
          <Link to="/community/feedback" onClick={closeMenu}>Feedback</Link>
          <Link to="/community/important-contacts" onClick={closeMenu}>Important Contacts</Link>
          <Link to="/community/faculty-advisers" onClick={closeMenu}>Faculty Advisers</Link>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero">
          <div className="wrap hero__grid">
            <div>
              <div className="hero__eyebrow eyebrow reveal">UG Academic Council — Student Gymkhana</div>
              <h1 className="reveal">
                Everything academic,<br />
                in one <em>open register.</em>
              </h1>
              <p className="hero__lead reveal">
                The UG Academic Council keeps course information, curriculum structures,
                official documents, and a direct line to the council in a single place —
                built by students, for students at IIT&nbsp;Mandi.
              </p>
              <div className="hero__actions reveal">
                <Link className="btn btn--solid" to="/courses">Browse courses <span className="arw">{ARROW}</span></Link>
                <Link className="btn btn--ghost" to="/community/feedback">Raise a concern <span className="arw">{ARROW}</span></Link>
              </div>
            </div>
            <aside className="ledger reveal" aria-label="Index summary">
              <div className="ledger__top">
                <span className="eyebrow">Index</span>
                <span className="ledger__dot" aria-hidden="true" />
              </div>
              <div className="ledger__row"><span className="ledger__k">Term</span><span className="ledger__v">Monsoon 25–26</span></div>
              <div className="ledger__row"><span className="ledger__k">Branches</span><span className="ledger__v">16</span></div>
              <div className="ledger__row"><span className="ledger__k">Departments</span><span className="ledger__v">12</span></div>
              <div className="ledger__row"><span className="ledger__k">Notices</span><span className="ledger__v">{notifications.length}</span></div>
            </aside>
          </div>
        </section>

        {/* EVENT SPOTLIGHT — only inside the 7-day horizon */}
        {horizonEvent && (
          <div className="wrap spotlight-wrap">
            <div className="spotlight reveal">
              <div>
                <div className="spot__head">
                  <span className="spot__eyebrow">EVT · On the horizon</span>
                  <span className="spot__count">{horizonEvent.count}</span>
                </div>
                <div className="spot__title">{horizonEvent.title}</div>
                <p className="spot__desc">{horizonEvent.desc}</p>
              </div>
              <div className="spot__aside">
                <div className="spot__date"><b>{horizonEvent.dd}</b>{horizonEvent.mon} {horizonEvent.yr}</div>
                <Link className="spot__cta" to="/events">Event details <span className="arw">{ARROW}</span></Link>
              </div>
            </div>
          </div>
        )}

        {/* REGISTER */}
        <section className="section" id="register">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow sec-tag">The register</span>
                <h2>Five sections, one desk.</h2>
              </div>
              <p className="sec-head__aside">Each entry is a classification, not a step. Follow whichever one you need.</p>
            </div>
            <div className="register">
              {REGISTER.map((e) =>
                e.to.startsWith("#") ? (
                  <a className="entry reveal" href={e.to} onClick={scrollToId(e.to.slice(1))} key={e.title} style={{ "--acc": e.acc }}>
                    <span className="entry__code">{e.code}</span>
                    <span className="entry__title">{e.title} <span className="arw">{ARROW}</span></span>
                    <span className="entry__desc">{e.desc}</span>
                  </a>
                ) : (
                  <Link className="entry reveal" to={e.to} key={e.title} style={{ "--acc": e.acc }}>
                    <span className="entry__code">{e.code}</span>
                    <span className="entry__title">{e.title} <span className="arw">{ARROW}</span></span>
                    <span className="entry__desc">{e.desc}</span>
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="section" id="notifications">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow sec-tag">NTC · Notice board</span>
                <h2>Straight from the council.</h2>
              </div>
              <p className="sec-head__aside">Minutes, circulars, and new forms — posted for every undergraduate.</p>
            </div>
            <div className="notif-list reveal">
              {notifications.map((n) => {
                const d = n.date ? parseDate(n.date) : null;
                const ext = isExternal(n.url);
                const inner = (
                  <>
                    <span className="notif__date">{d ? <><b>{d.getDate()}</b> {MON[d.getMonth()]}</> : null}</span>
                    <span className="notif__tag" style={{ "--acc": TAG_COLOR[n.tag] || "var(--c-terra)" }}>{n.tag}</span>
                    <span className="notif__title">{n.title}</span>
                    {n.isNew ? <span className="notif__new">New</span> : <span />}
                  </>
                );
                const key = n.id || n.title;
                return ext ? (
                  <a className="notif" href={n.url} target="_blank" rel="noopener noreferrer" key={key}>{inner}</a>
                ) : (
                  <Link className="notif" to={n.url || "/resources"} key={key}>{inner}</Link>
                );
              })}
            </div>
            <div className="notif__foot reveal">
              <Link to="/resources">See all documents &amp; forms <span className="arw">{ARROW}</span></Link>
            </div>
          </div>
        </section>

        {/* RESOURCES */}
        <section className="section" id="resources">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow sec-tag">RES · Quick links</span>
                <h2>The paperwork, sorted.</h2>
              </div>
              <p className="sec-head__aside">The documents, procedures, and portals students ask for most.</p>
            </div>
            <div className="res-grid">
              <div className="res-col reveal">
                <h3><span className="dot" style={{ "--acc": "var(--c-blue)" }} />Forms &amp; documents</h3>
                {docs.map((d, i) => (
                  <ResItem item={d} key={d.title || i} />
                ))}
              </div>
              <div className="res-col reveal">
                <h3><span className="dot" style={{ "--acc": "var(--c-green)" }} />Procedures</h3>
                {PROCEDURES.map((pr) => (
                  <Link className="res-item" to={pr.to} key={pr.t}>
                    <span className="res-item__t">{pr.t}</span>
                    <span className="res-item__m">{pr.m}</span>
                  </Link>
                ))}
              </div>
              <div className="res-col reveal">
                <h3><span className="dot" style={{ "--acc": "var(--c-gold)" }} />Portals &amp; external</h3>
                {links.map((l, i) => (
                  <ResItem item={l} key={l.title || i} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="section" id="community">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
                <span className="eyebrow sec-tag">COM · Community</span>
                <h2>Talk to the council.</h2>
              </div>
              <p className="sec-head__aside">Three ways to reach the people who can actually act on it.</p>
            </div>
            <div className="comm-grid">
              {COMMUNITY.map((c) => (
                <Link className="comm-card reveal" to={c.to} key={c.title} style={{ "--acc": c.acc }}>
                  <span className="comm-card__code">{c.code}</span>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className="comm-card__go">{c.cta} <span className="arw">{ARROW}</span></span>
                </Link>
              ))}
            </div>
            <div className="comm-note reveal">
              <p className="comm-note__t">
                <strong>Need it to reach someone today?</strong> The feedback desk goes
                straight to the academic secretary team.
              </p>
              <a href="mailto:acad.secy@iitmandi.ac.in">acad.secy@iitmandi.ac.in</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot__in">
          <div className="foot__brand">
            <span className="brand__mark">UG Academic Council</span>
            <p>Student Gymkhana, IIT Mandi. A central portal for academic governance — curriculum, resources, and a direct line to the council.</p>
          </div>
          <div>
            <h4>Sections</h4>
            <div className="foot__links">
              <a href="#notifications" onClick={scrollToId("notifications")}>Notifications</a>
              <Link to="/courses">Courses</Link>
              <Link to="/curriculum">Curriculum</Link>
              <Link to="/resources">Resources</Link>
            </div>
          </div>
          <div>
            <h4>Community</h4>
            <div className="foot__links">
              <Link to="/community/feedback">Feedback</Link>
              <Link to="/community/important-contacts">Important Contacts</Link>
              <Link to="/community/faculty-advisers">Faculty Advisers</Link>
              <a href="mailto:acad.secy@iitmandi.ac.in">acad.secy@iitmandi.ac.in</a>
            </div>
          </div>
        </div>
        <div className="wrap foot__bar">
          <span>© 2026 UG ACADEMIC COUNCIL · IIT MANDI</span>
          <span>BUILT BY STUDENTS, FOR STUDENTS</span>
        </div>
      </footer>
    </div>
  );
}