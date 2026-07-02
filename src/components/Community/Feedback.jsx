import { useState } from "react";
import { Icon } from "./Contacts";

// Feedback categories — tweak to match your form backend / routing.
const CATEGORIES = [
  "Academic policy or ordinance",
  "Course / evaluation issue",
  "Timetable or scheduling",
  "Faculty adviser / CR concern",
  "Facilities or resources",
  "Suggestion / other",
];

// Where feedback goes after it is submitted.
const CHANNELS = [
  {
    featured: true,
    kicker: "Fastest route",
    name: "UGAC feedback desk",
    blurb: "Reaches the academic secretary team directly. Use this for anything that needs the council to act or escalate.",
    href: "mailto:acad.secy@iitmandi.ac.in",
    label: "acad.secy@iitmandi.ac.in",
  },
  {
    kicker: "Anonymous",
    name: "Anonymous form",
    blurb: "Raise something without attaching your name. Include enough detail (course, batch, dates) so it can be acted on.",
    href: "#",
    label: "Open the form",
  },
  {
    kicker: "Local first",
    name: "Your CR or adviser",
    blurb: "For batch-level issues, starting with your class representative or faculty adviser is often the quickest fix.",
    href: "#",
    label: "Find your contacts",
  },
];

export default function Feedback() {
  const [form, setForm] = useState({ name: "", email: "", category: CATEGORIES[0], message: "" });
  const [sent, setSent] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    // TODO: wire to the feedback API (e.g. apiFetch POST /api/v1/feedback).
    // Front-end only for now — swap this block for the real request.
    setSent(true);
  };

  const reset = () => {
    setForm({ name: "", email: "", category: CATEGORIES[0], message: "" });
    setSent(false);
  };

  const canSend = form.message.trim().length > 0;

  return (
    <div className="cm-fb-grid">
      {sent ? (
        <div className="cm-fb-ok">
          <h3>Thanks — that's logged.</h3>
          <p>
            Your feedback has been recorded. If you left an email, the council will follow up there once the
            concern has been reviewed and routed.
          </p>
          <button type="button" onClick={reset}>Send another →</button>
        </div>
      ) : (
        <form className="cm-fb-form" onSubmit={submit}>
          <div className="cm-field cm-field--row">
            <div className="cm-field" style={{ margin: 0 }}>
              <label className="cm-label" htmlFor="fb-name">Name <span style={{ color: "#8a9abc", fontWeight: 500 }}>(optional)</span></label>
              <input id="fb-name" className="cm-input" value={form.name} onChange={update("name")} placeholder="Your name" />
            </div>
            <div className="cm-field" style={{ margin: 0 }}>
              <label className="cm-label" htmlFor="fb-email">Email <span style={{ color: "#8a9abc", fontWeight: 500 }}>(for a reply)</span></label>
              <input id="fb-email" type="email" className="cm-input" value={form.email} onChange={update("email")} placeholder="you@iitmandi.ac.in" />
            </div>
          </div>

          <div className="cm-field">
            <label className="cm-label" htmlFor="fb-cat">What is this about?</label>
            <select id="fb-cat" className="cm-select" value={form.category} onChange={update("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="cm-field">
            <label className="cm-label" htmlFor="fb-msg">Details</label>
            <textarea
              id="fb-msg"
              className="cm-textarea"
              value={form.message}
              onChange={update("message")}
              placeholder="Describe the concern. Add course code, batch, dates, and what outcome you're hoping for — specific reports move faster."
            />
          </div>

          <button className="cm-submit" type="submit" disabled={!canSend}>Send feedback</button>
        </form>
      )}

      <aside className="cm-fb-side">
        {CHANNELS.map((ch) => (
          <div key={ch.name} className={"cm-channel" + (ch.featured ? " cm-channel--feat" : "")}>
            <span className="cm-channel-kicker">{ch.kicker}</span>
            <h3 className="cm-channel-name">{ch.name}</h3>
            <p className="cm-channel-blurb">{ch.blurb}</p>
            <a className="cm-channel-link" href={ch.href}>
              <span className="cm-chip-ic">{Icon.mail}</span>{ch.label}
            </a>
          </div>
        ))}
      </aside>
    </div>
  );
}