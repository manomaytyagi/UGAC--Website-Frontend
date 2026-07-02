import { useState } from "react";
import { team } from "../../data/homepageData.js";
import { initials } from "../../utils/initials.js";

export default function Team() {
  const [activeMember, setActiveMember] = useState(0);

  return (
    <section id="team" className="section section--dark">
      <div className="container">
        <div className="section-heading-row reveal-up">
          <div>
            <p className="eyebrow-label eyebrow-label--light">Team</p>
            <h2 className="section-title section-title--light">Students behind the council</h2>
          </div>
          <p className="section-side-note section-side-note--light">
            Coordinating academics, web systems, documentation, and student-facing initiatives.
          </p>
        </div>
        <div className="team-stage reveal-up" aria-label="Interactive 3D team view">
          <div className="team-particles" aria-hidden="true">
            {Array.from({ length: 42 }).map((_, index) => (
              <span key={index} style={{ "--particle": index }} />
            ))}
          </div>
          {team.map((member, index) => (
            <article
              key={member.name}
              className={`team-card team-card--${index + 1} ${
                activeMember === index ? "team-card--active" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => setActiveMember(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveMember(index);
                }
              }}
              aria-pressed={activeMember === index}
            >
              <div className="team-card__avatar" aria-hidden="true">
                {initials(member.name)}
              </div>
              <div>
                <p className="team-card__name">{member.name}</p>
                <p className="team-card__role">{member.role}</p>
                <span className="team-card__area">{member.area}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
