import { resources } from "../../data/homepageData.js";

export default function Resources({ onFeedback }) {
  return (
    <section id="resources" className="section">
      <div className="container">
        <div className="section-heading-row reveal-up">
          <div>
            <p className="eyebrow-label">Resources</p>
            <h2 className="section-title">Everything useful, easier to reach</h2>
          </div>
          <button className="button button--outline" type="button" onClick={onFeedback}>
            Submit feedback
          </button>
        </div>
        <div className="resource-grid">
          {resources.map((item, index) => (
            <article key={item.title} className={`resource-card reveal-up reveal-delay-${index % 3}`}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
