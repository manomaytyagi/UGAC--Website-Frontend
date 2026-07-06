import { useState, useRef, useLayoutEffect } from "react";
import { COLORS as C } from "../../styles/colors.js";
import "../../styles/ResourcesPage.css"; // provides the .uc-fc-* flowchart styles

/* ──────────────────────────────────────────────────────────────────────────
   REUSABLE FLOWCHART ENGINE
   An interactive flowchart that grows along the path you pick: rounded boxes
   and decision diamonds joined by flowing, curved connectors. Only the branch
   you choose is revealed. It flows automatically through the boxes and pauses
   at each diamond for your input. Email addresses are tap-to-send.

   Drive it with a `flow` map and an `intro`. See Internships.jsx for the
   shape of a flow. Every procedure flowchart reuses this file unchanged.

   A flow is an object keyed by node id. Each node has a `kind`:
     start    → { title, options: [{ label, branch, next }] }
     action   → { title, body?, meta?, next }
     email    → { title, meta?, emails: [{ label:"To"|"Cc", addr }], attachments?, next }
     decision → { short, title, options: [{ label, branch, next }] }
     note     → { title, body }               (terminal)
     done     → { title, body }               (terminal)
   The flow MUST contain a node with id "start".
   ────────────────────────────────────────────────────────────────────────── */

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

/**
 * Flowchart engine.
 * @param {object}  flow   node map (see file header). Must include a "start" node.
 * @param {object}  intro  { eyebrow, title, text } shown above the canvas.
 */
export default function Flowchart({ flow, intro }) {
  const [path, setPath]       = useState(["start"]);
  const [choices, setChoices] = useState({});           // decisionId -> chosen option
  const [conn, setConn]       = useState({ lines: [], labels: [], w: 0, h: 0 });
  const [resizeTick, setTick] = useState(0);

  const wrapRef  = useRef(null);
  const nodeRefs = useRef({});                           // id -> DOM node
  const optRefs  = useRef([]);                           // option button DOM nodes

  const activeId   = path[path.length - 1];
  const activeNode = flow[activeId];
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
        const n = flow[cur];
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
      const n = flow[path[k]];
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
      const from = flow[path[i]];
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
  }, [path, choices, awaiting, activeId, resizeTick, flow]);

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
      {intro && (
        <div className="uc-fc-intro">
          {intro.eyebrow && <p className="uc-fc-intro-eyebrow">{intro.eyebrow}</p>}
          {intro.title && <h2 className="uc-fc-intro-title">{intro.title}</h2>}
          {intro.text && <p className="uc-fc-intro-text">{intro.text}</p>}
        </div>
      )}

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
            const node = flow[id];
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