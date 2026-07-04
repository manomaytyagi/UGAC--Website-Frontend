import { useState } from "react";
import { Contacts, BRANCH_COLORS, NEW_BRANCH_COLORS } from "./contacts";

/* Faculty advisers, grouped by branch and year.
   12 established branches x 4 years (48) + 3 newer branches with a
   first-year adviser only (3) = 51 advisers.

   NOTE: adviser names/emails are placeholders on the @iitmandi.ac.in
   pattern — replace with the live roster or feed this array from an API. */

const ESTABLISHED = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "DSE", name: "Data Science & Engineering" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "EP", name: "Engineering Physics" },
  { code: "BE", name: "Bioengineering" },
  { code: "MC", name: "Mathematics & Computing" },
  { code: "MSE", name: "Materials Science & Engineering" },
  { code: "CHE", name: "Chemical Engineering" },
  { code: "GE", name: "General Engineering" },
  { code: "VLSI", name: "Microelectronics & VLSI" },
];

const NEW_BRANCHES = [
  { code: "AI", name: "Artificial Intelligence" },
  { code: "QST", name: "Quantum Science & Technology" },
  { code: "ENR", name: "Energy Engineering" },
];

const YEAR_LABELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

// Build an adviser slot for a given branch + year.
function adviser(code, n) {
  return {
    name: "Faculty Adviser",
    email: `fa.${code.toLowerCase()}.y${n}@iitmandi.ac.in`,
    link: "#",
  };
}

// Assemble the full branch list with per-year advisers.
const BRANCHES = [
  ...ESTABLISHED.map((b, i) => ({
    ...b,
    id: b.code,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length],
    isNew: false,
    years: [1, 2, 3, 4].map((n) => ({ year: n, adviser: adviser(b.code, n) })),
  })),
  ...NEW_BRANCHES.map((b, i) => ({
    ...b,
    id: b.code,
    color: NEW_BRANCH_COLORS[i % NEW_BRANCH_COLORS.length],
    isNew: true,
    years: [1].map((n) => ({ year: n, adviser: adviser(b.code, n) })),
  })),
];

function YearCard({ entry, color, branchName }) {
  return (
    <article className="cm-year-card" style={{ "--c": color, "--cbg": `${color}1a` }}>
      <span className="cm-year-label">{YEAR_LABELS[entry.year - 1]}</span>
      <h4 className="cm-year-name">{entry.adviser.name}</h4>
      <p className="cm-year-role">{branchName}</p>
      <Contacts member={entry.adviser} accent={color} />
    </article>
  );
}

function BranchDetail({ branch, onBack, onSwitch }) {
  const c = branch.color;
  return (
    <div className="cm-adv-detail" style={{ "--c": c, "--cbg": `${c}14`, "--cbd": `${c}52` }}>
      <div className="cm-adv-head">
        <button className="cm-back" type="button" onClick={onBack} aria-label="Back to branches">←</button>
        <span className="cm-code cm-code--lg" style={{ background: c }}>{branch.code}</span>
        <div>
          <span className="cm-eyebrow" style={{ color: c }}>Faculty advisers</span>
          <h2 className="cm-adv-title">{branch.name}</h2>
        </div>
      </div>

      <div className="cm-adv-grid">
        <div>
          <p className="cm-switch-label">By year</p>
          <div className="cm-year-grid">
            {branch.years.map((y) => (
              <YearCard key={y.year} entry={y} color={c} branchName={branch.name} />
            ))}
            {branch.isNew && (
              <div className="cm-adv-empty">
                A newer branch — advisers for later years are assigned as the batches progress.
              </div>
            )}
          </div>
        </div>

        <div className="cm-switch-wrap">
          <p className="cm-switch-label">Jump to another branch</p>
          <div className="cm-switch-grid">
            {BRANCHES.map((b) => (
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
  const [open, setOpen] = useState(null);

  if (open) {
    return <BranchDetail branch={open} onBack={() => setOpen(null)} onSwitch={setOpen} />;
  }

  return (
    <div>
      <div className="cm-note">
        <span className="cm-chip-ic" style={{ color: "#ee9116" }}>●</span>
        Sample roster — {ESTABLISHED.length} branches × 4 years + {NEW_BRANCHES.length} new (1st year) = {ESTABLISHED.length * 4 + NEW_BRANCHES.length} advisers. Replace with live data.
      </div>

      <div className="cm-branch-grid">
        {BRANCHES.map((b) => (
          <button
            key={b.id}
            type="button"
            className="cm-branch-tile"
            style={{ "--c": b.color, "--cbg": `${b.color}14`, "--cbd": `${b.color}57` }}
            onClick={() => setOpen(b)}
          >
            <span className="cm-branch-bar" aria-hidden />
            {b.isNew && <span className="cm-new-flag">New</span>}
            <span className="cm-code" style={{ background: b.color }}>{b.code}</span>
            <span className="cm-branch-name">{b.name}</span>
            <span className="cm-branch-meta">
              {b.years.length} {b.years.length === 1 ? "adviser" : "advisers"}
            </span>
            <span className="cm-branch-cta">View advisers <span aria-hidden>→</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}