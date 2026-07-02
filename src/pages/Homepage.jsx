import { useNavigate } from "react-router-dom";
import Hero from "../components/HomePage/Hero.jsx";
import Team from "../components/HomePage/Team.jsx";
import Events from "../components/HomePage/Events.jsx";
import CoursesPreview from "../components/HomePage/CoursesPreview.jsx";
import Resources from "../components/HomePage/Resources.jsx";
import Contact from "../components/HomePage/Contact.jsx";
import Footer from "../components/HomePage/Footer.jsx";

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
