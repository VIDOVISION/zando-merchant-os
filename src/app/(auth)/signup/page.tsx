"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SIGNUP_HEADING = "Create your Zando account";
const SIGNUP_SUBHEADING = "Start restocking smarter. Free to get started.";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Sign up — DB trigger auto-confirms the email so no confirmation email is needed
    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Sign in immediately (email is auto-confirmed by DB trigger)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          {SIGNUP_HEADING}
        </h1>
        <p className="mt-2 text-sm text-secondary">{SIGNUP_SUBHEADING}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-secondary mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            placeholder="you@shop.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-secondary mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-xs font-medium text-secondary mb-1.5"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            placeholder="Re-enter your password"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full accent-gradient btn-shine text-background font-medium px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-accent hover:text-accent/80 transition-colors font-medium"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
