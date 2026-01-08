"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

function UpdatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "ready" | "error">("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"error" | "success">("error");
  const [saving, setSaving] = useState(false);
  const redirectTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function prepareRecoverySession() {
      try {
        setStatus("verifying");
        setMessage(null);

        const code = searchParams?.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error("Recovery link is invalid or has expired. Request a new reset email.");
        }

        setStatus("ready");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message ?? "Unable to validate recovery link.");
        setMessageVariant("error");
      }
    }

    prepareRecoverySession();
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setMessage("Password must be at least 8 characters long.");
      setMessageVariant("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setMessageVariant("error");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessageVariant("success");
      setMessage("Password updated successfully. Redirecting to dashboard...");
      redirectTimer.current = setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch (err: any) {
      setMessage(err.message ?? "Unable to update password.");
      setMessageVariant("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      {status === "verifying" && <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">Validating recovery link…</p>}
      {status === "error" && message && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{message}</p>
      )}
      {status === "ready" && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            disabled={saving}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            disabled={saving}
          />
          <button
            type="submit"
            className="w-full rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
      {status === "ready" && message && (
        <p
          className={`mt-4 text-sm ${
            messageVariant === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {message}
        </p>
      )}
    </main>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-6 pt-24">
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            Loading…
          </p>
        </main>
      }
    >
      <UpdatePasswordContent />
    </Suspense>
  );
}
