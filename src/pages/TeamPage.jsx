import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { apiFetch } from "../lib/apiBridge";
import { COLORS as C } from "../styles/colors.js";
import "../styles/TeamPage.css";

// Hook: returns true when viewport width ≤ 560px
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 560);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 560px)");
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// Color mapping for each branch
const HUES = {
  blue:   ["#6fa3d0", "#4f7cc4", "#37548f"],
  red:    ["#d98c80", "#c25b52", "#9c4a52"],
  green:  ["#84b88c", "#4e9b72", "#2f6e54"],
  orange: ["#e0aa6b", "#d18a3e", "#a8682c"],
};
const HUE_ORDER = ["blue", "red", "green", "orange"];
const BRANCH_COLORS = [];
for (let s = 0; s < 3; s++) for (let h = 0; h < 4; h++) BRANCH_COLORS.push(HUES[HUE_ORDER[h]][s]);

function tint(hex, a) {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16), g = parseInt(x.slice(2, 4), 16), b = parseInt(x.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Fallback data - used when the live API call fails
const FALLBACK_SECRETARY = {
  name: "Secretary Name",
  role: "Academic Secretary",
  description:
    "Placeholder bio for the Academic Secretary — a short line about the role and the council. Swap in via the API.",
  email: "acad.secy@iitmandi.ac.in",
  phone: "+91 00000 00000",
  linkedin: "#",
  photo_url: null,
  code: "AS",
};

const FALLBACK_BRANCHES = BRANCH_COLORS.map((color, i) => {
  const n = i + 1;
  return {
    id: `b${n}`,
    name: `Branch ${n}`,
    code: `B${n}`,
    color,
    councillor: {
      name: `Branch ${n} Councillor`, role: "Branch Councillor",
      email: `branch${n}.councillor@iitmandi.ac.in`, phone: "+91 00000 00000",
      linkedin: "#", photo_url: null, code: `B${n}`,
    },
    subs: [1, 2, 3].map((s) => ({
      name: `Sub-councillor ${s}`, role: `Branch ${n}`,
      email: `branch${n}.sub${s}@iitmandi.ac.in`, phone: "+91 00000 00000",
      linkedin: "#", photo_url: null, code: `B${n}`,
    })),
  };
});

const FALLBACK_SUPPORT_TEAMS = [
  { id: "webdev", name: "Web Development", lead: "Web Dev Lead", blurb: "Builds and maintains the council’s sites and tools.", featured: true },
  { id: "photo",  name: "Photography",     lead: "Photography Lead", blurb: "Covers events and keeps the visual archive." },
  { id: "social", name: "Social Media",    lead: "Social Media Lead", blurb: "Runs announcements and outreach." },
  { id: "misc",   name: "Other Teams",     lead: "Team Lead", blurb: "Design, content, logistics, and more." },
];

// Past academic secretaries. batch_year on the backend is the year the term
// began, so 2025 is the 2025–26 session.
//
// The contact mix is uneven across these samples on purpose, so the card can be
// checked against every combination the real data will produce — all three
// links, two of them, or just one.
const FALLBACK_HOF_SEED = [
  { year: 2024, email: true,  linkedin: true,  instagram: true  },
  { year: 2023, email: false, linkedin: true,  instagram: true  },
  { year: 2022, email: true,  linkedin: true,  instagram: false },
  { year: 2021, email: true,  linkedin: false, instagram: false },
  { year: 2020, email: false, linkedin: false, instagram: true  },
  { year: 2019, email: true,  linkedin: true,  instagram: true  },
];

const FALLBACK_HALL_OF_FAME = FALLBACK_HOF_SEED.map((seed, i) => ({
  id: `hof-${seed.year}`,
  name: `Past Secretary ${i + 1}`,
  role: "Academic Secretary",
  session: `${seed.year}\u2013${String(seed.year + 1).slice(-2)}`,
  sessionStart: seed.year,
  email: seed.email ? `acad.secy.${seed.year}@iitmandi.ac.in` : null,
  linkedin: seed.linkedin ? "https://www.linkedin.com/" : null,
  instagram: seed.instagram ? "https://www.instagram.com/" : null,
  phone: null,
  photo_url: null,
  code: `S${i + 1}`,
}));

// function to show members photo or fallback to intials
function Avatar({ member, size = 48, color, onDark = false }) {
  const [err, setErr] = useState(false);
  const label = member.code || member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const accent = color || C.navyLight;
  if (member.photo_url && !err) {
    return (
      <img src={member.photo_url} alt={member.name} onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: size * 0.26, objectFit: "cover",
                 flexShrink: 0, border: `2px solid ${tint(accent, 0.35)}` }} />
    );
  }
  // On a colour-filled card, a tinted plate with white initials disappears —
  // the plate has to invert: solid white behind, the branch colour on top.
  const fill = onDark
    ? { background: C.white, color: accent }
    : { background: `linear-gradient(140deg, ${accent}, ${tint(accent, 0.72)})`, color: C.white };
  return (
    <div aria-hidden style={{
      width: size, height: size, borderRadius: size * 0.26, flexShrink: 0,
      ...fill, display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.34, letterSpacing: 0.5,
    }}>{label}</div>
  );
}

// Icons for Contact
const Icon = {
  mail: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  linkedin: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18V9.99H5.67V18h2.67zM7 8.8a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zM18.34 18v-4.4c0-2.35-1.26-3.44-2.94-3.44-1.35 0-1.96.74-2.3 1.27V9.99h-2.67V18h2.67v-4.46c0-.24.02-.47.09-.64.18-.47.62-.96 1.34-.96.95 0 1.33.72 1.33 1.78V18h2.68z"/></svg>,
  instagram: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5.5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>,
};

// Fucntion to create contact Icons- Compact, Standard, Large, DArk
function Contacts({ member, accent = C.navyLight, large = false, onDark = false, compact = false }) {
  if (compact) {
    const btn = (k, href, icon, label, target) => (
      <a key={k} href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
         className="tm-ic" style={{ "--cc": accent }} aria-label={label} title={label}>{icon}</a>
    );
    return (
      <div className="tm-contacts">
        {member.email && btn("e", `mailto:${member.email}`, Icon.mail, "Email")}
        {member.phone && btn("p", `tel:${member.phone}`, Icon.phone, "Call")}
        {member.linkedin && btn("l", member.linkedin, Icon.linkedin, "LinkedIn", "_blank")}
        {member.instagram && btn("i", member.instagram, Icon.instagram, "Instagram", "_blank")}
      </div>
    );
  }
  const fs = large ? 12.5 : 11.5;
  const chip = (k, href, icon, text, target) => (
    <a key={k} href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
       className={"tm-chip" + (onDark ? " is-dark" : "")} style={{ "--cc": accent, fontSize: fs }}>
      <span className="tm-chip-ic">{icon}</span>{text}
    </a>
  );
  return (
    <div className="tm-contacts">
      {member.email && chip("e", `mailto:${member.email}`, Icon.mail, large ? member.email : "Email")}
      {member.phone && chip("p", `tel:${member.phone}`, Icon.phone, large ? member.phone : "Call")}
      {member.linkedin && chip("l", member.linkedin, Icon.linkedin, "LinkedIn", "_blank")}
      {member.instagram && chip("i", member.instagram, Icon.instagram, "Instagram", "_blank")}
    </div>
  );
}

// 3 Screens - Leadership, Branch, Support- snaps on after scroll
function LeadershipScreen({ secretary, branches }) {
  const mobile = useIsMobile();
  return (
    <div className="tm-screen tm-leadership">
      <div className="tm-screen-head">
        <div>
          <span className="tm-eyebrow tm-eyebrow--orange">UGAC · IIT Mandi</span>
          <h1 className="tm-h1">The Team</h1>
        </div>
        <div className="tm-spectrum" aria-hidden>
          {branches.map((b) => <span key={b.id} style={{ background: b.color }} title={b.name} />)}
        </div>
      </div>

      <div className="tm-spotlight">
        <div className="tm-spotlight-glow" aria-hidden />
        <div className="tm-spotlight-inner">
          <Avatar member={secretary} size={88} color={C.navyLight} />
          <div className="tm-spotlight-body">
            <span className="tm-eyebrow tm-eyebrow--orange">{secretary.role}</span>
            <h2 className="tm-spotlight-name">{secretary.name}</h2>
            {secretary.description && secretary.description !== secretary.role && (
              <p className="tm-spotlight-desc">{secretary.description}</p>
            )}
            {mobile && <Contacts member={secretary} compact onDark />}
          </div>
          {!mobile && (
            <div className="tm-spotlight-contacts">
              <span className="tm-badge">Tier 1</span>
              <Contacts member={secretary} large onDark />
            </div>
          )}
        </div>
      </div>

      <div className="tm-tier-label">
        <span className="tm-badge">Tier 2</span>
        <span className="tm-tier-title">Branch Councillors</span>
        <span className="tm-count">{branches.length}</span>
      </div>

      <div className="tm-councillors">
        {branches.map((b) => (
          <article key={b.id} className="tm-cc-card" style={{ "--c": b.color, "--cbg": tint(b.color, 0.1) }}>
            <Avatar member={b.councillor} size={64} color={b.color} />
            <div className="tm-cc-body">
              {/* Short code (matches the Branches screen's badges) so the pill
                  never wraps and every card's name lines up at the same spot;
                  full name is still one hover away via the title attribute. */}
              <span className="tm-cc-branch">
                <span className="tm-branch-tag" title={b.name}
                  style={{ "--c": b.color, "--cbg": tint(b.color, 0.12) }}>{b.code}</span>
              </span>
              <h3 className="tm-cc-name" title={b.councillor.name}>{b.councillor.name}</h3>
              <Contacts member={b.councillor} accent={b.color} compact />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function BranchesScreen({ branches, onOpen }) {
  return (
    <div className="tm-screen">
      <div className="tm-screen-head">
        <div>
          <span className="tm-eyebrow tm-eyebrow--orange">Explore</span>
          <h2 className="tm-screen-title">Branches</h2>
        </div>
        <span className="tm-hint">Tap a branch to open its team page</span>
      </div>
      <div className="tm-branch-grid">
        {branches.map((b) => (
          <button key={b.id} className="tm-branch-tile"
            style={{ "--c": b.color, "--cbg": tint(b.color, 0.08), "--cbd": tint(b.color, 0.34) }}
            onClick={() => onOpen(b)}>
            <span className="tm-branch-bar" aria-hidden />
            <span className="tm-branch-code" style={{ background: b.color }}>{b.code}</span>
            <span className="tm-branch-name">{b.name}</span>
            <span className="tm-branch-cta">View team <span aria-hidden>→</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

// The card's photo is full-bleed rather than a fixed square, so Avatar (which
// takes a pixel size) can't be reused here. Same initials fallback, but it
// fills the whole panel instead of a chip.
function HofPhoto({ member, color }) {
  const [err, setErr] = useState(false);
  const label =
    member.code ||
    member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="tm-hof-photo">
      {member.photo_url && !err ? (
        <img src={member.photo_url} alt={member.name} onError={() => setErr(true)} />
      ) : (
        <span
          className="tm-hof-initials"
          aria-hidden
          style={{ background: `linear-gradient(150deg, ${color}, ${tint(color, 0.68)})` }}
        >
          {label}
        </span>
      )}
      {member.session && <span className="tm-hof-session">{member.session}</span>}
    </div>
  );
}

// sessionStart is the authoritative field for ordering, but the API sends
// -1 as a sentinel when it couldn't parse a year (see apiBridge's
// shapeHallOfFame) — that's not a real year and must not win the "is this a
// number" check below, or every such record silently sinks to the bottom
// even when its session text (e.g. "2022–23") is actually fine. Only trust
// a positive sessionStart; otherwise parse the leading year out of the
// display label instead of trusting whatever order the API happened to return.
function getSessionYear(p) {
  if (typeof p.sessionStart === "number" && p.sessionStart > 0) return p.sessionStart;
  const match = /\d{4}/.exec(p.session || "");
  return match ? parseInt(match[0], 10) : -Infinity;
}

// Past academic secretaries. The session label comes from the backend's
// batch_year (2025 -> "2025–26"), so the role reads "Academic Secretary · 2025–26".
function HallOfFameScreen({ people = [] }) {
  // Most recent tenure first, regardless of the order the API returns.
  const sorted = useMemo(
    () => [...people].sort((a, b) => getSessionYear(b) - getSessionYear(a)),
    [people]
  );
  return (
    <div className="tm-screen">
      <div className="tm-screen-head">
        <div>
          <span className="tm-eyebrow tm-eyebrow--orange">Hall of Fame</span>
          <h2 className="tm-screen-title">Past Academic Secretaries</h2>
        </div>
        <span className="tm-count">{sorted.length} {sorted.length === 1 ? "term" : "terms"}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="tm-hof-empty">
          No past secretaries have been added yet. They’ll appear here once the council
          publishes them.
        </p>
      ) : (
        <div className="tm-hof-grid">
          {sorted.map((p, i) => {
            const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
            return (
              <article
                key={p.id || `${p.name}-${i}`}
                className="tm-hof-card"
                style={{ "--c": color, "--cbg": tint(color, 0.1), "--cbd": tint(color, 0.28) }}
              >
                <HofPhoto member={p} color={color} />
                <div className="tm-hof-info">
                  <h3 className="tm-hof-name">{p.name}</h3>
                  <p className="tm-hof-role">{p.role}</p>
                  <Contacts member={p} accent={color} compact />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

//Branch Page and Switching Logic
function BranchPage({ branch, branches, onSwitch, onBack }) {
  const mobile = useIsMobile();
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onBack();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onBack]);

  const c = branch.color;
  return (
    <div className="tm-branchpage" style={{ "--c": c, "--cbg": tint(c, 0.08), "--cbd": tint(c, 0.32) }}>
      <header className="tm-bp-head">
        <button className="tm-back" onClick={onBack} aria-label="Back to Branches">←</button>
        <span className="tm-branch-code tm-branch-code--lg" style={{ background: c }}>{branch.code}</span>
        <div>
          <span className="tm-eyebrow" style={{ color: c }}>Branch team</span>
          <h2 className="tm-bp-title">{branch.name}</h2>
        </div>
      </header>

      <div className="tm-bp-grid">

        <div className="tm-bp-people">
          <div className="tm-lead-card" style={{ background: `linear-gradient(150deg, ${c}, ${tint(c, 0.78)})` }}>
            <Avatar member={branch.councillor} size={72} color={c} onDark />
            <div>
              <span className="tm-eyebrow tm-eyebrow--white">Councillor</span>
              <h3 className="tm-lead-name">{branch.councillor.name}</h3>
              <Contacts member={branch.councillor} large={!mobile} compact={mobile} onDark />
            </div>
          </div>
          <p className="tm-sub-label">Sub-councillors</p>
          {branch.subs.length === 0 ? (
            <p className="tm-sub-empty">No sub-councillors listed for this branch yet.</p>
          ) : (
            <div className="tm-sub-list">
              {branch.subs.map((s, i) => (
                <div className="tm-sub-card" key={i} style={{ "--c": c, "--cbg": tint(c, 0.08) }}>
                  <Avatar member={s} size={52} color={c} />
                  <div className="tm-cc-body">
                    <h4 className="tm-cc-name" title={s.name}>{s.name}</h4>
                    <p className="tm-cc-role">{s.role}</p>
                  </div>
                  <Contacts member={s} accent={c} compact />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tm-bp-switch">
          <p className="tm-sub-label">Jump to another branch</p>
          <div className="tm-switch-grid">
            {branches.map((b) => {
              const active = b.id === branch.id;
              return (
                <button key={b.id} className={"tm-switch-tile" + (active ? " is-active" : "")}
                  onClick={() => onSwitch(b)}
                  style={{ "--c": b.color, "--cbg": tint(b.color, active ? 0.16 : 0.06), "--cbd": tint(b.color, 0.3) }}>
                  <span className="tm-branch-code" style={{ background: b.color }}>{b.code}</span>
                  <span className="tm-switch-name">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: "leadership", label: "Leadership" },
  { id: "branches",   label: "Branches" },
  { id: "hall",       label: "Hall of Fame" },
];

export default function TeamPage({ onExit }) {
  const [active, setActive] = useState(null);
  const [current, setCurrent] = useState(0);
  const [team, setTeam] = useState(null); 
  const scrollerRef = useRef(null);
  const screenRefs = useRef([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/v1/team", {
      secretary: FALLBACK_SECRETARY,
      branches: FALLBACK_BRANCHES,
      supportTeams: FALLBACK_SUPPORT_TEAMS,
      hallOfFame: FALLBACK_HALL_OF_FAME,
    }).then(({ data, source }) => {
      if (cancelled) return;
      // drop branch if data is not entered properly
      const safeBranches = (data.branches || []).filter((b) => b.councillor);
      // An empty Hall of Fame from a working API is real data, not a failure —
      // HallOfFameScreen has an honest empty state for it. Only fall back to
      // placeholders when the request itself failed, or the section silently
      // renders "Past Secretary 1…6" forever and looks live while being static.
      setTeam({
        secretary: data.secretary || FALLBACK_SECRETARY,
        branches: safeBranches.length > 0 ? safeBranches : FALLBACK_BRANCHES,
        supportTeams: data.supportTeams?.length > 0 ? data.supportTeams : FALLBACK_SUPPORT_TEAMS,
        hallOfFame: source === "live" ? (data.hallOfFame || []) : FALLBACK_HALL_OF_FAME,
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (active) return;
    const root = scrollerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = screenRefs.current.indexOf(e.target);
            if (i >= 0) setCurrent(i);
          }
        });
      },
      { root, threshold: 0.55 }
    );
    screenRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [active, team]);

  const jump = useCallback((i) => {
    screenRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openBranch = useCallback((b) => { setActive(b); window.scrollTo?.(0, 0); }, []);
  const backToBranches = useCallback(() => {
    setActive(null);
    requestAnimationFrame(() => jump(1));
  }, [jump]);

  if (!team) {
    return (
      <div className="tm-root">
        <div style={{ height: "100vh", display: "grid", placeItems: "center", color: C.textMuted }}>
          Loading team…
        </div>
      </div>
    );
  }

  return (
    <div className="tm-root">

      <nav className="tm-nav">
        <div className="tm-brand">
          <span className="tm-brand-mark">UG</span>
          <div>
            <p className="tm-brand-title">UG Academic Council</p>
            <p className="tm-brand-sub">IIT MANDI</p>
          </div>
        </div>
        <div className="tm-nav-links">
          <a className="is-active">Team</a><a>Events</a><a>Courses</a><a>Resources</a><a>Community</a>
        </div>
        <button className="tm-exit" onClick={() => onExit?.()}>← Back to site</button>
      </nav>

      {active ? (
        <BranchPage branch={active} branches={team.branches} onSwitch={setActive} onBack={backToBranches} />
      ) : (
        <>

          <div className="tm-dots">
            {SECTIONS.map((s, i) => (
              <button key={s.id} className={"tm-dot" + (current === i ? " is-active" : "")}
                onClick={() => jump(i)} aria-label={s.label}>
                <span className="tm-dot-label">{String(i + 1).padStart(2, "0")} {s.label}</span>
              </button>
            ))}
          </div>

          <div className="tm-scroller" ref={scrollerRef}>
            <section ref={(el) => (screenRefs.current[0] = el)} className="tm-snap">
              <LeadershipScreen secretary={team.secretary} branches={team.branches} />
            </section>
            <section ref={(el) => (screenRefs.current[1] = el)} className="tm-snap">
              <BranchesScreen branches={team.branches} onOpen={openBranch} />
            </section>
            <section ref={(el) => (screenRefs.current[2] = el)} className="tm-snap">
              <HallOfFameScreen people={team.hallOfFame} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}