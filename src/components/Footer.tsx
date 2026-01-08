"use client";

import Image from "next/image";
import Link from "next/link";

const services = [
  { name: "Tax Preparation", href: "/services/individual-tax-return" },
  { name: "Corporate Accounting", href: "/services/accounting-and-bookkeeping" },
  { name: "Payroll Services", href: "/services" },
  { name: "Business Advisory", href: "/services/consulting" },
];

const company = [
  { name: "Our Story", href: "/about" },
  { name: "Core Values", href: "/about" },
  { name: "Careers", href: "/about" },
  { name: "Contact Us", href: "/support" },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 px-6 py-12 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="IC Multi-Services" width={32} height={32} />
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                IC Multi-Services
              </span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Helping you navigate the complexity of accounting and financial growth since 2011.
              Professionalism and integrity in every balance sheet.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://icmultiservices.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-pink-500 hover:text-pink-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-pink-400 dark:hover:text-pink-400"
                aria-label="Website"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeWidth="2" d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
              <a
                href="mailto:accounting@icmultiservices.com"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 transition-colors hover:border-pink-500 hover:text-pink-500 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-pink-400 dark:hover:text-pink-400"
                aria-label="Email"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Services</h3>
            <ul className="mt-4 space-y-3">
              {services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-pink-600 dark:text-zinc-400 dark:hover:text-pink-400"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Company</h3>
            <ul className="mt-4 space-y-3">
              {company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-600 transition-colors hover:text-pink-600 dark:text-zinc-400 dark:hover:text-pink-400"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Newsletter</h3>
            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              Stay updated with financial insights and compliance news.
            </p>
            <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email address"
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
              />
              <button
                type="submit"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-600 text-white transition-colors hover:bg-pink-500"
                aria-label="Subscribe"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800 md:flex-row">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            © {new Date().getFullYear()} IC Multi-Services. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-zinc-500 transition-colors hover:text-pink-600 dark:text-zinc-500 dark:hover:text-pink-400"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-zinc-500 transition-colors hover:text-pink-600 dark:text-zinc-500 dark:hover:text-pink-400"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
