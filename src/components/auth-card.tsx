"use client";

import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "signup";

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === "signup" && password.trim().length < 8) return false;
    return !loading;
  }, [email, password, mode, loading]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, fullName })
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "Failed to create account.");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        throw new Error("Invalid credentials.");
      }

      router.push("/chat");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-top">
        <p className="auth-badge">Varity AI Workspace</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-subtitle">
          {mode === "login"
            ? "Log in to access your saved chats and dashboard tools."
            : "Sign up to create your personal AI workspace and store chats securely."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="auth-form">
        {mode === "signup" && (
          <label>
            Full Name
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Alex Morgan"
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            autoComplete={mode === "login" ? "email" : "username"}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="auth-submit" disabled={!canSubmit}>
          {loading
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign In"
              : "Sign Up"}
        </button>
        {!canSubmit && (
          <p className="muted" style={{ marginTop: 8 }}>
            {mode === "signup"
              ? "Provide email and a password (min 8 chars) to create an account."
              : "Provide email and password to sign in."}
          </p>
        )}
      </form>

      <div className="auth-switch">
        <span>{mode === "login" ? "New to Varity?" : "Already have an account?"}</span>
        <button
          type="button"
          className="auth-link"
          onClick={() => {
            setMode((current) => (current === "login" ? "signup" : "login"));
            setError(null);
          }}
        >
          {mode === "login" ? "Create account" : "Sign in"}
        </button>
      </div>
    </section>
  );
}
