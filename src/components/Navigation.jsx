import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LogoIcon from "./HomePage/LogoIcon.jsx";
import { apiFetch } from "../lib/apiBridge";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCommunityOpen, setMobileCommunityOpen] = useState(false);
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

  const handleMobileNav = (link) => {
    setMobileOpen(false);
    handleSectionNavigate(link);
  };

  const handleMobileCommunity = (path) => {
    setMobileOpen(false);
    setCommunityOpen(false);
    navigate(path);
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
                  className={`site-nav__link site-nav__link--dropdown ${isActiveLink(link) ? "site-nav__link--active" : ""}`}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={communityOpen}
                  onClick={() => {
                    // Tap-to-toggle for touch devices; this button never
                    // navigates on its own, it only reveals the dropdown.
                    setCommunityOpen((open) => !open);
                  }}
                >
                  <span>Community</span>
                  <span
                    className="site-nav__caret"
                    aria-hidden="true"
                    style={{
                      transform: communityOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
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
                      <span>{item.label}</span>
                      <span aria-hidden="true" style={{ opacity: 0.7, fontSize: 12 }}>→</span>
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
          {navLinks.map((link) =>
            link === "Community" ? (
              <div key={link} style={{ width: "100%" }}>
                <button
                  className={`mobile-menu__link ${isActiveLink(link) ? "mobile-menu__link--active" : ""}`}
                  type="button"
                  onClick={() => setMobileCommunityOpen((open) => !open)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}
                  aria-expanded={mobileCommunityOpen}
                >
                  <span>Community</span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 12,
                      transform: mobileCommunityOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  >
                    ▾
                  </span>
                </button>
                {mobileCommunityOpen && (
                  <div style={{ paddingLeft: 16, display: "flex", flexDirection: "column" }}>
                    {communityLinks.map((item) => (
                      <button
                        key={item.label}
                        className={`mobile-menu__link ${location.pathname === item.path ? "mobile-menu__link--active" : ""}`}
                        type="button"
                        onClick={() => handleMobileCommunity(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={link}
                className={`mobile-menu__link ${isActiveLink(link) ? "mobile-menu__link--active" : ""}`}
                type="button"
                onClick={() => handleMobileNav(link)}
              >
                {link}
              </button>
            ),
          )}

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