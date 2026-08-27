import Flowchart from "./FlowCharts";

const FLOW = {
  start: {
    kind: "start",
    title: "Got an intern, yayy! ",
    options: [
      { label: "Yes, I got one!", branch: "Got offer", next: "getOffer" },
      { label: "Not yet ",      branch: "No intern", next: "noIntern" },
    ],
  },

  noIntern: {
    kind: "note",
    title: "Soon you'll reach the other side, dw ",
    body: "Keep applying — your offer is on its way. Come back the moment you land one.",
  },

  getOffer: {
    kind: "action",
    title: "Get Offer Letter",
    meta: ["⏰ Off-campus internship? Report it to CnP within 5 working days of the offer letter being issued."],
    body: "Secure the official offer letter — you'll attach it at later steps.",
    next: "duration",
  },

  duration: {
    kind: "decision",
    short: "Duration?",
    title: "How long is the internship?",
    options: [
      { label: "2 Months", branch: "2 Months · Vacation", next: "informFA" },
      { label: "6 Months", branch: "6 Months · Semester", next: "faApproval" },
    ],
  },

  informFA: {
    kind: "action",
    title: "Inform Faculty Advisor (FA)",
    body: "Just keep your FA in the loop — no further academic approval needed.",
    next: "cnpNocShort",
  },

  cnpNocShort: {
    kind: "email",
    title: "NOC from CnP",
    meta: ["For a 2-month internship the NOC comes from CnP — not the Academic Office."],
    emails: [
      { label: "To", addr: "cnpoffice@iitmandi.ac.in" },
      { label: "Cc", addr: "cnpcell@iitmandi.ac.in" },
    ],
    attachments: ["Offer Letter"],
    next: "doneVacation",
  },

  doneVacation: { kind: "done", title: "Done", body: "NOC in hand — all set for your vacation internship." },

  faApproval: {
    kind: "action",
    title: "FA Approval — Internship Form",
    body: "Get your Faculty Advisor to sign the Internship Form.",
    next: "cnp",
  },

  cnp: {
    kind: "email",
    title: "CNP Approval",
    meta: ["CnP Office"],
    emails: [
      { label: "To", addr: "cnpoffice@iitmandi.ac.in" },
      { label: "Cc", addr: "cnpcell@iitmandi.ac.in" },
    ],
    next: "noc",
  },

  noc: {
    kind: "email",
    title: "NOC from Academic Office",
    meta: ["AD Courses · Cc: Mukesh Sir"],
    emails: [
      { label: "To", addr: "adcourses@iitmandi.ac.in" },
      { label: "Cc", addr: "acadoa2@iitmandi.ac.in" },
    ],
    next: "type",
  },

  type: {
    kind: "decision",
    short: "Type?",
    title: "Remote or onsite?",
    options: [
      { label: "Remote ", branch: "Remote", next: "doneRemote" },
      { label: "Onsite ", branch: "Onsite", next: "hostelLeave" },
    ],
  },
  doneRemote: { kind: "done", title: "Done", body: "Remote — no hostel formalities. All set." },

  hostelLeave: {
    kind: "action",
    title: "Hostel Leave Form",
    body: "Signatures: FA + Warden. Click a photo of the signed form for your records.",
    next: "hostelFee",
  },

  hostelFee: {
    kind: "decision",
    short: "Fee on Samarth?",
    title: "Hostel / mess fee shown on Samarth?",
    options: [
      { label: "No",  branch: "No",  next: "doneNoFee" },
      { label: "Yes", branch: "Yes", next: "emailDSO" },
    ],
  },
  doneNoFee: { kind: "done", title: "Done", body: "No fee shown — nothing more to do." },

  emailDSO: {
    kind: "email",
    title: "Email to DSO — Renu Mam",
    emails: [{ label: "To", addr: "renu_jangra@iitmandi.ac.in" }],
    attachments: ["Hostel Leave Form", "Offer Letter", "NOC"],
    next: "doneFinal",
  },
  doneFinal: { kind: "done", title: "Done", body: "All approvals complete. Enjoy your internship! 🚀" },
};

const INTRO = {
  eyebrow: "Interactive flowchart",
  title: "Approvals & Procedures for Internship",
  text: "Pick a path at each diamond and the chart draws itself along your choice. Email addresses are tap-to-send — and you can tap any diamond to change an answer.",
};

export default function Internships() {
  return <Flowchart flow={FLOW} intro={INTRO} />;
}