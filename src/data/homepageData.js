export const navLinks = [
  { label: "Home", id: "hero" },
  { label: "Sports", id: "sports" },
  { label: "Clubs", id: "clubs" },
  { label: "Team", id: "team" },
  { label: "Events", id: "events" },
  { label: "Courses", id: "courses" },
  { label: "Resources", id: "resources" }
];

export const campusImages = {
  hero: null,
};





export const sports = [
  {
    title: "Inter-hostel leagues",
    desc: "Football, cricket, volleyball, badminton, table tennis, athletics, chess, and more across the semester.",
    tag: "Compete"
  },
  {
    title: "Fitness and recreation",
    desc: "Gym access, swimming, indoor courts, running routes, and beginner-friendly community sessions.",
    tag: "Train"
  },
  {
    title: "Tournaments support",
    desc: "Fixtures, registration windows, team coordination, and student feedback for better sports facilities.",
    tag: "Organize"
  }
];

export const clubs = [
  { name: "Programming Club", focus: "CP, systems, open source", accent: "#1d4ed8" },
  { name: "Robotics Club", focus: "Robots, drones, controls", accent: "#0f766e" },
  { name: "Design Club", focus: "UI, graphics, product craft", accent: "#c2410c" },
  { name: "Cultural Council", focus: "Music, dance, drama, arts", accent: "#7c3aed" },
  { name: "Literary Society", focus: "Debate, writing, quizzing", accent: "#b45309" },
  { name: "Entrepreneurship Cell", focus: "Startups, pitching, builders", accent: "#047857" }
];

export const team = [
  { name: "Aditya Tayal", role: "next gen Secretary current acad secy", area: "Council coordination" },
  { name: "Vishnu", role: "Previous Secretary", area: "Continuity" },
  { name: "Aarushi", role: "Member", area: "Backend" },
  { name: "Aryan", role: "Member", area: "Backend" },
  { name: "Kanika", role: "Member", area: "Frontend" },
  { name: "Manomay", role: "upcoming secy", area: "Frontend" }
];

export const events = [
  {
    month: "JUN",
    day: "12",
    title: "Academic Grievance Open House",
    desc: "A student forum to raise course, grading, timetable, and policy concerns with UGAC representatives.",
    tag: "Open Forum"
  },
  {
    month: "JUN",
    day: "20",
    title: "UGAC Website Launch",
    desc: "Walkthrough of resources, courses, feedback channels, and upcoming student-council initiatives.",
    tag: "Launch"
  },
  {
    month: "JUL",
    day: "05",
    title: "Curriculum Feedback Drive",
    desc: "Structured feedback from undergraduate students on course load, electives, and academic bottlenecks.",
    tag: "Survey"
  }
];

export const courseTracks = [
  "Course catalogue",
  "Curriculum guide",
  "Prerequisite map",
  "Student reviews"
];

// Used by CoursesPreview to go one level deeper than the track list above,
// so the section doesn't just repeat the Hero's "curriculum" callout.
export const curriculumHighlights = [
  { school: "Computing & Data Sciences", detail: "CSE, DSAI, MNC, DSE" },
  { school: "Core Engineering", detail: "EE, ME, CE, MSE" },
  { school: "Emerging & Interdisciplinary", detail: "VLSI, EP, QSE, Bio Engg." }
];

// Fallback shown by the Hero spotlight card (§3.3 Option A) and the
// Events Spotlight section (§4) when the live API is unavailable.
export const eventsFallback = [
  {
    id: "fallback-1",
    title: "Academic Grievance Open House",
    desc: "A student forum to raise course, grading, timetable, and policy concerns with UGAC representatives.",
    date: null,
    time: null,
    venue: null,
    tag: "Open Forum"
  }
];

// Fallback shown by the Notifications section (§5) when the live
// Announcements API is unavailable. Mirrors the shape returned by
// apiBridge's reshapeAnnouncements().
export const announcementsFallback = [
  {
    id: "fallback-mom-1",
    title: "General Body Meeting — Minutes",
    content: "Minutes from the latest UGAC general body meeting are available on request from the council.",
    category: "Minutes of Meetings",
    attachmentUrl: null,
    publishedAt: null,
    isPinned: false,
    isActive: true
  },
  {
    id: "fallback-circular-1",
    title: "Academic Office Circular",
    content: "Check the Resources page for the latest circulars from the Dean of Academic Affairs.",
    category: "Circulars",
    attachmentUrl: null,
    publishedAt: null,
    isPinned: false,
    isActive: true
  }
];

// Curriculum highlight shown as the third rotating card in the Hero
// spotlight (alongside the nearest event and the latest circular).
export const curriculumSpotlight = {
  label: "Curriculum",
  headline: "6 schools, 40+ courses tracked",
  desc: "Structured course maps across every branch, kept current every semester."
};

export const resources = [
  { title: "Academic calendar", desc: "Semester dates, exam windows, add-drop periods, and important deadlines." },
  { title: "Forms and policies", desc: "Common forms, ordinances, grievance paths, and committee-level documents." },
  { title: "Student handbooks", desc: "Guides for freshers, branch change, electives, internships, and institute systems." },
  { title: "Feedback portal", desc: "Submit academic and administrative concerns directly to the council." }
];

export const faqs = [
  {
    q: "How do I raise an academic concern?",
    a: "Use the feedback form or contact the council. UGAC records concerns and routes them to the relevant academic body."
  },
  {
    q: "Can clubs and sports teams share updates here?",
    a: "Yes. The site is designed to highlight student opportunities, events, and useful links in one place."
  },
  {
    q: "Where can I find course information?",
    a: "Use the Courses section for the catalogue, reviews, curriculum guide, and prerequisite map."
  }
];
