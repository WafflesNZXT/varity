import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <h1>Page not found</h1>
        <p className="auth-subtitle">This route does not exist or your session changed.</p>
        <Link href="/" className="auth-submit" style={{ display: "inline-block", textAlign: "center" }}>
          Go to Home
        </Link>
      </section>
    </main>
  );
}
