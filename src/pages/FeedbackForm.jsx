import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FORMSPREE_ID } from "../lib/apiBridge.js";
import { FEEDBACK_COLORS as C } from "../styles/colors.js";

const CATEGORIES = ["Academic", "Administrative", "Other"];

function Field({ label, error, children }) {
  return (
    <div style={S.field}>
      <label style={S.label}>{label}</label>
      {children}
      {error && <p style={S.errorMsg}>{error}</p>}
    </div>
  );
}

export default function FeedbackForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    roll: "",
    category: "Academic",
    message: "",
    anonymous: false,
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); 
  const [serverError, setServerError] = useState("");

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e = {};
    if (!form.anonymous && !form.name.trim())
      e.name = "Name is required unless submitting anonymously.";
    if (!form.anonymous && !form.roll.trim())
      e.roll = "Roll number is required unless submitting anonymously.";
    if (form.message.trim().length < 20)
      e.message = "Message must be at least 20 characters.";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setStatus("submitting");
    setServerError("");

    const payload = {
      category: form.category,
      message: form.message,
      ...(form.anonymous
        ? { name: "Anonymous", roll: "N/A" }
        : { name: form.name, roll: form.roll }),
    };

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submission failed. Please try again.");
      setStatus("success");
    } catch (err) {
      setServerError(err.message);
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={S.page}>
        <div style={S.card}>
          <div style={S.successIcon}></div>
          <h2 style={S.successTitle}>Submitted successfully</h2>
          <p style={S.successMsg}>
            Your grievance/feedback has been received. The Academic Affairs
            Secretary will review it and follow up if needed.
          </p>
          <button
            style={S.btnPrimary}
            onClick={() => {
              setStatus("idle");
              setForm({
                name: "",
                roll: "",
                category: "Academic",
                message: "",
                anonymous: false,
              });
            }}
          >
            Submit another
          </button>
          <button style={S.btnGhost} onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <button style={S.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div style={S.cardHeader}>
          <p style={S.eyebrow}>UGAC · IIT Mandi</p>
          <h1 style={S.h1}>Grievance &amp; Feedback Form</h1>
          <p style={S.subtitle}>
            Raise academic or administrative concerns directly with the council.
            All submissions are reviewed by the Academic Affairs Secretary.
          </p>
        </div>

        {}
        <div style={S.anonBox}>
          <label style={S.anonLabel}>
            <div style={S.anonTextWrap}>
              <span style={S.anonTitle}>Submit anonymously</span>
              <span style={S.anonHint}>
                Your name and roll number will not be included in the
                submission.
              </span>
            </div>
            <div
              style={{ ...S.toggle, ...(form.anonymous ? S.toggleOn : {}) }}
              onClick={() => set("anonymous", !form.anonymous)}
            >
              <div
                style={{
                  ...S.toggleKnob,
                  ...(form.anonymous ? S.toggleKnobOn : {}),
                }}
              />
            </div>
          </label>
        </div>

        {}
        {!form.anonymous && (
          <div style={S.twoCol}>
            <Field label="Full name *" error={errors.name}>
              <input
                style={{ ...S.input, ...(errors.name ? S.inputError : {}) }}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Aditya Tayal"
              />
            </Field>
            <Field label="Roll number *" error={errors.roll}>
              <input
                style={{ ...S.input, ...(errors.roll ? S.inputError : {}) }}
                value={form.roll}
                onChange={(e) => set("roll", e.target.value)}
                placeholder="e.g. B21CS001"
              />
            </Field>
          </div>
        )}

        {}
        <Field label="Category *">
          <div style={S.categoryRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                style={{
                  ...S.categoryBtn,
                  ...(form.category === cat ? S.categoryBtnActive : {}),
                }}
                onClick={() => set("category", cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </Field>

        {}
        <Field label="Message *" error={errors.message}>
          <textarea
            style={{
              ...S.input,
              ...S.textarea,
              ...(errors.message ? S.inputError : {}),
            }}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Describe your concern or feedback in detail (minimum 20 characters)…"
            rows={6}
          />
          <p style={S.charCount}>{form.message.length} / 20 min</p>
        </Field>

        {}
        {status === "error" && serverError && (
          <div style={S.serverError}>{serverError}</div>
        )}

        {}
        <button
          style={{
            ...S.btnPrimary,
            opacity: status === "submitting" ? 0.6 : 1,
          }}
          disabled={status === "submitting"}
          onClick={handleSubmit}
        >
          {status === "submitting" ? "Submitting…" : "Submit →"}
        </button>

        <p style={S.disclaimer}>
          Submissions are processed via Formspree and forwarded directly to the
          Academic Affairs Secretary. Anonymous submissions are fully
          confidential — no identifying information is logged.
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: C.offWhite,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "48px 24px 64px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "40px 40px",
    width: "100%",
    maxWidth: 620,
    boxShadow: "0 4px 32px rgba(13,27,62,0.07)",
  },
  backBtn: {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "7px 14px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: C.navyMid,
    marginBottom: 28,
  },
  cardHeader: { marginBottom: 32 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    color: C.orange,
    marginBottom: 8,
  },
  h1: {
    fontSize: 26,
    fontWeight: 800,
    color: C.navyDeep,
    margin: "0 0 10px",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, lineHeight: 1.7, color: C.textMuted, margin: 0 },

  anonBox: {
    background: C.offWhite,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    marginBottom: 24,
  },
  anonLabel: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    gap: 16,
  },
  anonTextWrap: { display: "flex", flexDirection: "column", gap: 3 },
  anonTitle: { fontSize: 14, fontWeight: 700, color: C.navyDeep },
  anonHint: { fontSize: 12, color: C.textMuted },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    background: C.border,
    position: "relative",
    flexShrink: 0,
    cursor: "pointer",
    transition: "background 0.2s",
  },
  toggleOn: { background: C.orange },
  toggleKnob: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: C.white,
    transition: "left 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  },
  toggleKnobOn: { left: 23 },

  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginBottom: 4,
  },
  field: { marginBottom: 20 },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: C.navyDeep,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: `1px solid ${C.border}`,
    borderRadius: 9,
    padding: "11px 14px",
    fontSize: 14,
    color: C.navyDeep,
    background: C.offWhite,
    outline: "none",
    fontFamily: "inherit",
  },
  inputError: { borderColor: C.error },
  textarea: { resize: "vertical", minHeight: 120 },
  errorMsg: { fontSize: 12, color: C.error, margin: "5px 0 0" },
  charCount: {
    fontSize: 11,
    color: C.textDim,
    margin: "5px 0 0",
    textAlign: "right",
  },

  categoryRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  categoryBtn: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: C.textMuted,
    cursor: "pointer",
  },
  categoryBtnActive: {
    background: C.navyDeep,
    color: C.white,
    borderColor: C.navyDeep,
  },

  serverError: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    color: C.error,
    marginBottom: 16,
  },

  btnPrimary: {
    width: "100%",
    background: C.navyDeep,
    color: C.white,
    border: "none",
    borderRadius: 10,
    padding: "15px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 16,
  },
  btnGhost: {
    width: "100%",
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "13px",
    fontSize: 14,
    fontWeight: 600,
    color: C.navyMid,
    cursor: "pointer",
  },
  disclaimer: {
    fontSize: 12,
    color: C.textDim,
    lineHeight: 1.7,
    textAlign: "center",
    margin: 0,
  },

  successIcon: { fontSize: 48, textAlign: "center", marginBottom: 16 },
  successTitle: {
    fontSize: 22,
    fontWeight: 800,
    color: C.navyDeep,
    textAlign: "center",
    margin: "0 0 12px",
  },
  successMsg: {
    fontSize: 14,
    lineHeight: 1.7,
    color: C.textMuted,
    textAlign: "center",
    margin: "0 0 28px",
  },
};
