 "use client";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else router.push("/dashboard");
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-2xl font-semibold">Sign in</h1>
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
          className="w-full rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500"
        >
          Sign in
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{message}</p>}
      <div className="mt-6 text-sm text-zinc-700 dark:text-zinc-300">
        Don’t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-pink-600 hover:underline dark:text-pink-400">
          Sign up
        </Link>
      </div>
    </main>
  );
}
