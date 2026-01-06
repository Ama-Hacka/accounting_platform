 "use client";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage(`Check your inbox to confirm: ${data.user?.email}`);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-2xl font-semibold">Create account</h1>
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
          Sign up
        </button>
      </form>
      {message && <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{message}</p>}
    </main>
  );
}

