const eventSections = ["Upcoming", "Current", "Past"];
const placeholderBlocks = Array.from({ length: 4 });

export default function Events() {
  return (
    <section id="events" className="section section--band">
      <div className="container">
        <div className="section-heading-row reveal-up">
          <div>
            <p className="eyebrow-label">Events</p>
            <h2 className="section-title">What's coming up</h2>
          </div>
          <p className="section-side-note">
            Forums, launches, and feedback drives that turn student input into action.
          </p>
        </div>
        <div className="event-board">
          {eventSections.map((section, sectionIndex) => (
            <div className="event-lane reveal-up" key={section}>
              <div className="event-lane__header">
                <h3>{section}</h3>
                <span>4 slots</span>
              </div>
              <div className="event-lane__track">
                {placeholderBlocks.map((_, index) => (
                  <article
                    className="event-placeholder"
                    key={`${section}-${index}`}
                    tabIndex={0}
                    style={{
                      "--event-delay": `${index * -3 + sectionIndex * -0.6}s`,
                    }}
                  >
                    <span className="event-placeholder__label">{section}</span>
                    <span className="event-placeholder__title">Event block</span>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
