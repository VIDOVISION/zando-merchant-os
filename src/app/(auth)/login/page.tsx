"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const LOGIN_HEADING = "Sign in to Zando";
const LOGIN_SUBHEADING = "Your Merchant OS — restock, track, and grow.";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth_error"
      ? "Authentication failed. Please try again or sign up."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-gradient">
          {LOGIN_HEADING}
        </h1>
        <p className="mt-2 text-sm text-secondary">{LOGIN_SUBHEADING}</p>
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-primary placeholder:text-muted focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
            placeholder="Enter your password"
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
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="text-accent hover:text-accent/80 transition-colors font-medium"
        >
          Sign up
        </Link>
      </p>
    </>
  );
}
