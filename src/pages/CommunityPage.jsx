import { useNavigate } from "react-router-dom";
import "../styles/CommunityPage.css";

import Feedback from "../components/Community/Feedback.jsx";
import ImportantContacts from "../components/Community/ImportantContacts";
import FacultyAdvisers from "../components/Community/FacultyAdvisers.jsx";

/* Community routing pipe.
   Renders the shared shell (header + tab bar) and swaps in one of the three
   tab components based on the `type` prop passed by the router.

   Expected routes (wire these in your app router):
     /community                      -> <CommunityPage type="feedback" />
     /community/feedback             -> <CommunityPage type="feedback" />
     /community/important-contacts   -> <CommunityPage type="important-contacts" />
     /community/faculty-advisers     -> <CommunityPage type="faculty-advisers" />           */

const TABS = [
  {
    type: "feedback",
    label: "Feedback",
    path: "/community/feedback",
    title: "Feedback",
    intro: "Share academic concerns, suggestions, and issues with the UG Academic Council.",
    Component: Feedback,
  },
  {
    type: "important-contacts",
    label: "Important Contacts",
    path: "/community/important-contacts",
    title: "Important Contacts",
    intro: "Key academic contacts — the council team, courses team, and department chairs, all in one place.",
    Component: ImportantContacts,
  },
  {
    type: "faculty-advisers",
    label: "Faculty Advisers",
    path: "/community/faculty-advisers",
    title: "Faculty Advisers",
    intro: "Faculty advisers for every branch and year, with direct email and profile links.",
    Component: FacultyAdvisers,
  },
];

export default function CommunityPage({ type = "feedback" }) {
  const navigate = useNavigate();
  const active = TABS.find((t) => t.type === type) || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="cm-root">
      <div className="cm-page">
        <header className="cm-head">
          <button className="cm-back" type="button" onClick={() => navigate("/")}>← Back</button>
          <div className="cm-head-body">
            <span className="cm-eyebrow cm-eyebrow--orange">Community</span>
            <h1 className="cm-h1">{active.title}</h1>
            <p className="cm-intro">{active.intro}</p>
          </div>
          <div className="cm-spectrum" aria-hidden>
            {["#4f7cc4", "#4e9b72", "#d18a3e", "#c25b52"].map((c) => (
              <span key={c} style={{ background: c }} />
            ))}
          </div>
        </header>

        <nav className="cm-tabs">
          {TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              className={"cm-tab" + (t.type === active.type ? " is-active" : "")}
              onClick={() => navigate(t.path)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <ActiveComponent />
      </div>
    </div>
  );
}