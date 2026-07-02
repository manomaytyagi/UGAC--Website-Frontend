

export const C = {
  navyDeep: "#0d1b3e",
  navyMid: "#1e3a6e",
  navyLight: "#2e509e",
  orange: "#ee9116",
  white: "#ffffff",
  offWhite: "#edebe7",
  border: "#dce3f0",
  textMuted: "#5a6a8a",
  textDim: "#8a9abc",
  ink: "#101935",
};

// Same hue system the Team page uses, so branch colours line up across pages.
const HUES = {
  blue: ["#6fa3d0", "#4f7cc4", "#37548f"],
  red: ["#d98c80", "#c25b52", "#9c4a52"],
  green: ["#84b88c", "#4e9b72", "#2f6e54"],
  orange: ["#e0aa6b", "#d18a3e", "#a8682c"],
};
const HUE_ORDER = ["blue", "red", "green", "orange"];

// 12 distinct colours (3 shades x 4 hues) for the established branches,
// plus 3 lighter shades reserved for the newer branches.
export const BRANCH_COLORS = [];
for (let s = 0; s < 3; s++)
  for (let h = 0; h < 4; h++) BRANCH_COLORS.push(HUES[HUE_ORDER[h]][s]);
export const NEW_BRANCH_COLORS = [HUES.blue[0], HUES.green[0], HUES.orange[0]];

export function tint(hex, a) {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16),
    g = parseInt(x.slice(2, 4), 16),
    b = parseInt(x.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Contact icons (same set as the Team page)
export const Icon = {
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  ),
};

// Contact chips / compact icon buttons — colour comes from --cc.
export function Contacts({ member, accent = C.navyLight, large = false, onDark = false, compact = false }) {
  if (compact) {
    return (
      <div className="cm-contacts">
        {member.email && (
          <a className="cm-ic" style={{ "--cc": accent }} href={`mailto:${member.email}`} aria-label="Email" title="Email">{Icon.mail}</a>
        )}
        {member.phone && (
          <a className="cm-ic" style={{ "--cc": accent }} href={`tel:${member.phone}`} aria-label="Call" title="Call">{Icon.phone}</a>
        )}
        {member.link && (
          <a className="cm-ic" style={{ "--cc": accent }} href={member.link} target="_blank" rel="noopener noreferrer" aria-label="Profile" title="Profile">{Icon.link}</a>
        )}
      </div>
    );
  }
  const fs = large ? 12.5 : 11.5;
  const chip = (k, href, icon, text, target) => (
    <a key={k} href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      className={"cm-chip" + (onDark ? " is-dark" : "")} style={{ "--cc": accent, fontSize: fs }}>
      <span className="cm-chip-ic">{icon}</span>{text}
    </a>
  );
  return (
    <div className="cm-contacts">
      {member.email && chip("e", `mailto:${member.email}`, Icon.mail, large ? member.email : "Email")}
      {member.phone && chip("p", `tel:${member.phone}`, Icon.phone, large ? member.phone : "Call")}
      {member.link && chip("l", member.link, Icon.link, "Profile", "_blank")}
    </div>
  );
}