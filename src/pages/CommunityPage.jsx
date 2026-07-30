import { useNavigate } from "react-router-dom";
import "../styles/CommunityPage.css";

import Feedback from "../components/FacultyContacts/Feedback.jsx";
import DeansAndSchools from "../components/FacultyContacts/DeansAndSchools.jsx";
import FacultyAdvisors from "../components/FacultyContacts/FacultyAdvisors.jsx";

const TABS = [
  {
    type: "deans-and-schools",
    label: "Deans & Schools",
    path: "/faculty-contacts/deans-and-schools",
    title: "Deans & Schools",
    intro:
      "Institute leadership, the student council, school chairs, and academic offices in one place.",
    Component: DeansAndSchools,
  },
  {
    type: "faculty-advisers",
    label: "Faculty Advisors",
    path: "/faculty-contacts/faculty-advisers",
    title: "Faculty Advisors",
    intro:
      "Faculty advisors for every branch and year, with direct email and profile links.",
    Component: FacultyAdvisors,
  },
  {
    type: "feedback",
    label: "Feedback",
    path: "/faculty-contacts/feedback",
    title: "Feedback",
    intro:
      "Share academic concerns, suggestions and issues with the UG Academic Council.",
    Component: Feedback,
  },
];

export default function CommunityPage({ type = "deans-and-schools" }) {
  const navigate = useNavigate();
  const active = TABS.find((t) => t.type === type) || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="cm-root">
      <div className="cm-page">
        <header className="cm-head">
          <button
            className="cm-back"
            type="button"
            onClick={() => navigate("/")}
          >
            Back
          </button>
          <div className="cm-head-body">
            <span className="cm-eyebrow cm-eyebrow--orange">Faculty Contacts</span>
            <h1 className="cm-h1">{active.title}</h1>
            <p className="cm-intro">{active.intro}</p>
          </div>
        </header>

        <nav className="cm-tabs" aria-label="Faculty contacts sections">
          {TABS.map((t) => (
            <button
              key={t.type}
              type="button"
              className={
                "cm-tab" + (t.type === active.type ? " is-active" : "")
              }
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
