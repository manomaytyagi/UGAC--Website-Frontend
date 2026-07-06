import { useParams, useNavigate } from "react-router-dom";
import { getProcedure } from "./registry";
import { COLORS as C } from "../../styles/colors.js";

/* ──────────────────────────────────────────────────────────────────────────
   PROCEDURE PAGE — routed wrapper.
   Rendered at:  /resources/procedures/:slug
   Looks the slug up in the registry and renders that procedure's component
   inside a page shell matching the Resources header. Add the route once in
   your router (see ROUTING.md); new procedures need no further routing.
   ────────────────────────────────────────────────────────────────────────── */

export default function ProcedurePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const proc = getProcedure(slug);

  const goBack = () => navigate("/resources", { state: { tab: "procedures" } });

  if (!proc) {
    return (
      <div style={S.page}>
        <div style={S.header}>
          <button style={S.backBtn} onClick={goBack}>← Back</button>
          <div>
            <p style={S.eyebrow}>UGAC · IIT Mandi</p>
            <h1 style={S.h1}>Procedure not found</h1>
            <p style={S.subtitle}>
              We couldn’t find a procedure called “{slug}”. It may have been
              moved or renamed.
            </p>
          </div>
        </div>
        <div style={S.container}>
          <button style={S.primaryBtn} onClick={goBack}>
            Back to procedures
          </button>
        </div>
      </div>
    );
  }

  const Procedure = proc.Component;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={goBack}>← Back</button>
        <div>
          <p style={S.eyebrow}>UGAC · IIT Mandi · Procedures</p>
          <h1 style={S.h1}>{proc.icon} {proc.title}</h1>
          {proc.desc && <p style={S.subtitle}>{proc.desc}</p>}
        </div>
      </div>

      <div style={S.container}>
        <Procedure />
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: C.offWhite,
    padding: "104px 24px 80px",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: C.ink,
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 32px",
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
  },
  backBtn: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: C.navyMid,
    marginTop: 6,
    flexShrink: 0,
    fontFamily: "inherit",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.orange,
    margin: "0 0 6px",
  },
  h1: {
    fontSize: "clamp(28px, 4vw, 42px)",
    fontWeight: 800,
    letterSpacing: -1,
    color: C.navyDeep,
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    margin: 0,
    lineHeight: 1.6,
    maxWidth: 640,
  },
  container: { maxWidth: 1100, margin: "0 auto" },
  primaryBtn: {
    background: C.navyDeep,
    color: C.white,
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};