import { useState } from "react";
import { useLocation } from "react-router-dom";
import LogoIcon from "./LogoIcon.jsx";

const navLinks = ["Team", "Events", "Courses", "Curriculum", "Resources", "Community"];
const communityLinks = [
  { label: "Blogs", action: "communityBlogs", path: "/community/blogs" },
  {
    label: "Academics",
    action: "communityAcademics",
    path: "/community/academics",
  },
  { label: "Feedback", action: "feedback", path: "/community/feedback" },
  { label: "CRs", action: "communityCrs", path: "/community/crs" },
];
const routeLinks = {
  Team: "team",
  Events: "events",
  Courses: "courses",
  Curriculum: "curriculum",
  Resources: "resources",
};
const routePaths = {
  Team: "/team",
  Events: "/events",
  Courses: "/courses",
  Curriculum: "/curriculum",
  Resources: "/resources",
  Community: "/community",
};

export default function Navigation({
  scrolled,
  onNavigate,
  onPageNavigate = {},
}) {
  const location = useLocation();
  const [activeLink, setActiveLink] = useState("");

  const handleSectionNavigate = (link) => {
    setActiveLink(link);
    const routeAction = routeLinks[link];
    if (routeAction) {
      onPageNavigate[routeAction]?.();
      return;
    }

    onNavigate(link.toLowerCase());
  };

  const isActiveLink = (link) => {
    const routePath = routePaths[link];
    if (routePath) {
      return (
        location.pathname === routePath ||
        location.pathname.startsWith(`${routePath}/`)
      );
    }

    return activeLink === link;
  };

  return (
    <nav className={`site-nav ${scrolled ? "site-nav--scrolled" : ""}`}>
      <div className="site-nav__inner">
        <button
          className="logo-button"
          type="button"
          onClick={() => onNavigate("hero")}
        >
          <LogoIcon size={38} />
          <span className="logo-button__text">
            <span className="logo-button__title">UG Academic Council</span>
            <span className="logo-button__subtitle">IIT Mandi</span>
          </span>
        </button>

        <div className="site-nav__links">
          {navLinks.map((link) =>
            link === "Community" ? (
              <div className="site-nav__dropdown" key={link}>
                <button
                  className={`site-nav__link ${isActiveLink(link) ? "site-nav__link--active" : ""}`}
                  type="button"
                  onClick={() => onPageNavigate.communityBlogs?.()}
                >
                  Community
                </button>
                <div className="site-nav__menu">
                  {communityLinks.map((item) => (
                    <button
                      key={item.label}
                      className={`site-nav__menu-link ${location.pathname === item.path ? "site-nav__menu-link--active" : ""}`}
                      type="button"
                      onClick={() => onPageNavigate[item.action]?.()}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                key={link}
                className={`site-nav__link ${isActiveLink(link) ? "site-nav__link--active" : ""}`}
                type="button"
                onClick={() => handleSectionNavigate(link)}
              >
                {link}
              </button>
            ),
          )}
        </div>
      </div>
    </nav>
  );
}
