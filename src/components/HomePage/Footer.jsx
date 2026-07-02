import LogoIcon from "./LogoIcon.jsx";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <LogoIcon size={26} />
          <span>UG Academic Council | IIT Mandi</span>
        </div>
        <span className="site-footer__note">
          Copyright 2026 UGAC. All rights reserved.
        </span>
      </div>
    </footer>
  );
}
