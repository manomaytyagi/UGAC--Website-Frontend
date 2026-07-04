import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "linear-gradient(180deg, #f7f5f2 0%, #efe9e3 100%)",
        color: "#1f2937",
      }}
    >
      <section
        style={{
          maxWidth: 560,
          width: "100%",
          padding: "32px 28px",
          borderRadius: 24,
          background: "#ffffff",
          boxShadow: "0 20px 60px rgba(31, 41, 55, 0.12)",
          border: "1px solid rgba(31, 41, 55, 0.08)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#d97706", fontWeight: 700, letterSpacing: 0.4 }}>
          404
        </p>
        <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(2rem, 4vw, 2.75rem)" }}>
          Page not found
        </h1>
        <p style={{ margin: 0, lineHeight: 1.7, color: "#4b5563" }}>
          The URL you opened does not exist on this site.
        </p>
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginTop: 20,
            padding: "12px 18px",
            borderRadius: 999,
            background: "#ee9116",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}
