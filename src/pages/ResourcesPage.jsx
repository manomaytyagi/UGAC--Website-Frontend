import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resourcesApi } from "../lib/apiBridge";
import "../styles/ResourcesPage.css";

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

const TABS = [
  { id: "documents",  label: "📄 Academic Documents" },
  { id: "links",      label: "🔗 Useful Links" },
  { id: "forms",      label: "📝 Forms & Procedures" },
  { id: "papers",     label: "📚 Past Papers" },
  { id: "internship", label: "🧭 Internship Procedure" },
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
  forms: [
    {
      title: "Course Drop / Add Request",
      desc: "Form to add or drop a course within the permitted window each semester.",
      tag: "Form",
      file_key: "forms/course-drop-add.pdf",
    },
    {
      title: "Grade Review Application",
      desc: "Procedure and form for requesting re-evaluation of an exam or assignment.",
      tag: "Form",
      file_key: "forms/grade-review.pdf",
    },
    {
      title: "Medical Leave Application",
      desc: "Apply for medical leave and request extensions to assignment deadlines.",
      tag: "Form",
      file_key: "forms/medical-leave.pdf",
    },
    {
      title: "NOC for Internship",
      desc: "No-objection certificate required before joining a summer/semester internship.",
      tag: "Form",
      file_key: "forms/noc-internship.pdf",
    },
    {
      title: "Minor Programme Registration",
      desc: "Registration form for enrolling in a minor discipline.",
      tag: "Form",
      file_key: "forms/minor-registration.pdf",
    },
    {
      title: "Academic Grievance Procedure",
      desc: "Step-by-step guide on how to escalate unresolved academic concerns.",
      tag: "Guide",
      file_key: "forms/grievance-procedure.pdf",
    },
  ],
  papers: [
    {
      title: "CS — End Semester Papers (2022–25)",
      desc: "Collected end-sem question papers for Computer Science core courses.",
      tag: "Archive",
      file_key: "papers/cs-endsem-2022-25.zip",
    },
    {
      title: "EC — End Semester Papers (2022–25)",
      desc: "End-sem papers for Electronics & Communication Engineering.",
      tag: "Archive",
      file_key: "papers/ec-endsem-2022-25.zip",
    },
    {
      title: "MA — End Semester Papers (2022–25)",
      desc: "Mathematics department end-semester question papers.",
      tag: "Archive",
      file_key: "papers/ma-endsem-2022-25.zip",
    },
    {
      title: "ME — End Semester Papers (2022–25)",
      desc: "Mechanical Engineering end-semester papers.",
      tag: "Archive",
      file_key: "papers/me-endsem-2022-25.zip",
    },
    {
      title: "Mid Semester Compilation (All Depts.)",
      desc: "Community-sourced mid-sem papers across departments, 2023–25.",
      tag: "Archive",
      file_key: "papers/midsem-all-2023-25.zip",
    },
    {
      title: "Study Material Repository",
      desc: "Notes, cheat sheets, and solved tutorials contributed by seniors.",
      tag: "Drive",
      file_key: "papers/study-material.zip",
    },
  ],
};

const TAG_COLORS = {
  PDF:      { bg: "#eff6ff", color: "#1d4ed8" },
  Portal:   { bg: "#f0fdf4", color: "#15803d" },
  Official: { bg: "#faf5ff", color: "#7e22ce" },
  Library:  { bg: "#fff7ed", color: "#c2410c" },
  External: { bg: "#f0f9ff", color: "#0369a1" },
  Form:     { bg: "#fefce8", color: "#854d0e" },
  Guide:    { bg: "#fdf4ff", color: "#86198f" },
  Archive:  { bg: "#fff1f2", color: "#be123c" },
  Drive:    { bg: "#f0fdf4", color: "#15803d" },
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

/* ──────────────────────────────────────────────────────────────────────────
   INTERNSHIP PROCEDURE — interactive flowchart
   A real flowchart that grows along the path you pick: rounded boxes and
   decision diamonds joined by flowing, curved connectors. Only the branch you
   choose is revealed. The chart flows automatically through the boxes and
   pauses at each diamond for your input. Email addresses are tap-to-send.
   ────────────────────────────────────────────────────────────────────────── */

const FLOW = {
  start: {
    kind: "start",
    title: "Got an intern, yayy! 🎉",
    options: [
      { label: "Yes, I got one!", branch: "Got offer", next: "getOffer" },
      { label: "Not yet 😅",      branch: "No intern", next: "noIntern" },
    ],
  },

  noIntern: {
    kind: "note",
    title: "Soon you'll reach the other side, dw 💪",
    body: "Keep applying — your offer is on its way. Come back the moment you land one.",
  },

  getOffer: {
    kind: "action",
    title: "Get Offer Letter",
    body: "Secure the official offer letter — you'll attach it at later steps.",
    next: "duration",
  },

  duration: {
    kind: "decision",
    short: "Duration?",
    title: "How long is the internship?",
    options: [
      { label: "2 Months", branch: "2 Months · Vacation", next: "informFA" },
      { label: "6 Months", branch: "6 Months · Semester", next: "faApproval" },
    ],
  },

  informFA: {
    kind: "action",
    title: "Inform Faculty Advisor (FA)",
    body: "Just keep your FA in the loop — no further academic approval needed.",
    next: "doneVacation",
  },
  doneVacation: { kind: "done", title: "Done", body: "All set for your vacation internship." },

  faApproval: {
    kind: "action",
    title: "FA Approval — Internship Form",
    body: "Get your Faculty Advisor to sign the Internship Form.",
    next: "cnp",
  },

  cnp: {
    kind: "email",
    title: "CNP Approval",
    meta: ["Assistant Registrar — Shubham Sir"],
    emails: [
      { label: "To", addr: "arcnp@iitmandi.ac.in" },
      { label: "Cc", addr: "cnpcell@iitmandi.ac.in" },
    ],
    next: "noc",
  },

  noc: {
    kind: "email",
    title: "NOC from Academic Office",
    meta: ["AD Courses · Cc: Mukesh Sir"],
    emails: [
      { label: "To", addr: "adcourses@iitmandi.ac.in" },
      { label: "Cc", addr: "acadoa2@iitmandi.ac.in" },
    ],
    next: "type",
  },

  type: {
    kind: "decision",
    short: "Type?",
    title: "Remote or onsite?",
    options: [
      { label: "Remote 🏠", branch: "Remote", next: "doneRemote" },
      { label: "Onsite 🏢", branch: "Onsite", next: "hostelLeave" },
    ],
  },
  doneRemote: { kind: "done", title: "Done", body: "Remote — no hostel formalities. All set." },

  hostelLeave: {
    kind: "action",
    title: "Hostel Leave Form",
    body: "Signatures: FA + Warden. Click a photo of the signed form for your records.",
    next: "hostelFee",
  },

  hostelFee: {
    kind: "decision",
    short: "Fee on Samarth?",
    title: "Hostel / mess fee shown on Samarth?",
    options: [
      { label: "No",  branch: "No",  next: "doneNoFee" },
      { label: "Yes", branch: "Yes", next: "emailDSO" },
    ],
  },
  doneNoFee: { kind: "done", title: "Done", body: "No fee shown — nothing more to do." },

  emailDSO: {
    kind: "email",
    title: "Email to DSO — Renu Mam",
    emails: [{ label: "To", addr: "renu_jangra@iitmandi.ac.in" }],
    attachments: ["Hostel Leave Form", "Offer Letter", "NOC"],
    next: "doneFinal",
  },
  doneFinal: { kind: "done", title: "Done", body: "All approvals complete. Enjoy your internship! 🚀" },
};

const KIND_META = {
  start:    { accent: C.orange,  bg: "#fff7ed", label: "Start"      },
  action:   { accent: C.navyMid, bg: "#eef2fb", label: "Step"       },
  decision: { accent: "#b45309", bg: "#fef3c7", label: "Decision"   },
  email:    { accent: "#1d4ed8", bg: "#eff6ff", label: "Send email" },
  note:     { accent: "#9333ea", bg: "#faf5ff", label: "Note"       },
  done:     { accent: "#15803d", bg: "#f0fdf4", label: "Done"       },
};

// A single flowchart node. Shape depends on kind. `register` stores the DOM
// node so the parent can measure ports and draw connectors to/from it.
function FlowNode({ node, active, onClick, register }) {
  const meta = KIND_META[node.kind];
  const clickable = !!onClick;
  const cls = (base) =>
    `uc-fc-node ${base}${active ? " is-active" : ""}${clickable ? " is-click" : ""}`;

  if (node.kind === "decision") {
    return (
      <div ref={register} className={cls("uc-fc-diamond")} onClick={onClick}
           role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
           onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}>
        <span className="uc-fc-diamond-bg"
              style={{ background: meta.bg, borderColor: meta.accent }} />
        <span className="uc-fc-diamond-label">{node.short}</span>
      </div>
    );
  }

  if (node.kind === "start") {
    return (
      <div ref={register} className={cls("uc-fc-start")} onClick={onClick}
           role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}
           onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onClick() : undefined}>
        {node.title}
      </div>
    );
  }

  if (node.kind === "done") {
    return (
      <div ref={register} className={cls("uc-fc-done")}>
        <span className="uc-fc-done-tag">✓ {node.title}</span>
        {node.body && <span className="uc-fc-done-body">{node.body}</span>}
      </div>
    );
  }

  if (node.kind === "note") {
    return (
      <div ref={register} className={cls("uc-fc-notebox")}>
        <h4 className="uc-fc-note-title">{node.title}</h4>
        <p className="uc-fc-note-body">{node.body}</p>
      </div>
    );
  }

  // action / email box
  return (
    <div ref={register} className={cls("uc-fc-box")}
         style={{ borderColor: meta.accent, background: meta.bg }}>
      <span className="uc-fc-box-tag" style={{ color: meta.accent }}>{meta.label}</span>
      <h4 className="uc-fc-box-title">{node.title}</h4>
      {node.meta?.map((m, i) => <p key={i} className="uc-fc-box-meta">{m}</p>)}
      {node.body && <p className="uc-fc-box-body">{node.body}</p>}
      {node.emails && (() => {
        const to = node.emails.find((e) => e.label === "To")?.addr;
        const cc = node.emails.filter((e) => e.label === "Cc").map((e) => e.addr).join(",");
        const href = `mailto:${to || ""}${cc ? `?cc=${encodeURIComponent(cc)}` : ""}`;
        return (
          <div className="uc-fc-mailwrap">
            {node.emails.map((e, i) => (
              <span key={i} className="uc-fc-mailrow">
                <span className="uc-fc-mail-label">{e.label}</span>
                <a className="uc-flow-mail uc-fc-mail" href={href}>{e.addr}</a>
              </span>
            ))}
          </div>
        );
      })()}
      {node.attachments && (
        <div className="uc-fc-attach">
          <span className="uc-fc-attach-label">📎 Attach</span>
          {node.attachments.map((a, i) => (
            <span key={i} className="uc-fc-attach-item">{a}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function InternshipFlow() {
  const [path, setPath]       = useState(["start"]);
  const [choices, setChoices] = useState({});           // decisionId -> chosen option
  const [conn, setConn]       = useState({ lines: [], labels: [], w: 0, h: 0 });
  const [resizeTick, setTick] = useState(0);

  const wrapRef  = useRef(null);
  const nodeRefs = useRef({});                           // id -> DOM node
  const optRefs  = useRef([]);                           // option button DOM nodes

  const activeId   = path[path.length - 1];
  const activeNode = FLOW[activeId];
  const awaiting =
    (activeNode.kind === "decision" || activeNode.kind === "start") && !choices[activeId];

  // Pick a branch: record the choice, then flow forward through boxes until the
  // next diamond or a terminal, revealing each node along the way.
  const choose = (opt) => {
    setChoices((c) => ({ ...c, [activeId]: opt }));
    optRefs.current = [];
    setPath((p) => {
      const next = [...p];
      let cur = opt.next;
      // guard against runaway loops
      for (let i = 0; i < 50; i++) {
        next.push(cur);
        const n = FLOW[cur];
        if (n.kind === "decision" || n.kind === "done" || n.kind === "note") break;
        cur = n.next;
      }
      return next;
    });
  };

  // Jump back to an earlier diamond to change the answer.
  const rewindTo = (i) => {
    const trimmed = path.slice(0, i + 1);
    const keepId = trimmed[trimmed.length - 1];
    setChoices((c) => {
      const copy = {};
      for (const id of trimmed) if (c[id] && id !== keepId) copy[id] = c[id];
      return copy;
    });
    setPath(trimmed);
    optRefs.current = [];
  };

  const back = () => {
    for (let k = path.length - 2; k >= 0; k--) {
      const n = FLOW[path[k]];
      if (n.kind === "decision" || n.kind === "start") return rewindTo(k);
    }
  };
  const restart = () => { setPath(["start"]); setChoices({}); optRefs.current = []; };

  // Measure node ports and build the connector curves.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();
    const bottomPort = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height };
    };
    const topPort = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left - box.left + r.width / 2, y: r.top - box.top };
    };
    const curve = (s, t) => {
      const dy = Math.max(24, (t.y - s.y) * 0.55);
      return `M ${s.x} ${s.y} C ${s.x} ${s.y + dy}, ${t.x} ${t.y - dy}, ${t.x} ${t.y}`;
    };

    const lines = [], labels = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = nodeRefs.current[path[i]], b = nodeRefs.current[path[i + 1]];
      if (!a || !b) continue;
      const s = bottomPort(a), t = topPort(b);
      const key = path[i] + ">" + path[i + 1];
      lines.push({ key, d: curve(s, t) });
      const from = FLOW[path[i]];
      if ((from.kind === "decision" || from.kind === "start") && choices[path[i]]) {
        labels.push({
          key, text: choices[path[i]].branch,
          x: (s.x + t.x) / 2, y: (s.y + t.y) / 2,
        });
      }
    }
    if (awaiting && nodeRefs.current[activeId]) {
      const s = bottomPort(nodeRefs.current[activeId]);
      activeNode.options.forEach((_, idx) => {
        const bEl = optRefs.current[idx];
        if (bEl) lines.push({ key: activeId + ">opt" + idx, d: curve(s, topPort(bEl)) });
      });
    }
    setConn({ lines, labels, w: wrap.clientWidth, h: wrap.clientHeight });
  }, [path, choices, awaiting, activeId, resizeTick]);

  // Recompute on container resize.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const finished = activeNode.kind === "done" || activeNode.kind === "note";

  return (
    <div className="uc-fc-outer">
      <div className="uc-fc-intro">
        <p className="uc-fc-intro-eyebrow">Interactive flowchart</p>
        <h2 className="uc-fc-intro-title">Approvals &amp; Procedures for Internship</h2>
        <p className="uc-fc-intro-text">
          Pick a path at each diamond and the chart draws itself along your
          choice. Email addresses are tap-to-send — and you can tap any diamond
          to change an answer.
        </p>
      </div>

      <div className="uc-fc-canvas" ref={wrapRef}>
        <svg className="uc-fc-svg" width={conn.w} height={conn.h} aria-hidden="true">
          <defs>
            <marker id="uc-fc-arrow" viewBox="0 0 10 10" refX="8.5" refY="5"
                    markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#9fb0cf" />
            </marker>
          </defs>
          {conn.lines.map((l) => (
            <path key={l.key} className="uc-fc-line" d={l.d}
                  pathLength="1" markerEnd="url(#uc-fc-arrow)" />
          ))}
        </svg>

        {conn.labels.map((lb) => (
          <span key={lb.key} className="uc-fc-branch"
                style={{ left: lb.x, top: lb.y }}>{lb.text}</span>
        ))}

        <div className="uc-fc-column">
          {path.map((id, i) => {
            const isActive = i === path.length - 1;
            const node = FLOW[id];
            const canRewind =
              !isActive && (node.kind === "decision" || node.kind === "start");
            return (
              <div className="uc-fc-slot" key={id}>
                <FlowNode
                  node={node}
                  active={isActive}
                  onClick={canRewind ? () => rewindTo(i) : undefined}
                  register={(el) => { nodeRefs.current[id] = el; }}
                />
              </div>
            );
          })}

          {awaiting && (
            <div className="uc-fc-fan">
              {activeNode.options.map((o, idx) => (
                <button key={idx} className="uc-fc-opt"
                        ref={(el) => { optRefs.current[idx] = el; }}
                        data-variant={idx === 0 ? "primary" : "ghost"}
                        onClick={() => choose(o)}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="uc-fc-controls">
        {path.length > 1 && (
          <button className="uc-flow-ctrl" onClick={back}>← Back</button>
        )}
        {path.length > 1 && (
          <button className="uc-flow-ctrl" onClick={restart}>↺ Start over</button>
        )}
        {finished && (
          <span className="uc-fc-hint">Tap any diamond above to change an answer.</span>
        )}
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents");
  const [search, setSearch] = useState("");

  const [tabData, setTabData] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiWaking, setApiWaking] = useState(false);

  useEffect(() => {
    if (activeTab === "internship") return; // custom interactive tab, no card data
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

  const filtered = items.filter(
    (item) =>
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.desc.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="uc-resources" style={S.page}>

      {apiWaking && (
        <div style={S.wakeToast}>⏳ API is waking up, please wait…</div>
      )}

      {isStale && !loading && (
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
            Documents, links, forms, and past papers — everything a UGAC student
            needs in one place.
          </p>
        </div>
      </div>

      {activeTab !== "internship" && (
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>🔍</span>
          <input
            style={S.searchInput}
            placeholder="Search resources…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button style={S.clearBtn} onClick={() => setSearch("")}>✕</button>
          )}
        </div>
      )}

      <div style={S.tabsWrap}>
        <div style={S.tabs}>
          {TABS.map((t) => {
            const count = tabData[t.id]?.items?.length;
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
        {activeTab === "internship" ? (
          <InternshipFlow />
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

        {!search && !loading && activeTab !== "internship" && (
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