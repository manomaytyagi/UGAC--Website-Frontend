

export function Stars({ rating, size = 14 }) {
  const r = Math.round(rating);
  return (
    <span className="stars" style={{ fontSize: size }}>
      {"".repeat(r)}
      <span style={{ opacity: 0.3 }}>{"".repeat(5 - r)}</span>
      <span className="stars__num"> {rating.toFixed(1)}</span>
    </span>
  );
}

export default function PageShell({
  eyebrow = "Academic Resources",
  title,
  onBack,
  backLabel = "← Back",
  apiWaking = false,
  usingFallback = false,
  narrow = false,
  children
}) {
  return (
    <div className="pg">
      {apiWaking && (
        <div className="toast-wake" role="status"> Waking the server — first load can take a moment…</div>
      )}
      {usingFallback && (
        <div className="banner-stale" role="status"> Showing cached data — live data is on its way</div>
      )}

      <div className={`pg__inner ${narrow ? "pg__inner--narrow" : ""}`}>
        <div className="pg-header">
          {onBack && (
            <button className="pg-back" type="button" onClick={onBack}>
              {backLabel}
            </button>
          )}
          <div>
            <p className="eyebrow-label">{eyebrow}</p>
            <h1 className="pg-title">{title}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
