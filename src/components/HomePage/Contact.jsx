import { faqs } from "../../data/homepageData.js";
import FAQItem from "./FAQItem.jsx";

export default function Contact() {
  return (
    <section id="contact" className="section section--contact">
      <div className="container">
        <div className="contact-grid reveal-up">
          <div>
            <p className="eyebrow-label eyebrow-label--light">Contact</p>
            <h2 className="section-title section-title--light contact-title">
              Talk to UGAC
            </h2>
            <p className="contact-copy">
              Have academic concerns, want to get involved, or need a student
              point of contact? Reach out and the council will route it to the
              right place.
            </p>
            <div className="contact-details">
              <a className="contact-chip" href="mailto:ugac@iitmandi.ac.in">
                <span>@</span>
                <span>ugac@iitmandi.ac.in</span>
              </a>
              <a
                className="contact-chip"
                href="https://www.iitmandi.ac.in/"
                target="_blank"
                rel="noreferrer"
              >
                <span>i</span>
                <span>IIT Mandi website</span>
              </a>
            </div>
          </div>
          <div>
            <p className="faq-heading">Resolve your doubts &amp; queries</p>
            {faqs.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
