 "use client";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "business">("individual");
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "es">("en");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          account_type: accountType,
          preferred_language: preferredLanguage,
        },
      },
    });
    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      return;
    }

    setMessage(`Check your inbox to confirm: ${data.user?.email ?? email}`);
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-24">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            required
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
            required
          />
        </div>
        <input
          type="tel"
          placeholder="Phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900"
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Account type
            </label>
            <div className="flex rounded-lg border border-zinc-200 dark:border-white/15 overflow-hidden">
              <button
                type="button"
                onClick={() => setAccountType("individual")}
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  accountType === "individual"
                    ? "bg-pink-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setAccountType("business")}
                className={`flex-1 px-3 py-2 text-sm transition-colors border-l border-zinc-200 dark:border-white/15 ${
                  accountType === "business"
                    ? "bg-pink-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                Business
              </button>
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              Language
            </label>
            <div className="flex rounded-lg border border-zinc-200 dark:border-white/15 overflow-hidden">
              <button
                type="button"
                onClick={() => setPreferredLanguage("en")}
                className={`flex-1 px-3 py-2 text-sm transition-colors ${
                  preferredLanguage === "en"
                    ? "bg-pink-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setPreferredLanguage("es")}
                className={`flex-1 px-3 py-2 text-sm transition-colors border-l border-zinc-200 dark:border-white/15 ${
                  preferredLanguage === "es"
                    ? "bg-pink-600 text-white"
                    : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                ES
              </button>
            </div>
          </div>
        </div>
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

