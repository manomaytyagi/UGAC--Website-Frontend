import { useState, useRef, useLayoutEffect } from "react";
import { COLORS as C } from "../../styles/colors.js";
import "../../styles/ResourcesPage.css"; // provides the .uc-fc-* flowchart styles

const SERP_MIN_W = 880;   // canvas px needed before we go horizontal
const COL_W      = 296;   // width of one column track
const COL_GAP    = 104;   // horizontal space between tracks
const MAX_COLS   = 4;

const KIND_META = {
  start:    { accent: C.orange,  bg: "#fff7ed", label: "Start"      },
  action:   { accent: C.navyMid, bg: "#eef2fb", label: "Step"       },
  decision: { accent: "#b45309", bg: "#fef3c7", label: "Decision"   },
  email:    { accent: "#1d4ed8", bg: "#eff6ff", label: "Send email" },
  note:     { accent: "#9333ea", bg: "#faf5ff", label: "Note"       },
  done:     { accent: "#15803d", bg: "#f0fdf4", label: "Done"       },
};

/* ── geometry ────────────────────────────────────────────────────────────
   A "port" is the midpoint of one side of a node, and the side also gives the
   direction the connector should leave / arrive along. (The diamond's inset is
   tuned so its bounding-box side midpoints land exactly on its four vertices.) */
const SIDE_VEC = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

const portOf = (el, side, box) => {
  const r = el.getBoundingClientRect();
  const x = r.left - box.left, y = r.top - box.top;
  if (side === "top")    return { x: x + r.width / 2, y };
  if (side === "bottom") return { x: x + r.width / 2, y: y + r.height };
  if (side === "left")   return { x,                  y: y + r.height / 2 };
  return                        { x: x + r.width,     y: y + r.height / 2 };
};

// Cubic bezier that leaves `s` along sSide and arrives at `t` against tSide.
const curveBetween = (s, sSide, t, tSide) => {
  const k = Math.max(26, Math.hypot(t.x - s.x, t.y - s.y) * 0.42);
  const [sx, sy] = SIDE_VEC[sSide], [tx, ty] = SIDE_VEC[tSide];
  return `M ${s.x} ${s.y} C ${s.x + sx * k} ${s.y + sy * k}, ` +
         `${t.x + tx * k} ${t.y + ty * k}, ${t.x} ${t.y}`;
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
  const [layout, setLayout]   = useState({ serp: false, cols: 1 });
  const [resizeTick, setTick] = useState(0);

  const wrapRef  = useRef(null);
  const nodeRefs = useRef({});                           // id -> DOM node
  const optRefs  = useRef([]);                           // option button DOM nodes

  const activeId   = path[path.length - 1];
  const activeNode = flow[activeId];
  const awaiting =
    (activeNode.kind === "decision" || activeNode.kind === "start") && !choices[activeId];

  /* Where the i-th revealed node sits. Even rows run left→right, odd rows run
     right→left, so the path snakes: →→→ ↓ ←←← ↓ →→→  (the "inverted S"). */
  const cellOf = (i) => {
    const cols = Math.max(1, layout.cols);
    const row  = Math.floor(i / cols);
    const idx  = i % cols;
    const even = row % 2 === 0;
    return { row, col: even ? idx : cols - 1 - idx, dir: even ? 1 : -1 };
  };

  /* Which sides the connector from node i to node i+1 uses. Same row → it runs
     along the row; different row → it drops straight down (both cells share a
     column at a turn, so the drop is the vertical stroke of the S). */
  const routeFor = (i, j) => {
    if (!layout.serp) return { sSide: "bottom", tSide: "top" };
    const a = cellOf(i), b = cellOf(j);
    if (a.row !== b.row) return { sSide: "bottom", tSide: "top" };
    return a.dir === 1
      ? { sSide: "right", tSide: "left" }
      : { sSide: "left",  tSide: "right" };
  };

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

  // Measure the canvas and pick column vs serpentine (+ how many columns fit).
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const w = wrap.clientWidth;
      const serp = w >= SERP_MIN_W;
      const cols = serp
        ? Math.min(MAX_COLS, Math.max(2, Math.floor((w + COL_GAP) / (COL_W + COL_GAP))))
        : 1;
      setLayout((p) => (p.serp === serp && p.cols === cols ? p : { serp, cols }));
      setTick((t) => t + 1);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Measure node ports and build the connector curves.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const box = wrap.getBoundingClientRect();

    const lines = [], labels = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = nodeRefs.current[path[i]], b = nodeRefs.current[path[i + 1]];
      if (!a || !b) continue;
      const { sSide, tSide } = routeFor(i, i + 1);
      const s = portOf(a, sSide, box), t = portOf(b, tSide, box);
      const key = path[i] + ">" + path[i + 1];
      lines.push({ key, d: curveBetween(s, sSide, t, tSide) });
      const from = flow[path[i]];
      if ((from.kind === "decision" || from.kind === "start") && choices[path[i]]) {
        labels.push({
          key, text: choices[path[i]].branch,
          x: (s.x + t.x) / 2, y: (s.y + t.y) / 2,
        });
      }
    }
    if (awaiting && nodeRefs.current[activeId]) {
      const { sSide, tSide } = routeFor(path.length - 1, path.length);
      const s = portOf(nodeRefs.current[activeId], sSide, box);
      activeNode.options.forEach((_, idx) => {
        const bEl = optRefs.current[idx];
        if (bEl) {
          lines.push({
            key: activeId + ">opt" + idx,
            d: curveBetween(s, sSide, portOf(bEl, tSide, box), tSide),
          });
        }
      });
    }
    setConn({ lines, labels, w: wrap.clientWidth, h: wrap.clientHeight });
  }, [path, choices, awaiting, activeId, resizeTick, flow, layout]);

  const finished = activeNode.kind === "done" || activeNode.kind === "note";

  // The fan of option buttons takes the cell the next node would occupy, and is
  // laid out across the connector: horizontal connector → buttons stack; a
  // row-turn (vertical connector) → buttons sit side by side.
  const fanCell  = awaiting && layout.serp ? cellOf(path.length) : null;
  const fanAxis  = awaiting && routeFor(path.length - 1, path.length).sSide === "bottom" ? "h" : "v";

  return (
    <div className="uc-fc-outer">
      {intro && (
        <div className="uc-fc-intro">
          {intro.eyebrow && <p className="uc-fc-intro-eyebrow">{intro.eyebrow}</p>}
          {intro.title && <h2 className="uc-fc-intro-title">{intro.title}</h2>}
          {intro.text && <p className="uc-fc-intro-text">{intro.text}</p>}
        </div>
      )}

      <div className="uc-fc-canvas" ref={wrapRef}
           data-layout={layout.serp ? "serp" : "column"}>
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

        <div className="uc-fc-column"
             style={layout.serp ? {
               gridTemplateColumns: `repeat(${layout.cols}, ${COL_W}px)`,
               columnGap: `${COL_GAP}px`,
             } : undefined}>
          {path.map((id, i) => {
            const isActive = i === path.length - 1;
            const node = flow[id];
            const canRewind =
              !isActive && (node.kind === "decision" || node.kind === "start");
            const cell = layout.serp ? cellOf(i) : null;
            return (
              <div className="uc-fc-slot" key={id}
                   style={cell ? { gridRow: cell.row + 1, gridColumn: cell.col + 1 } : undefined}>
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
            <div className="uc-fc-fan" data-axis={fanAxis}
                 style={fanCell ? { gridRow: fanCell.row + 1, gridColumn: fanCell.col + 1 } : undefined}>
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
          <span className="uc-fc-hint">Tap any diamond to change an answer.</span>
        )}
      </div>
    </div>
  );
}