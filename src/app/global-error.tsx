"use client";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Inter, Segoe UI, Arial, sans-serif", background: "#090d1a", color: "#edf2ff" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: "24px"
          }}
        >
          <section style={{ maxWidth: 560, width: "100%", border: "1px solid #253052", borderRadius: 14, padding: 20, background: "#10182f" }}>
            <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
            <p style={{ color: "#9aa7c8" }}>Please refresh or try again.</p>
            {error?.digest ? <p style={{ color: "#9aa7c8", fontSize: 13 }}>Digest: {error.digest}</p> : null}
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 8,
                background: "#5878ff",
                color: "white",
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer"
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
