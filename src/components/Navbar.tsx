"use client";
import Link from "next/link";
import Image from "next/image";
import { CircleDollarSign, ChevronDown, Globe } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useEffect, useRef, useState } from "react";

const navItems = [
  {
    label: "Featured insights",
    href: "/featuredinsights",
    children: [{ label: "OBBBA", href: "/featuredinsights/obbba" }],
  },
  {
    label: "Services",
    href: "/services",
    children: [
      { label: "Individual Tax Return", href: "/services/individual-tax-return" },
      { label: "Business Tax Return", href: "/services/business-tax-return" },
      { label: "Accounting and Bookkeeping", href: "/services/accounting-and-bookkeeping" },
      { label: "Tax Case Resolution", href: "/services/tax-case-resolution" },
      { label: "Information Return Filings", href: "/services/information-return-filings" },
      { label: "Consulting", href: "/services/consulting" },
    ],
  },
  { label: "Industries", href: "/industries" },
  {
    label: "Technology",
    href: "/technology",
    children: [
      { label: "Estimated Tax Calculator", href: "/technology/estimated-tax-calculator" },
    ],
  },
  { label: "About us", href: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!navRef.current) return;
      const target = e.target as Node;
      if (!navRef.current.contains(target)) setOpen(null);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/65 dark:border-white/10 dark:bg-zinc-900/80">
      <nav ref={navRef} className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image className="object-contain" src="/globe.png" alt="Globe" width={32} height={32} />
          <Link href="/" className="cursor-pointer text-sm font-bold tracking-widest text-zinc-900 dark:text-white">
            IC Multi Services
          </Link>
        </div>

        <ul className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <li
              key={item.label}
              className="relative"
            >
              {item.children ? (
                <button
                  type="button"
                  aria-expanded={open === item.label}
                  className="group inline-flex cursor-pointer items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                  onClick={() => setOpen(open === item.label ? null : item.label)}
                >
                  {item.label}
                  <ChevronDown size={14} className="text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400" />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="group inline-flex cursor-pointer items-center gap-1 text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                >
                  {item.label}
                </Link>
              )}
              {item.children && open === item.label ? (
                <div
                  className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-zinc-900"
                  onMouseLeave={() => setOpen(null)}
                >
                  <ul className="flex flex-col">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block cursor-pointer rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 text-sm text-zinc-700 md:flex dark:text-zinc-300">
            <Globe size={16} />
            EN–US
          </span>
          <Link
            href="/auth/signin"
            className="cursor-pointer text-sm font-medium text-zinc-900 hover:underline dark:text-white"
          >
            Sign in
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
