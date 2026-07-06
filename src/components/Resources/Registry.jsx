import Internships from "./Internships";
import Bonafide from "./Bonafide";

/* ──────────────────────────────────────────────────────────────────────────
   PROCEDURE REGISTRY — single source of truth.
   Drives BOTH the cards on the Resources › Procedures tab AND the routing
   (via ProcedurePage's /resources/procedures/:slug lookup).

   To add a new procedure:
     1. Create its component file (e.g. Placements.jsx), like Internships.jsx.
     2. Import it here and add one entry below.
   No routing changes needed — the dynamic route resolves it automatically.

   Fields:
     slug   → URL segment → /resources/procedures/<slug>   (must be unique)
     title  → card + page heading
     desc   → card description
     tag    → badge on the card (see TAG_COLORS in ResourcesPage.jsx)
     icon   → emoji shown on the card (optional; omit for none)
   ────────────────────────────────────────────────────────────────────────── */

export const PROCEDURES = [
  {
    slug: "internships",
    title: "Internship Procedure",
    desc: "Landed an internship? Walk through every approval, form, and email — from offer letter to hostel leave — as an interactive flowchart.",
    tag: "Flowchart",
    Component: Internships,
  },
  {
    slug: "bonafide",
    title: "Bonafide Certificate",
    desc: "Need a bonafide certificate? Follow the steps for your purpose (academic or non-academic) and submission mode (offline or online) as an interactive flowchart.",
    tag: "Flowchart",
    Component: Bonafide,
  },
  // ── Add more procedures here ──────────────────────────────────────────────
  // {
  //   slug: "placements",
  //   title: "Placement Procedure",
  //   desc: "…",
  //   tag: "Flowchart",
  //   icon: "💼",
  //   Component: Placements,
  // },
];

export const getProcedure = (slug) => PROCEDURES.find((p) => p.slug === slug);