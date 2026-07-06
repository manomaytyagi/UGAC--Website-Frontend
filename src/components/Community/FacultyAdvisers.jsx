import { useEffect, useState } from "react";
import { Contacts } from "./Contacts";
import { apiFetch, branchMeta } from "../../lib/apiBridge";
import "../../styles/CommunityPage.css";

const ESTABLISHED = [
  ["CSE", "Computer Science and Engineering"],
  ["DSE", "Data Science and Engineering"],
  ["DSAI", "Data Science and Artificial Intelligence"],
  ["EE", "Electrical Engineering"],
  ["ME", "Mechanical Engineering"],
  ["CE", "Civil Engineering"],
  ["EP", "Engineering Physics"],
  ["BE", "Bioengineering"],
  ["MC", "Mathematics and Computing"],
  ["MSE", "Materials Science and Engineering"],
  ["CHE", "Chemical Engineering"],
  ["GE", "General Engineering"],
  ["VLSI", "Microelectronics and VLSI"],
  ["AE", "Agricultural Engineering with Data Analytics"],
  ["QST", "Quantum Science and Technology"],
  ["CEDA", "Chemical Engineering with Data Analytics"],
];

const YEAR = ["1st", "2nd", "3rd", "4th"];
const NAME_POOL = [
  "Dr. A. Rao", "Prof. S. Nair", "Dr. M. Iyer", "Prof. R. Gupta",
  "Dr. K. Menon", "Prof. V. Sharma", "Dr. P. Bose", "Prof. N. Das",
];

function buildFallback() {
  return ESTABLISHED.map(([code, name], bi) => {
    const meta = branchMeta(code);
    const n = (bi % 4) + 1;
    const advisers = Array.from({ length: n }, (_, i) => ({
      name: NAME_POOL[(bi + i) % NAME_POOL.length],
      email: `fa.${code.toLowerCase()}.y${i + 1}@iitmandi.ac.in`,
      link: "#",
      office: null,
      batch: i + 1,
      batchLabel: `${YEAR[i]} Year`,
    }));
    return { id: code, code, name: meta.name || name, color: meta.color, advisers, count: advisers.length };
  });
}
const FALLBACK = buildFallback();

function SourceBadge({ source }) {
  if (source === "loading")
    return <div className="cmx-note"><span className="cmx-badge cmx-badge--load">Loading…</span> Fetching advisers from the API.</div>;
  if (source === "live")
    return <div className="cmx-note"><span className="cmx-badge cmx-badge--live">Live</span> Showing the live adviser roster from the API.</div>;
  return <div className="cmx-note"><span className="cmx-badge cmx-badge--sample">Sample</span> Sample structure — connect the API for the live roster.</div>;
}

function AdviserCard({ entry, color, branchName }) {
  const has = entry.name && entry.name.trim();
  return (
    <article className="cm-year-card" style={{ "--c": color, "--cbg": `${color}1a` }}>
      {entry.batchLabel && (
        <span className="cm-year-label cmx-batch" style={{ "--c": color }}>{entry.batchLabel}</span>
      )}
      <h4 className={"cm-year-name" + (has ? "" : " cmx-muted")}>{has ? entry.name : "To be announced"}</h4>
      <p className="cm-year-role">{branchName}</p>
      {entry.office && <p className="cmx-office">{entry.office}</p>}
      {has && <Contacts member={entry} accent={color} />}
    </article>
  );
}

function BranchDetail({ branch, branches, onBack, onSwitch }) {
  const c = branch.color;
  return (
    <div className="cm-adv-detail" style={{ "--c": c, "--cbg": `${c}14`, "--cbd": `${c}52` }}>
      <div className="cm-adv-head">
        <button className="cm-back" type="button" onClick={onBack} aria-label="Back to branches">←</button>
        <span className="cm-code cm-code--lg" style={{ background: c }}>{branch.code}</span>
        <div>
          <span className="cm-eyebrow" style={{ color: c }}>
            Faculty advisers · {branch.count} {branch.count === 1 ? "adviser" : "advisers"}
          </span>
          <h2 className="cm-adv-title">{branch.name}</h2>
        </div>
      </div>

      <div className="cm-adv-grid">
        <div>
          <p className="cm-switch-label">By batch</p>
          <div className="cm-year-grid">
            {branch.advisers.length === 0 && (
              <div className="cm-adv-empty">No faculty advisers listed for this branch yet.</div>
            )}
            {branch.advisers.map((a, i) => (
              <AdviserCard key={i} entry={a} color={c} branchName={branch.name} />
            ))}
          </div>
        </div>

        <div className="cm-switch-wrap">
          <p className="cm-switch-label">Jump to another branch</p>
          <div className="cm-switch-grid">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                className={"cm-switch-tile" + (b.id === branch.id ? " is-active" : "")}
                onClick={() => onSwitch(b)}
                style={{ "--c": b.color, "--cbg": `${b.color}${b.id === branch.id ? "26" : "10"}`, "--cbd": `${b.color}4d` }}
              >
                <span className="cm-code cm-code--sm" style={{ background: b.color }}>{b.code}</span>
                <span className="cm-switch-name">{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FacultyAdvisers() {
  const [branches, setBranches] = useState(FALLBACK);
  const [source, setSource] = useState("loading");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/v1/faculty-advisers", FALLBACK).then(({ data, source }) => {
      if (!alive) return;
      setBranches(data);
      setSource(source);
    });
    return () => { alive = false; };
  }, []);

  // Keep the open detail pointing at the freshest copy of that branch.
  const openBranch = open ? branches.find((b) => b.id === open.id) || open : null;

  if (openBranch) {
    return (
      <BranchDetail
        branch={openBranch}
        branches={branches}
        onBack={() => setOpen(null)}
        onSwitch={setOpen}
      />
    );
  }

  return (
    <div>
      <SourceBadge source={source} />
      <div className="cm-branch-grid">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            className="cm-branch-tile"
            style={{ "--c": b.color, "--cbg": `${b.color}14`, "--cbd": `${b.color}57` }}
            onClick={() => setOpen(b)}
          >
            <span className="cm-branch-bar" aria-hidden />
            <span className="cm-code" style={{ background: b.color }}>{b.code}</span>
            <span className="cm-branch-name">{b.name}</span>
            <span className="cm-branch-meta">
              {b.count} {b.count === 1 ? "adviser" : "advisers"}
            </span>
            <span className="cm-branch-cta">View advisers <span aria-hidden>→</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}