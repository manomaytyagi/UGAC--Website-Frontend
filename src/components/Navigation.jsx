import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "./HomePage/LogoIcon.jsx";
import { apiFetch } from "../lib/apiBridge";

const navLinks = [
  "Team",
  "Events",
  "Courses",
  "Curriculum",
  "Resources",
  "Faculty Contacts",
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
  "Faculty Contacts": "/faculty-contacts",
};
// Links that are plain router pushes rather than section scrolls.
const directPaths = {
  "Faculty Contacts": "/faculty-contacts",
};

export default function Navigation({
  scrolled,
  onNavigate,
  onPageNavigate = {},
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeLink, setActiveLink] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Bell badge: count of active announcements from the last 14 days. Re-checked
  // when the user navigates back to the home tab so it stays fresh.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch("/api/v1/announcements", []);
        if (!alive) return;
        const list = Array.isArray(res.data) ? res.data : [];
        const cutoff = Date.now() - 14 * 86400000;
        const n = list.filter(
          (a) => !a.publishedAt || new Date(a.publishedAt).getTime() >= cutoff,
        ).length;
        setUnreadCount(n);
      } catch {
        /* badge is optional — silently skip on failure */
      }
    })();
    return () => { alive = false; };
  }, [location.pathname]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleSectionNavigate = (link) => {
    setActiveLink(link);

    const directPath = directPaths[link];
    if (directPath) {
      navigate(directPath);
      return;
    }

    const routeAction = routeLinks[link];
    if (routeAction) {
      onPageNavigate[routeAction]?.();
      return;
    }

    onNavigate(link.toLowerCase());
  };

  const handleMobileNav = (link) => {
    setMobileOpen(false);
    handleSectionNavigate(link);
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
          {navLinks.map((link) => (
            <button
              key={link}
              className={`site-nav__link ${isActiveLink(link) ? "site-nav__link--active" : ""}`}
              type="button"
              onClick={() => handleSectionNavigate(link)}
            >
              {link}
            </button>
          ))}

          <button
            className={`site-nav__bell ${location.pathname.startsWith("/announcements") ? "site-nav__bell--active" : ""}`}
            type="button"
            onClick={() => navigate("/announcements")}
            aria-label={`Announcements${unreadCount > 0 ? `, ${unreadCount} new` : ""}`}
            title="Announcements"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="site-nav__bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>
        </div>

        <button
          className={`hamburger ${mobileOpen ? "hamburger--open" : ""}`}
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu is-open">
          {navLinks.map((link) => (
            <button
              key={link}
              className={`mobile-menu__link ${isActiveLink(link) ? "mobile-menu__link--active" : ""}`}
              type="button"
              onClick={() => handleMobileNav(link)}
            >
              {link}
            </button>
          ))}

          <button
            className={`mobile-menu__link ${location.pathname.startsWith("/announcements") ? "mobile-menu__link--active" : ""}`}
            type="button"
            onClick={() => { setMobileOpen(false); navigate("/announcements"); }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Announcements
            {unreadCount > 0 && (
              <span style={{
                marginLeft: "auto",
                minWidth: 18,
                height: 18,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "var(--saffron)",
                color: "var(--white)",
                fontSize: 10,
                fontWeight: 800,
                padding: "0 5px",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      )}
    </nav>
  );
}