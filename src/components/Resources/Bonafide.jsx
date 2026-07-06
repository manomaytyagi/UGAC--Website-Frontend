import Flowchart from "./Flowcharts";

/* ──────────────────────────────────────────────────────────────────────────
   BONAFIDE CERTIFICATE PROCEDURE
   Only the data lives here — all rendering/interaction is in Flowchart.jsx.
   Branches on purpose (academic vs non-academic → which office) and then on
   submission mode (offline vs online). Both mode branches converge to a shared
   "issued → done" tail.

   Note: the online step involves emailing the Finance Section and the office.
   No email addresses were provided, so it is a plain instruction step. If you
   have the addresses, convert `onEmail` to an `email` node like in Internships:
     kind: "email", emails: [{ label: "To", addr: "..." }, ...]
   ────────────────────────────────────────────────────────────────────────── */

const FLOW = {
  start: {
    kind: "start",
    title: "What is the bonafide certificate for?",
    options: [
      { label: "Academic purpose",     branch: "Academic",     next: "academicApply" },
      { label: "Non-academic purpose", branch: "Non-academic", next: "nonAcademicApply" },
    ],
  },

  academicApply: {
    kind: "action",
    title: "Apply through the Academic Section",
    meta: ["Office: Academic Section"],
    body: "Use this for an internship, student exchange, higher studies, or any other academic requirement. The application form is attached in this section of the flow.",
    next: "mode",
  },

  nonAcademicApply: {
    kind: "action",
    title: "Apply through Student Services",
    meta: ["Office: Student Services"],
    body: "Use this for address proof, a passport application, or any other non-academic purpose. The application form is attached in this section of the flow.",
    next: "mode",
  },

  mode: {
    kind: "decision",
    short: "Mode?",
    title: "Offline or online submission?",
    options: [
      { label: "Offline", branch: "Offline", next: "offFill" },
      { label: "Online",  branch: "Online",  next: "onFill" },
    ],
  },

  // ── Offline branch ────────────────────────────────────────────────────────
  offFill: {
    kind: "action",
    title: "Fill out the application form",
    body: "Complete the bonafide application form for your section.",
    next: "offPay",
  },
  offPay: {
    kind: "action",
    title: "Pay the required fee",
    body: "Pay the fee charged for the certificate.",
    next: "offSign",
  },
  offSign: {
    kind: "action",
    title: "Get the Finance Section to sign",
    meta: ["Finance Section"],
    body: "Have the Finance Section sign the form as proof of payment.",
    next: "offSubmit",
  },
  offSubmit: {
    kind: "action",
    title: "Submit the signed form",
    body: "Hand the signed form to your office — the Academic Section or Student Services, as chosen above.",
    next: "issued",
  },

  // ── Online branch ─────────────────────────────────────────────────────────
  onFill: {
    kind: "action",
    title: "Fill the form and save as PDF",
    body: "Complete the application form and save it as a PDF.",
    next: "onAttach",
  },
  onAttach: {
    kind: "action",
    title: "Attach the PDF and payment receipt",
    body: "Keep the filled PDF and your payment receipt together, ready to send.",
    next: "onEmail",
  },
  onEmail: {
    kind: "action",
    title: "Email both documents",
    body: "Email the PDF and the payment receipt to the Finance Section and your office — the Academic Section or Student Services, as chosen above.",
    next: "issued",
  },

  // ── Converge ──────────────────────────────────────────────────────────────
  issued: {
    kind: "action",
    title: "Application submitted",
    meta: ["Usually 2–3 working days"],
    body: "Once processed, the office will either email you the bonafide certificate or share a link to download it.",
    next: "done",
  },
  done: {
    kind: "done",
    title: "Done",
    body: "Collect your bonafide certificate once it arrives.",
  },
};

const INTRO = {
  eyebrow: "Interactive flowchart",
  title: "Bonafide Certificate — Application Process",
  text: "Pick your purpose and submission mode, and the chart draws the exact steps for you. You can tap any diamond to change an answer.",
};

export default function Bonafide() {
  return <Flowchart flow={FLOW} intro={INTRO} />;
}