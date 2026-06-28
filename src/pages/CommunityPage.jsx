import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const C = {
  navyDeep: "#0d1b3e",
  navyMid: "#1e3a6e",
  navyLight: "#2e509e",
  orange: "#f97316",
  orangeSoft: "#fed7aa",
  white: "#ffffff",
  offWhite: "#f5f7fc",
  border: "#dce3f0",
  textMuted: "#5a6a8a",
  textDim: "#8a9abc",
};

const PAGES = {
  blogs: {
    eyebrow: "Community",
    title: "Blogs",
    intro: "Student-written updates, explainers, and campus notes from the UG academic community.",
    cards: [
      {
        tag: "Campus",
        title: "Life in Kamand Valley",
        desc: "IIT Mandi's campus sits near the Uhl River in Kamand and Salgi, shaping a residential academic culture closely tied to the valley.",
      },
      {
        tag: "Academics",
        title: "How to read academic notices",
        desc: "A quick guide to tracking Dean Academic Secretariat updates, forms, calendars, and registration deadlines without missing the fine print.",
      },
      {
        tag: "Student Voice",
        title: "From feedback to follow-up",
        desc: "How council representatives collect concerns, group recurring issues, and push them through the right academic channels.",
      },
    ],
  },
  academics: {
    eyebrow: "Community",
    title: "Academics",
    intro: "Academic help pages for procedures, opportunities, and student achievements.",
    links: [
      { label: "Procedure", path: "/community/academics/procedure" },
      { label: "Opportunities", path: "/community/academics/opportunities" },
      { label: "Awards", path: "/community/academics/awards" },
    ],
    cards: [
      {
        tag: "Procedure",
        title: "Forms, ordinances, and academic office flow",
        desc: "Start with the relevant form or rule, collect approvals, and keep a copy of every submission for follow-up.",
      },
      {
        tag: "Opportunities",
        title: "Internships, schools, and research calls",
        desc: "Watch institute announcements for summer internships, continuing education programmes, workshops, and admission-linked academic calls.",
      },
      {
        tag: "Awards",
        title: "Recognition and achievements",
        desc: "Track student, faculty, and institute recognitions to surface opportunities worth applying for or celebrating.",
      },
    ],
  },
  procedure: {
    eyebrow: "Academics",
    title: "Procedures",
    intro: "Administrative processes and step-by-step guides",
    processes: [
      {
        slug: "leave-application-process",
        title: "Leave Application Process",
        desc: "Step-by-step guide for applying for academic leave",
        note: "Leave applications must be submitted at least two weeks in advance. Ensure all sections are filled before submission.",
        pdf: "#",
        steps: [
          {
            title: "Fill Leave Form",
            desc: "Download and fill the leave application form from the Academic Office.",
            meta: "Academic Office",
          },
          {
            title: "Faculty Advisor Approval",
            desc: "Get the form signed by your faculty advisor.",
            meta: "1-2 working days",
          },
          {
            title: "Dean Approval",
            desc: "Submit to Dean of Academics for final approval.",
            meta: "Dean of Academics Office · 3-5 working days",
          },
        ],
        reviewed: "January 2026",
      },
      {
        slug: "course-add-drop-request",
        title: "Course Add / Drop Request",
        desc: "Procedure for changing registered courses during the permitted window",
        note: "Course changes are only accepted during the official add/drop window announced by the Academic Office.",
        pdf: "#",
        steps: [
          {
            title: "Check Eligibility",
            desc: "Confirm credits, prerequisites, timetable clashes, and seat availability.",
            meta: "Before filling the request",
          },
          {
            title: "Collect Approvals",
            desc: "Discuss the change with your faculty advisor and the course instructor where required.",
            meta: "Advisor / instructor approval",
          },
          {
            title: "Submit Request",
            desc: "Send the approved request to the Academic Office before the deadline.",
            meta: "Academic Office",
          },
        ],
        reviewed: "January 2026",
      },
      {
        slug: "grade-review-application",
        title: "Grade Review Application",
        desc: "Process for requesting review of evaluated academic work",
        note: "Grade review requests should clearly mention the component being reviewed and the specific evaluation concern.",
        pdf: "#",
        steps: [
          {
            title: "Review Instructions",
            desc: "Read the answer-script viewing or grade review notice for the course.",
            meta: "Course notice / LMS",
          },
          {
            title: "Prepare Request",
            desc: "Mention the course, component, marks, and exact evaluation concern.",
            meta: "Clear written request",
          },
          {
            title: "Submit Officially",
            desc: "Submit through the instructed channel and wait for the final response.",
            meta: "Instructor / Academic Office",
          },
        ],
        reviewed: "January 2026",
      },
      {
        slug: "academic-grievance-escalation",
        title: "Academic Grievance Escalation",
        desc: "How to raise unresolved academic concerns through the proper channel",
        note: "Escalations work best when the issue is documented, specific, and routed through the expected academic hierarchy.",
        pdf: "#",
        steps: [
          {
            title: "Document the Concern",
            desc: "Collect dates, course codes, notices, screenshots, or prior communication.",
            meta: "Evidence and context",
          },
          {
            title: "Raise Locally",
            desc: "Start with the course team, advisor, CR, or school contact as applicable.",
            meta: "First-level resolution",
          },
          {
            title: "Escalate Formally",
            desc: "If unresolved, submit through UGAC feedback or the official academic grievance route.",
            meta: "UGAC / Academic Office",
          },
        ],
        reviewed: "January 2026",
      },
    ],
  },
  opportunities: {
    eyebrow: "Academics",
    title: "Academic Opportunities",
    intro: "Explore programs beyond your regular curriculum",
    opportunityCards: [
      {
        title: "Minor Programs",
        desc: "Specialize in a secondary discipline",
      },
      {
        title: "Honours Degree",
        desc: "Advanced coursework for high achievers",
      },
      {
        title: "Semester Exchange",
        desc: "Study at partner institutions abroad",
      },
      {
        title: "DP 399P Internship",
        desc: "Industry internship program",
      },
      {
        title: "Research Opportunities",
        desc: "SURE, summer projects, and faculty-led research",
      },
    ],
  },
  awards: {
    eyebrow: "Academics",
    title: "Academic Awards",
    intro: "Institute medals, scholarships, and recognised academic distinctions",
    awardIntro:
      "This section recognises UG students who have received academic awards, institute medals, merit-cum-means scholarships, summer research awards, and externally funded fellowships.",
    awardItems: [
      "President of India Gold Medal",
      "Director's Medal",
      "Institute merit-cum-means scholarships",
      "SURE / SCRA fellowship recipients",
      "External academic fellowships such as KVPY, INSPIRE, ESSAI, and ANRF-supported travel grants",
      "Research and innovation recognitions inspired by IIT Mandi achievements, including FICCI Higher Education Excellence Awards, MRSI / CRSI medals, Royal Society of Chemistry fellowships, and CERN-linked Breakthrough Prize recognition",
    ],
  },
  crs: {
    eyebrow: "Community",
    title: "CRs",
    intro: "A Class Representative hub for academic coordination, issue tracking, and batch communication.",
    cards: [
      {
        tag: "Role",
        title: "Collect and clarify",
        desc: "CRs collect batch-level academic concerns, clarify recurring doubts, and share verified information with students.",
      },
      {
        tag: "Coordination",
        title: "Escalate with context",
        desc: "Strong CR escalation includes the affected course or batch, evidence, impact, and the exact decision or clarification needed.",
      },
      {
        tag: "Updates",
        title: "Close the loop",
        desc: "After a concern is resolved, CRs should communicate the final update clearly so the same issue does not keep circulating.",
      },
    ],
  },
};

function Card({ item }) {
  return (
    <article style={S.card}>
      <span style={S.tag}>{item.tag}</span>
      <h2 style={S.cardTitle}>{item.title}</h2>
      <p style={S.cardDesc}>{item.desc}</p>
    </article>
  );
}

function ProcessCard({ item, onOpen }) {
  return (
    <article style={S.processCard} onClick={onOpen}>
      <div style={S.processTop}>
        <div>
          <h2 style={S.processTitle}>{item.title}</h2>
          <p style={S.processDesc}>{item.desc}</p>
        </div>
      </div>
      <div style={S.processMeta}>{item.steps.length} steps <span style={S.metaSpacer}>Last reviewed: {item.reviewed}</span></div>
    </article>
  );
}

function ProcessDetail({ process, navigate }) {
  return (
    <>
      <div style={S.detailHero}>
        <div style={S.detailHeroInner}>
          <button style={S.heroBackBtn} type="button" onClick={() => navigate("/community/academics/procedure")}>
            ← Procedures
          </button>
          <h1 style={S.detailH1}>{process.title}</h1>
        </div>
      </div>

      <section style={S.detailBody}>
        <p style={S.detailDesc}>{process.desc}</p>
        <p style={S.detailMeta}>
          Last reviewed: {process.reviewed}
          <a style={S.downloadLink} href={process.pdf}>Download PDF</a>
        </p>
        <p style={S.detailNote}>{process.note}</p>

        <h2 style={S.sectionTitle}>Steps</h2>
        <div style={S.detailSteps}>
          {process.steps.map((step, index) => (
            <article key={step.title} style={S.detailStep}>
              <span style={S.stepNum}>{index + 1}</span>
              <div>
                <h3 style={S.detailStepTitle}>{step.title}</h3>
                <p style={S.detailStepDesc}>{step.desc}</p>
                <p style={S.detailStepMeta}>{step.meta}</p>
              </div>
            </article>
          ))}
        </div>

        
      </section>
    </>
  );
}

function OpportunityCard({ item }) {
  return (
    <article style={S.opportunityCard}>
      <h2 style={S.opportunityTitle}>{item.title}</h2>
      <p style={S.opportunityDesc}>{item.desc}</p>
    </article>
  );
}

function OpportunitiesPage({ page, navigate }) {
  return (
    <>
      <div style={S.detailHero}>
        <div style={S.detailHeroInner}>
          <button style={S.heroBackBtn} type="button" onClick={() => navigate("/community/academics")}>
            ← Academics
          </button>
          <h1 style={S.detailH1}>{page.title}</h1>
          <p style={S.heroSubtitle}>{page.intro}</p>
        </div>
      </div>
      <section style={S.opportunityGrid}>
        {page.opportunityCards.map((item) => <OpportunityCard key={item.title} item={item} />)}
      </section>
    </>
  );
}

function AwardsPage({ page, navigate }) {
  return (
    <>
      <div style={S.detailHero}>
        <div style={S.detailHeroInner}>
          <button style={S.heroBackBtn} type="button" onClick={() => navigate("/community/academics")}>
            ← Academics
          </button>
          <h1 style={S.detailH1}>{page.title}</h1>
          <p style={S.heroSubtitle}>{page.intro}</p>
        </div>
      </div>
      <section style={S.awardsBody}>
        <p style={S.awardsIntro}>{page.awardIntro}</p>
        <ul style={S.awardsList}>
          {page.awardItems.map((item) => (
            <li key={item} style={S.awardsItem}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}

export default function CommunityPage({ type }) {
  const navigate = useNavigate();
  const { slug } = useParams();
  const page = PAGES[type] || PAGES.blogs;
  const selectedProcess = page.processes?.find((item) => item.slug === slug);
  const [hoveredLink, setHoveredLink] = useState(null);

  if (selectedProcess) {
    return <ProcessDetail process={selectedProcess} navigate={navigate} />;
  }

  if (page.opportunityCards) {
    return <OpportunitiesPage page={page} navigate={navigate} />;
  }

  if (page.awardItems) {
    return <AwardsPage page={page} navigate={navigate} />;
  }

  return (
    <main style={S.page}>
      <div style={S.header}>
        <button style={S.backBtn} type="button" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div>
          <p style={S.eyebrow}>{page.eyebrow}</p>
          <h1 style={S.h1}>{page.title}</h1>
          <p style={S.intro}>{page.intro}</p>
        </div>
      </div>

      {page.links && (
        <div style={S.linkRow}>
          {page.links.map((link) => (
            <button
              key={link.path}
              style={{
                ...S.linkBtn,
                ...(hoveredLink === link.path && {
                  borderColor: C.orange,
                  color: C.orange,
                  backgroundColor: `${C.orangeSoft}`,
                  boxShadow: `0 4px 12px rgba(249, 115, 22, 0.2)`,
                }),
              }}
              type="button"
              onClick={() => navigate(link.path)}
              onMouseEnter={() => setHoveredLink(link.path)}
              onMouseLeave={() => setHoveredLink(null)}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}

      {page.processes ? (
        <section style={S.processList}>
          {page.processes.map((item) => (
            <ProcessCard
              key={item.title}
              item={item}
              onOpen={() => navigate(`/community/academics/procedure/${item.slug}`)}
            />
          ))}
        </section>
      ) : (
        <section style={S.grid}>
          {page.cards.map((item) => <Card key={item.title} item={item} />)}
        </section>
      )}
    </main>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: C.offWhite,
    padding: "112px 24px 80px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    maxWidth: 1100,
    margin: "0 auto 30px",
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
    fontSize: "clamp(30px, 4vw, 44px)",
    fontWeight: 800,
    letterSpacing: -1,
    color: C.navyDeep,
    margin: "0 0 8px",
  },
  intro: {
    maxWidth: 720,
    fontSize: 15,
    color: C.textMuted,
    lineHeight: 1.7,
    margin: 0,
  },
  linkRow: {
    maxWidth: 1100,
    margin: "0 auto 30px",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  linkBtn: {
    background: C.white,
    border: `2px solid ${C.border}`,
    borderRadius: 12,
    padding: "18px 32px",
    color: C.navyMid,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    flex: "1 1 calc(33.333% - 7px)",
    minWidth: 200,
    transition: "all 0.3s ease",
  },
  grid: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "none",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
  },
  card: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "22px 20px",
    boxShadow: "0 2px 8px rgba(13,27,62,0.05)",
  },
  tag: {
    display: "inline-block",
    background: C.orangeSoft,
    color: C.orange,
    borderRadius: 6,
    padding: "3px 9px",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 14,
  },
  cardTitle: {
    color: C.navyDeep,
    fontSize: 18,
    lineHeight: 1.35,
    margin: "0 0 10px",
  },
  cardDesc: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 1.7,
    margin: 0,
  },
  processList: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },
  processCard: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "28px 32px",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(13,27,62,0.04)",
  },
  processTop: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 18,
  },
  processTitle: {
    color: C.navyDeep,
    fontSize: 22,
    lineHeight: 1.25,
    margin: "0 0 8px",
  },
  processDesc: {
    color: C.textMuted,
    fontSize: 16,
    lineHeight: 1.6,
    margin: 0,
  },
  processBadge: {
    background: C.offWhite,
    border: `1px solid ${C.border}`,
    borderRadius: 999,
    color: C.navyMid,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 10px",
  },
  processMeta: {
    color: C.textDim,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 14,
  },
  metaSpacer: {
    marginLeft: 24,
  },
  detailHero: {
    background: C.navyMid,
    color: C.white,
    padding: "128px 24px 70px",
  },
  detailHeroInner: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  heroBackBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 8,
    color: C.white,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 28,
  },
  detailH1: {
    fontSize: "clamp(36px, 5vw, 54px)",
    margin: 0,
    fontWeight: 800,
  },
  heroSubtitle: {
    color: C.white,
    fontSize: 16,
    lineHeight: 1.6,
    margin: "10px 0 0",
    opacity: 0.95,
  },
  detailBody: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "34px 24px 80px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  detailDesc: {
    color: C.navyDeep,
    fontSize: 16,
    lineHeight: 1.7,
    margin: "0 0 8px",
  },
  detailMeta: {
    color: C.textMuted,
    fontSize: 13,
    margin: "0 0 28px",
  },
  downloadLink: {
    color: C.orange,
    fontWeight: 700,
    marginLeft: 18,
    textDecoration: "none",
  },
  detailNote: {
    color: C.navyDeep,
    fontSize: 14,
    lineHeight: 1.8,
    margin: "0 0 36px",
  },
  sectionTitle: {
    color: C.navyDeep,
    fontSize: 26,
    margin: "0 0 18px",
  },
  detailSteps: {
    display: "grid",
    gap: 16,
    marginBottom: 34,
  },
  detailStep: {
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: 14,
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "18px 20px",
  },
  detailStepTitle: {
    color: C.navyDeep,
    fontSize: 15,
    margin: "0 0 5px",
  },
  detailStepDesc: {
    color: C.navyDeep,
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 0 6px",
  },
  detailStepMeta: {
    color: C.textMuted,
    fontSize: 12,
    margin: 0,
  },
  stepList: {
    display: "grid",
    gap: 10,
    listStyle: "none",
    margin: "22px 0 0",
    padding: 0,
  },
  stepItem: {
    display: "grid",
    gridTemplateColumns: "28px 1fr",
    gap: 12,
    alignItems: "start",
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 1.65,
  },
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: C.navyDeep,
    color: C.white,
    fontSize: 12,
    fontWeight: 800,
  },
  opportunityGrid: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "34px 24px 80px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
    gap: 24,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  opportunityCard: {
    background: C.white,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "28px 24px",
    minHeight: 102,
    boxShadow: "0 2px 8px rgba(13,27,62,0.04)",
  },
  opportunityTitle: {
    color: C.navyDeep,
    fontSize: 18,
    margin: "0 0 9px",
  },
  opportunityDesc: {
    color: C.navyDeep,
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },
  awardsBody: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "36px 24px 84px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  awardsIntro: {
    color: C.navyDeep,
    fontSize: 15,
    lineHeight: 1.8,
    margin: "0 0 24px",
  },
  awardsList: {
    display: "grid",
    gap: 13,
    color: C.navyDeep,
    fontSize: 15,
    lineHeight: 1.7,
    margin: 0,
    paddingLeft: 22,
  },
  awardsItem: {
    paddingLeft: 6,
  },
};