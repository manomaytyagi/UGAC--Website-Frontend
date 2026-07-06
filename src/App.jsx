import { useEffect, useState } from "react";
import { Navigate, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import Homepage from "./pages/Homepage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import CourseDetailPage from "./pages/CourseDetailPage.jsx";
import CurriculumPage from "./pages/CurriculumPage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import ProcedurePage from "./components/Resources/ProceduresPage.jsx";
import FeedbackForm from "./pages/FeedbackForm.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [pendingSection, setPendingSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    onScroll();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/" || !pendingSection) return;

    requestAnimationFrame(() => {
      document
        .getElementById(pendingSection)
        ?.scrollIntoView({ behavior: "smooth" });
      setPendingSection("");
    });
  }, [location.pathname, pendingSection]);

  const scrollTo = (id) => {
    if (location.pathname !== "/") {
      setPendingSection(id);
      navigate("/");
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Navigation
        scrolled={scrolled}
        onNavigate={scrollTo}
        onPageNavigate={{
          courses: () => navigate("/courses"),
          events: () => navigate("/events"),
          curriculum: () => navigate("/curriculum"),
          resources: () => navigate("/resources"),
          team: () => navigate("/team"),
        }}
      />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/events" element={<EventsPage onBack={() => navigate("/")} />}/>
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/curriculum" element={<CurriculumPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/resources/procedures/:slug" element={<ProcedurePage />} />
        
        <Route path="/community" element={<Navigate to="/community/feedback" replace />} />
        <Route path="/community/feedback" element={<CommunityPage type="feedback" />} />
        <Route
          path="/community/important-contacts"
          element={<CommunityPage type="important-contacts" />}
        />
        <Route
          path="/community/faculty-advisers"
          element={<CommunityPage type="faculty-advisers" />}
        />
        <Route path="/feedback" element={<FeedbackForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
