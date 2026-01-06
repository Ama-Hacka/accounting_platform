"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/signin");
        return;
      }
      const { data } = await supabase.from("profiles").select("role, first_name, last_name").eq("id", user.id).single();
      const role = data?.role;
      const isFirmEmail = (user.email || "").toLowerCase().endsWith("@icmultiservices.com");
      if ((role === "owner" || role === "staff") && isFirmEmail) {
        setAuthorized(true);
        setUser(user);
        setProfile(data);
      } else {
        router.replace("/");
      }
    }
    check();
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
        <div>
          <div className="mb-6 flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
              {`${(profile?.first_name || "").slice(0,1)}${(profile?.last_name || "").slice(0,1)}`.toUpperCase() || "AD"}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                {profile ? `${profile.first_name} ${profile.last_name}` : "Admin"}
              </div>
              <div className="text-xs text-zinc-500">ADMIN PANEL</div>
            </div>
          </div>
          <nav className="space-y-2">
            <Link className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/admin">Dashboard</Link>
            <Link className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/admin/clients">Clients</Link>
            <Link className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/admin/settings">Settings</Link>
          </nav>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">
            {profile ? `${profile.first_name} ${profile.last_name}` : ""}
          </div>
          <div className="text-xs text-zinc-500">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ""}</div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="mt-2 w-full rounded bg-zinc-200 px-3 py-1 text-xs text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="ml-64 p-6">{children}</main>
    </div>
  );
}
