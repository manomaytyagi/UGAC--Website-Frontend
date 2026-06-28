import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero.jsx";
import Team from "../components/Team.jsx";
import Events from "../components/Events.jsx";
import CoursesPreview from "../components/CoursesPreview.jsx";
import Resources from "../components/Resources.jsx";
import Contact from "../components/Contact.jsx";
import Footer from "../components/Footer.jsx";

export default function Homepage() {
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <Hero
        onCourses={() => navigate("/courses")}
        onFeedback={() => navigate("/community/feedback")}
      />

      <Team />
      <Events />
      <CoursesPreview
        onCourses={() => navigate("/courses")}
        onCurriculum={() => navigate("/curriculum")}
      />
      <Resources onFeedback={() => navigate("/community/feedback")} />
      <Contact />
      <Footer />
    </div>
  );
}
