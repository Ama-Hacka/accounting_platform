"use client";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"error" | "success">("error");
  const [resetting, setResetting] = useState(false);
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setMessageVariant("error");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      const user = data.user;
      const firm = (user?.email || "").toLowerCase().endsWith("@icmultiservices.com");
      let role: string | null = null;
      if (user) {
        const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        role = prof?.role || null;
      }
      if (firm && (role === "owner" || role === "admin" || role === "staff")) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setMessage("Enter your email to receive reset instructions.");
      setMessageVariant("error");
      return;
    }

    try {
      setResetting(true);
      setMessage(null);
      setMessageVariant("success");
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/update-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setMessage(`Password reset email sent to ${email}.`);
      setShowRecoveryInfo(true);
    } catch (err: any) {
      setMessage(err.message ?? "Unable to send reset email.");
      setMessageVariant("error");
    } finally {
      setResetting(false);
    }
  }

  function handleForgotPasswordClick() {
    setForgotPasswordMode(true);
    setMessage(null);
    setShowRecoveryInfo(false);
  }

  function handleBackToSignIn() {
    setForgotPasswordMode(false);
    setMessage(null);
    setShowRecoveryInfo(false);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-2xl font-semibold">{forgotPasswordMode ? "Reset password" : "Sign in"}</h1>
      
      {!forgotPasswordMode ? (
        <>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sign in
            </button>
          </form>
          <button
            type="button"
            onClick={handleForgotPasswordClick}
            className="mt-3 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Forgot password?
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
          <form onSubmit={onResetPassword} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Confirm your email
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
              />
            </div>
            <button
              type="submit"
              disabled={resetting}
              className="w-full rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resetting ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <button
            type="button"
            onClick={handleBackToSignIn}
            className="mt-3 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            ← Back to sign in
          </button>
        </>
      )}
      {message && (
        <p
          className={`mt-4 text-sm ${
            messageVariant === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          }`}
        >
          {message}
        </p>
      )}
      {forgotPasswordMode && showRecoveryInfo && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-white/10 dark:bg-zinc-800/50">
          <p className="font-medium text-zinc-900 dark:text-white">Can&apos;t access your email?</p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Send an email to{" "}
            <a href="mailto:accounting@icmultiservices.com" className="font-medium text-red-600 hover:underline dark:text-red-400">
              accounting@icmultiservices.com
            </a>{" "}
            with:
          </p>
          <ul className="mt-2 list-inside list-disc text-zinc-600 dark:text-zinc-400">
            <li>A photo of your government-issued ID</li>
            <li>A selfie of yourself holding the ID</li>
            <li>Your old email address</li>
            <li>Your new email address</li>
          </ul>
          <p className="mt-2 text-zinc-500 dark:text-zinc-500">
            We&apos;ll review your request within 24-48 hours.
          </p>
        </div>
      )}
      {!forgotPasswordMode && (
        <div className="mt-6 text-sm text-zinc-700 dark:text-zinc-300">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="font-medium text-red-600 hover:underline dark:text-red-400">
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}
