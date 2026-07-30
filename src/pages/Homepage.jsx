import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Homepage.css";
import { apiFetch, resourcesApi } from "../lib/apiBridge";
import HeroMedia from "../components/HomePage/HeroMedia.jsx";

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
  { code: "01", title: "Notifications", to: "#notifications", acc: "var(--c-blue)",
    desc: "Minutes of meetings, circulars and new forms: everything the council posts for all students." },
  { code: "02", title: "Courses", to: "/courses", acc: "var(--c-terra)",
    desc: "The full catalogue by department, with course codes, credits and student reviews." },
  { code: "03", title: "Curriculum", to: "/curriculum", acc: "var(--c-green)",
    desc: "B.Tech. structures for every branch and batch, with prerequisite maps you can trace." },
  { code: "04", title: "Resources", to: "/resources", acc: "var(--c-gold)",
    desc: "Regulations, the academic calendar, forms, useful links and step-by-step procedures." },
  { code: "05", title: "Faculty Contacts", to: "/faculty-contacts/deans-and-schools", acc: "var(--c-navy)",
    desc: "Feedback, important contacts and faculty advisors for every branch and year." },
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
  { code: "01", title: "Feedback", to: "/faculty-contacts/feedback", acc: "var(--c-blue)",
    desc: "Share academic concerns, suggestions and issues directly with the council.", cta: "Open the form" },
  { code: "02", title: "Deans & Schools", to: "/faculty-contacts/deans-and-schools", acc: "var(--c-green)",
    desc: "The council team, courses team and department chairs, all in one place.", cta: "View contacts" },
  { code: "03", title: "Faculty Advisors", to: "/faculty-contacts/faculty-advisers", acc: "var(--c-gold)",
    desc: "Advisors for every branch and year, with direct email and profile links.", cta: "Find your advisor" },
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
  const [fastNet, setFastNet] = useState(false);

  // ---- Live data (announcements / events / resources) fetched from API ----
  const [notifications, setNotifications] = useState([]);
  const [announcementsFailed, setAnnouncementsFailed] = useState(false);
  const [announcementsRefresh, setAnnouncementsRefresh] = useState(0);
  const [upcoming, setUpcoming] = useState([]);            // event spotlight source
  const [docs, setDocs] = useState(DOCS_FALLBACK);         // Forms & documents
  const [links, setLinks] = useState(LINKS_FALLBACK);      // Portals & external
  const [loading, setLoading] = useState(true);
  // Procedures stay static; see PROCEDURES above.

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setAnnouncementsFailed(false);
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
        setNotifications(mapped);
        setAnnouncementsFailed(ann.source === "fallback");

        setUpcoming((ev.data && ev.data.upcoming) || []);

        const merged = [...(docsRes.data || []), ...(formsRes.data || [])];
        if (merged.length) setDocs(merged.slice(0, 6));

        if (linksRes.data && linksRes.data.length) setLinks(linksRes.data);
      } catch {
        // A failed notice request must never look like a genuine empty board.
        if (alive) setAnnouncementsFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [announcementsRefresh]);

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
      <main>
        {/* HERO */}
        <section className="hero">
          <HeroMedia onFastNet={() => setFastNet(true)} />
          <div className="wrap hero__grid">
            <div className="hero__main">
              <h1 className="reveal">
                UG Academic Council <em>IIT&nbsp;Mandi</em>
              </h1>
              <p className="hero__lead reveal">
                The UG Academic Council keeps course information, curriculum structures,
                official documents and a direct line to the council in a single place,
                built by students, for students at IIT&nbsp;Mandi.
              </p>
            </div>
          </div>
        </section>

        {/* EVENT SPOTLIGHT: only inside the 7-day horizon */}
        {horizonEvent && (
          <div className="wrap spotlight-wrap">
            <div className="spotlight reveal">
              <div>
                <div className="spot__head">
                  <span className="spot__eyebrow">On the horizon</span>
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
           </div>
            <div className="register">
              {REGISTER.map((e) =>
                e.to.startsWith("#") ? (
                  <a className="entry reveal" href={e.to} onClick={scrollToId(e.to.slice(1))} key={e.title} style={{ "--acc": e.acc }}>
                    <h3 className="entry__title">{e.title} <span className="arw">{ARROW}</span></h3>
                    <p className="entry__desc">{e.desc}</p>
                  </a>
                ) : (
                  <Link className="entry reveal" to={e.to} key={e.title} style={{ "--acc": e.acc }}>
                    <h3 className="entry__title">{e.title} <span className="arw">{ARROW}</span></h3>
                    <p className="entry__desc">{e.desc}</p>
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
                <span className="eyebrow sec-tag">Notice board</span>
                <h2>Announcements</h2>
              </div>
             </div>
            {loading ? (
              <div className="notif-list reveal">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div className="notif-skeleton" key={i}>
                    <div className="notif-skeleton__date" />
                    <div className="notif-skeleton__content">
                      <div className="notif-skeleton__line" style={{ width: "30%", height: 11 }} />
                      <div className="notif-skeleton__line" style={{ width: "80%", height: 15 }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : announcementsFailed ? (
              <div className="notif-list notif-error reveal">
                <p className="notif-empty">Announcements are temporarily unavailable.</p>
                <button
                  className="notif-retry"
                  type="button"
                  onClick={() => setAnnouncementsRefresh((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-list reveal" style={{ padding: "18px 20px" }}>
                <p className="notif-empty" style={{ margin: 0 }}>No announcements posted yet.</p>
              </div>
            ) : (
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
            )}
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
                <span className="eyebrow sec-tag">Quick links</span>
                <h2>Resources</h2>
              </div>
            </div>
            <div className="res-grid">
              <div className="res-col reveal">
                <h3><span className="dot" style={{ "--acc": "var(--c-blue)" }} />Forms &amp; documents</h3>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <div className="res-skeleton" key={i} />)
                ) : docs.length === 0 ? (
                  <p className="res-empty">No documents available.</p>
                ) : (
                  docs.map((d, i) => (
                    <ResItem item={d} key={d.title || i} />
                  ))
                )}
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
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <div className="res-skeleton" key={i} />)
                ) : links.length === 0 ? (
                  <p className="res-empty">No portals available.</p>
                ) : (
                  links.map((l, i) => (
                    <ResItem item={l} key={l.title || i} />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="section" id="community">
          <div className="wrap">
            <div className="sec-head reveal">
              <div>
               <h2>Faculty Contacts</h2>
              </div>
           </div>
            <div className="comm-grid">
              {COMMUNITY.map((c) => (
                <Link className="comm-card reveal" to={c.to} key={c.title} style={{ "--acc": c.acc }}>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                  <span className="comm-card__go">{c.cta} <span className="arw">{ARROW}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap foot__in">
          <div className="foot__brand">
            <span className="brand__mark">UG Academic Council</span>
            <p>Student Gymkhana, IIT Mandi. A central portal for academic governance: curriculum, resources and a direct line to the council.</p>
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
            <h4>Faculty Contacts</h4>
            <div className="foot__links">
              <Link to="/faculty-contacts/feedback">Feedback</Link>
              <Link to="/faculty-contacts/deans-and-schools">Deans & Schools</Link>
              <Link to="/faculty-contacts/faculty-advisers">Faculty Advisors</Link>
              <a href="mailto:academic_secretary@students.iitmandi.ac.in">academic_secretary@students.iitmandi.ac.in</a>
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="foot__bar">
            <span>© 2026 UG ACADEMIC COUNCIL · IIT MANDI</span>
            <span>BUILT BY STUDENTS, FOR STUDENTS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
