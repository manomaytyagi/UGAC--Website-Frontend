import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "./HomePage/LogoIcon.jsx";

const navLinks = [
  "Team",
  "Events",
  "Courses",
  "Curriculum",
  "Resources",
  "Community",
];
const communityLinks = [
  { label: "Feedback", path: "/community/feedback" },
  { label: "Important Contacts", path: "/community/important-contacts" },
  { label: "Faculty Advisers", path: "/community/faculty-advisers" },
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
  const navigate = useNavigate();
  const [activeLink, setActiveLink] = useState("");
  const [communityOpen, setCommunityOpen] = useState(false);

  // Hover-intent: keep the dropdown open while the cursor crosses the gap
  // between the "Community" button and the menu. A short delay before closing
  // is cancelled the instant the cursor re-enters the dropdown (button OR menu).
  const closeTimer = useRef(null);
  const openMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setCommunityOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setCommunityOpen(false), 220);
  };
  const closeNow = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setCommunityOpen(false);
  };
  useEffect(() => () => closeTimer.current && clearTimeout(closeTimer.current), []);

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
              <div
                className="site-nav__dropdown"
                key={link}
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
                onFocus={openMenu}
                onBlur={(e) => {
                  // Only close once focus has actually left the whole dropdown
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    closeNow();
                  }
                }}
              >
                <button
                  className={`site-nav__link ${isActiveLink(link) ? "site-nav__link--active" : ""}`}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={communityOpen}
                  onClick={() => {
                    // Tap-to-toggle for touch devices; this button never
                    // navigates on its own, it only reveals the dropdown.
                    setCommunityOpen((open) => !open);
                  }}
                >
                  Community
                </button>
                <div
                  className={`site-nav__menu ${communityOpen ? "site-nav__menu--open" : ""}`}
                  // Drive visibility AND clickability from the same state so a
                  // hover that reveals the menu also makes its links selectable
                  // immediately — no need to click "Community" first.
                  style={{
                    opacity: communityOpen ? 1 : 0,
                    visibility: communityOpen ? "visible" : "hidden",
                    pointerEvents: communityOpen ? "auto" : "none",
                  }}
                >
                  {/* Transparent bridge: keeps the hover area continuous across
                      the gap between the button and the menu so the cursor never
                      leaves the dropdown on its way down. */}
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: "100%",
                      height: 16,
                    }}
                  />
                  {communityLinks.map((item) => (
                    <button
                      key={item.label}
                      className={`site-nav__menu-link ${location.pathname === item.path ? "site-nav__menu-link--active" : ""}`}
                      type="button"
                      onClick={() => {
                        closeNow();
                        navigate(item.path);
                      }}
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