import { Contacts, C } from "./contacts";

/* Important contacts, grouped by function and colour.
   NOTE: names/emails below are placeholders following the @iitmandi.ac.in
   pattern — replace with the live roster or wire to an API the same way
   TeamPage does (apiFetch with this array as the fallback). */

const GROUPS = [
  {
    id: "acad",
    title: "Academics Team",
    sub: "Council academic secretariat",
    color: "#4f7cc4",
    people: [
      { name: "Academic Secretary", role: "UG Academic Council", email: "acad.secy@iitmandi.ac.in", link: "#" },
      { name: "Associate Secretary — Academics", role: "Academics", email: "assoc.acad@iitmandi.ac.in", link: "#" },
      { name: "Associate Secretary — Academics", role: "Academics", email: "assoc.acad2@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "courses",
    title: "Courses Team",
    sub: "Curriculum, registration & electives",
    color: "#4e9b72",
    people: [
      { name: "Courses Secretary", role: "Courses & Curriculum", email: "courses.secy@iitmandi.ac.in", link: "#" },
      { name: "Associate — Courses", role: "Courses", email: "assoc.courses@iitmandi.ac.in", link: "#" },
      { name: "Associate — Electives", role: "Courses", email: "electives@iitmandi.ac.in", link: "#" },
    ],
  },
  {
    id: "chairs",
    title: "Department / School Chairs",
    sub: "Academic heads across schools",
    color: "#d18a3e",
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
    id: "office",
    title: "Institute & Other Contacts",
    sub: "Deans and academic administration",
    color: "#c25b52",
    people: [
      { name: "Dean — Academics", role: "Dean Academic Affairs", email: "dean.acad@iitmandi.ac.in", link: "#" },
      { name: "Associate Dean — Academics", role: "Academic Affairs", email: "adean.acad@iitmandi.ac.in", link: "#" },
      { name: "Academic Section", role: "Registration & records", email: "academics@iitmandi.ac.in", link: "#" },
      { name: "Examination Cell", role: "Exams & grading", email: "exams@iitmandi.ac.in", link: "#" },
    ],
  },
];

function ContactCard({ person, color }) {
  return (
    <article className="cm-contact-card" style={{ "--c": color, "--cbg": `${color}1a` }}>
      <div className="cm-cc-body">
        <h3 className="cm-cc-name" title={person.name}>{person.name}</h3>
        <p className="cm-cc-role">{person.role}</p>
        <Contacts member={person} accent={color} />
      </div>
    </article>
  );
}

export default function ImportantContacts() {
  const total = GROUPS.reduce((n, g) => n + g.people.length, 0);
  return (
    <div>
      <div className="cm-note">
        <span className="cm-chip-ic" style={{ color: C.orange }}>●</span>
        Sample roster — replace names &amp; emails with the live contacts ({total} listed).
      </div>

      <div className="cm-groups">
        {GROUPS.map((g) => (
          <section key={g.id}>
            <div className="cm-group-head" style={{ "--c": g.color }}>
              <span className="cm-group-dot" />
              <span className="cm-group-title">{g.title}</span>
              <span className="cm-count">{g.people.length}</span>
              <span className="cm-group-sub">{g.sub}</span>
            </div>
            <div className="cm-contact-grid">
              {g.people.map((p) => <ContactCard key={p.email} person={p} color={g.color} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}