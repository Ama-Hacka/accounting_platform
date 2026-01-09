"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
  Settings,
  Users,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      if ((role === "owner" || role === "admin" || role === "staff") && isFirmEmail) {
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

  const displayName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Admin";
  const initials = `${(profile?.first_name || "").slice(0, 1)}${(profile?.last_name || "").slice(0, 1)}`
    .toUpperCase()
    .trim() || "AD";
  const roleLabel = profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "";
  const canManageMembers = profile?.role === "owner" || profile?.role === "admin";

  const navItems: Array<{
    label: string;
    href?: string;
    icon: React.ReactNode;
  }> = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Clients", href: "/admin/clients", icon: <Users className="h-5 w-5" /> },
    ...(canManageMembers ? [{ label: "Members", href: "/admin/members", icon: <Users className="h-5 w-5" /> }] : []),
    { label: "Reports", icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Tax Returns", icon: <FileText className="h-5 w-5" /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 flex-col border-r border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-950 sm:flex">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{displayName || "Admin"}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Admin Panel
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isActive = item.href ? pathname === item.href : false;

                const baseClasses =
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors";
                const activeClasses = "bg-primary/10 text-primary";
                const inactiveClasses =
                  "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50";

                if (!item.href) {
                  return (
                    <div key={item.label} className={`${baseClasses} ${inactiveClasses} cursor-default opacity-60`}>
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                  >
                    {item.icon}
                    <span className={isActive ? "font-semibold" : "font-medium"}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-zinc-200 p-4 dark:border-white/10">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold">{displayName || "Admin"}</div>
                <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">{roleLabel || ""}</div>
              </div>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
              className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-white/10 dark:bg-zinc-950">
            <div className="w-full max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search clients, documents, or tasks..."
                  className="w-full rounded-lg border border-transparent bg-zinc-100 py-2 pl-9 pr-3 text-sm placeholder:text-zinc-500 focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-zinc-900 dark:placeholder:text-zinc-500"
                />
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <button
                type="button"
                className="relative rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950" />
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
