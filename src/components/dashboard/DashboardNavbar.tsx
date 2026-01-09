"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useRef, useState } from "react";

interface DashboardNavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: any;
  profile: { first_name?: string; last_name?: string } | null;
}

const navTabs = [
  { id: "dashboard", label: "Dashboard" },
  { id: "profile", label: "Profile" },
  { id: "taxes", label: "Taxes" },
  { id: "documents", label: "Documents" },
];

export default function DashboardNavbar({ 
  activeTab, 
  onTabChange, 
  user, 
  profile 
}: DashboardNavbarProps) {
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const userInitials = (() => {
    const firstInitial = (profile?.first_name || "").charAt(0);
    const lastInitial = (profile?.last_name || "").charAt(0);
    if (firstInitial || lastInitial) {
      return `${firstInitial}${lastInitial}`.toUpperCase();
    }
    return (user?.email || "").substring(0, 2).toUpperCase();
  })();

  const displayName = profile?.first_name 
    ? `${profile.first_name} ${profile.last_name || ""}`.trim()
    : user?.email?.split("@")[0] || "User";

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!userMenuRef.current) return;
      const target = e.target as Node;
      if (!userMenuRef.current.contains(target)) setUserMenuOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setUserMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-white/10 dark:bg-zinc-900/95">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Image 
            className="object-contain" 
            src="/globe.png" 
            alt="IC Multi Services" 
            width={32} 
            height={32}
          />
          <Link 
            href="/" 
            className="text-sm font-bold tracking-widest text-zinc-900 dark:text-white"
          >
            IC Multi Services
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications */}
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white">
            <Bell size={18} />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
            </span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-zinc-700">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {displayName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Client Portal
              </p>
            </div>

            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
              >
                {userInitials}
              </button>
              {userMenuOpen ? (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-900">
                  <ul className="flex flex-col">
                    {navTabs.map((tab) => (
                      <li key={tab.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onTabChange(tab.id);
                            setUserMenuOpen(false);
                          }}
                          className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {tab.label}
                        </button>
                      </li>
                    ))}
                    <li className="my-1 border-t border-zinc-200/80 dark:border-white/10" />
                    <li>
                      <button
                        type="button"
                        onClick={async () => {
                          setUserMenuOpen(false);
                          await handleSignOut();
                        }}
                        className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-zinc-800"
                      >
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>

            <button
              onClick={handleSignOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 min-w-max px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "text-red-600 border-red-600 bg-red-50/50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-400"
                  : "text-zinc-500 border-transparent hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
