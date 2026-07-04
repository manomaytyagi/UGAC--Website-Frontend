import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "linear-gradient(180deg, #f7f5f2 0%, #efe9e3 100%)",
            color: "#1f2937",
            textAlign: "center",
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
            }}
          >
            <p style={{ margin: 0, color: "#d97706", fontWeight: 700, letterSpacing: 0.4 }}>
              Something went wrong
            </p>
            <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(2rem, 4vw, 2.75rem)" }}>
              We hit a snag
            </h1>
            <p style={{ margin: 0, lineHeight: 1.7, color: "#4b5563" }}>
              The page crashed, but the site is still alive. Please go back home
              and try again.
            </p>
            <a
              href="/"
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
              Go home
            </a>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
