import { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navigation from "./components/Navigation.jsx";
import Homepage from "./pages/Homepage.jsx";
import TeamPage from "./pages/TeamPage.jsx";
import EventsPage from "./pages/EventsPage.jsx";
import CoursesPage from "./pages/CoursesPage.jsx";
import CourseDetailPage from "./pages/CourseDetailPage.jsx";
import CurriculumPage from "./pages/CurriculumPage.jsx";
import ResourcesPage from "./pages/ResourcesPage.jsx";
import FeedbackForm from "./pages/FeedbackForm.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";

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
          communityBlogs: () => navigate("/community/blogs"),
          communityAcademics: () => navigate("/community/academics"),
          communityCrs: () => navigate("/community/crs"),
          feedback: () => navigate("/community/feedback"),
          team: () => navigate("/team"),
        }}
      />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/curriculum" element={<CurriculumPage />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route
          path="/events"
          element={<EventsPage onBack={() => navigate("/")} />}
        />
        <Route
          path="/community/blogs"
          element={<CommunityPage type="blogs" />}
        />
        <Route
          path="/community/academics"
          element={<CommunityPage type="academics" />}
        />
        <Route
          path="/community/academics/procedure"
          element={<CommunityPage type="procedure" />}
        />
        <Route
          path="/community/academics/procedure/:slug"
          element={<CommunityPage type="procedure" />}
        />
        <Route
          path="/community/academics/opportunities"
          element={<CommunityPage type="opportunities" />}
        />
        <Route
          path="/community/academics/awards"
          element={<CommunityPage type="awards" />}
        />
        <Route path="/community/feedback" element={<FeedbackForm />} />
        <Route path="/feedback" element={<FeedbackForm />} />
        <Route path="/community/crs" element={<CommunityPage type="crs" />} />
      </Routes>
    </>
  );
}
