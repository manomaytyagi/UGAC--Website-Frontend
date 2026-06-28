import { campusImages } from "../data/homepageData.js";

export default function Hero({ onCourses, onFeedback }) {
  return (
    <section id="hero" className="hero-section">
      <img className="hero-section__image" src={campusImages.hero} alt="IIT Mandi campus in the Himalayas" />
      <div className="hero-section__shade" />
      <div className="hero-section__content reveal-up">
        <div className="eyebrow-pill">Undergraduate Academic Council | IIT Mandi</div>
        <h1>Student voice for academic life in the Himalayas</h1>
        <p>
          UGAC connects students, faculty, clubs, sports bodies, and academic offices so every undergraduate can find
          support, opportunities, and clear information in one place.
        </p>
        <div className="hero-actions">
          <button className="button button--primary" type="button" onClick={onCourses}>
            Explore courses
          </button>
          <button className="button button--glass" type="button" onClick={onFeedback}>
            Raise feedback
          </button>
        </div>
      </div>
      
    </section>
  );
}
