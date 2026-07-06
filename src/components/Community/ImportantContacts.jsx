import { useEffect, useState } from "react";
import { Contacts } from "./Contacts";
import { apiFetch } from "../../lib/apiBridge";
import "../../styles/CommunityPage.css";

const FALLBACK = [
  {
    id: "director", type: "director", title: "Director",
    sub: "Head of the institute", color: "#37548f",
    people: [
      { name: "Director", role: "Indian Institute of Technology Mandi", email: "director@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "deans", type: "dean", title: "Deans",
    sub: "Deans & associate deans", color: "#4e9b72",
    people: [
      { name: "Dean — Academics", role: "Dean, Academic Affairs", email: "dean.acad@iitmandi.ac.in", link: "#" },
      { name: "Associate Dean — Academics", role: "Academic Affairs", email: "adean.acad@iitmandi.ac.in", link: "#" },
      { name: "Associate Dean — Courses", role: "Courses & Curriculum", email: "adean.courses@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "student", type: "student_body", title: "Student Body",
    sub: "Council & student representatives", color: "#d18a3e",
    people: [
      { name: "Academic Secretary", role: "UG Academic Council", email: "acad.secy@iitmandi.ac.in", link: "#" },
      { name: "Associate Secretary — Academics", role: "Academics", email: "assoc.acad@iitmandi.ac.in", link: "#" },
      { name: "Courses Secretary", role: "Courses & Curriculum", email: "courses.secy@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "chairs", type: "school_chair", title: "Department / School Chairs",
    sub: "Academic heads across schools", color: "#c25b52",
    people: [
      { name: "Chair — SCEE", role: "Computing & Electrical Engineering", email: "chair.scee@iitmandi.ac.in", link: "#" },
      { name: "Chair — SMME", role: "Mechanical & Materials Engineering", email: "chair.smme@iitmandi.ac.in", link: "#" },
      { name: "Chair — SCENE", role: "Civil & Environmental Engineering", email: "chair.scene@iitmandi.ac.in", link: "#" },
      { name: "Chair — SBB", role: "Biosciences & Bioengineering", email: "chair.sbb@iitmandi.ac.in", link: "#" },
      { name: "Chair — SPS", role: "Physical Sciences", email: "chair.sps@iitmandi.ac.in", link: "#" },
      { name: "Chair — SMSS", role: "Mathematical & Statistical Sciences", email: "chair.smss@iitmandi.ac.in", link: "#" },
      { name: "Chair — SCS", role: "Chemical Sciences", email: "chair.scs@iitmandi.ac.in", link: "#" },
      { name: "Chair — SHSS", role: "Humanities & Social Sciences", email: "chair.shss@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "offices", type: "school_office", title: "School Offices",
    sub: "School administrative offices", color: "#6fa3d0",
    people: [
      { name: "SCEE Office", role: "School of Computing & Electrical Engineering", email: "office.scee@iitmandi.ac.in", link: "#" },
      { name: "SMME Office", role: "School of Mechanical & Materials Engineering", email: "office.smme@iitmandi.ac.in", link: "#" },
      { name: "SBB Office", role: "School of Biosciences & Bioengineering", email: "office.sbb@iitmandi.ac.in", link: "#" },
    ],
  },
];

function ContactCard({ person, color }) {
  return (
    <article className="cm-contact-card" style={{ "--c": color, "--cbg": `${color}1a` }}>
      <div className="cm-cc-body">
        <h3 className="cm-cc-name" title={person.name}>{person.name}</h3>
        <p className="cm-cc-role">{person.role}</p>
        {person.office && <p className="cmx-office">{person.office}</p>}
        <Contacts member={person} accent={color} />
      </div>
    </article>
  );
}

export default function ImportantContacts() {
  const [groups, setGroups] = useState(FALLBACK);
  const [source, setSource] = useState("loading");

  useEffect(() => {
    let alive = true;
    apiFetch("/api/v1/important-contacts", FALLBACK).then(({ data, source }) => {
      if (!alive) return;
      setGroups(data);
      setSource(source);
    });
    return () => { alive = false; };
  }, []);

  const total = groups.reduce((n, g) => n + g.people.length, 0);
  const director = groups.find((g) => g.type === "director" || g.id === "director");
  const rest = groups.filter((g) => g !== director);

  return (
    <div>
      <div className="cmx-note">
        {source === "loading" && (
          <><span className="cmx-badge cmx-badge--load">Loading…</span> Fetching contacts from the API.</>
        )}
        {source === "live" && (
          <><span className="cmx-badge cmx-badge--live">Live</span> {total} contacts from the API.</>
        )}
        {source === "fallback" && (
          <><span className="cmx-badge cmx-badge--sample">Sample</span> Sample roster — connect the API for the live contacts ({total} listed).</>
        )}
      </div>

      {director && director.people.length > 0 && (
        <div
          className="cmx-hero"
          style={{ "--c": director.color, "--cbg": `${director.color}14`, "--cbd": `${director.color}45` }}
        >
          <span className="cm-eyebrow" style={{ color: director.color }}>{director.title}</span>
          {director.people.map((p, i) => (
            <div className="cmx-hero-body" key={p.id || p.email || i}>
              <h3 className="cmx-hero-name">{p.name}</h3>
              {p.role && <p className="cmx-hero-role">{p.role}</p>}
              <Contacts member={p} accent={director.color} large />
            </div>
          ))}
        </div>
      )}

      <div className="cm-groups">
        {rest.map((g) => (
          <section key={g.id}>
            <div className="cm-group-head" style={{ "--c": g.color }}>
              <span className="cm-group-dot" />
              <span className="cm-group-title">{g.title}</span>
              <span className="cm-count">{g.people.length}</span>
              <span className="cm-group-sub">{g.sub}</span>
            </div>
            <div className="cm-contact-grid">
              {g.people.map((p, i) => (
                <ContactCard key={p.id || p.email || i} person={p} color={g.color} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}