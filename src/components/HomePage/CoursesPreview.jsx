import { courseTracks } from "../../data/homepageData.js";

export default function CoursesPreview({ onCourses, onCurriculum }) {
  return (
    <section id="courses" className="section section--courses">
      <div className="container courses-preview reveal-up">
        <div>
          <p className="eyebrow-label eyebrow-label--light">Courses</p>
          <h2 className="section-title section-title--light">Plan semesters with better context</h2>
          <p className="section-copy section-copy--light">
            Search courses, explore curriculum structure, inspect prerequisite paths, and add student reviews.
          </p>
          <div className="course-actions">
            <button className="button button--primary button--light" type="button" onClick={onCourses}>
              Open catalogue
            </button>
            <button className="button button--outline-light" type="button" onClick={onCurriculum}>
              Curriculum guide
            </button>
          </div>
        </div>
        <div className="course-track-list">
          {courseTracks.map((track, index) => (
            <div key={track} className="course-track">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{track}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
