"use client";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <h1>Something went wrong</h1>
        <p className="auth-subtitle">The page hit an unexpected error. Try reloading this view.</p>
        {error?.digest ? <p className="muted">Digest: {error.digest}</p> : null}
        <button type="button" className="auth-submit" onClick={reset}>
          Reload page
        </button>
      </section>
    </main>
  );
}
