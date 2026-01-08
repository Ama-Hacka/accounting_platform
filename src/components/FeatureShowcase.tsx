"use client";
import { useState } from "react";
import FeatureList from "./FeatureList";
import FeatureDetailPanel, { DetailCard } from "./FeatureDetailPanel";

const cards: Record<
  "taxes" | "accounting" | "case" | "consulting",
  DetailCard
> = {
  taxes: {
    label: "TAX SERVICES",
    h1: "Maximize your",
    h2Highlight: "Returns and",
    h3: "Minimize the risk",
    body:
      "Our tax preparation services support individuals and small businesses with planning, compliance, and organization. We manage personal returns, business filings, and back-office tax processes—bringing clarity, accuracy, and peace of mind.",
    cta: "File Now!",
    accentClass: "decoration-pink-400",
    href: "/products#tax",
  },
  accounting: {
    label: "FINANCIAL PLANNING",
    h1: "Make steady",
    h2Highlight: "Financial Planning",
    h3: "with clear goals",
    body:
      "Our accounting and bookkeeping services keep your business organized and running smoothly. From bookkeeping, bill payments, AR/AP, payroll, and cash flow planning to budgeting, forecasting, insurance support, and major asset decisions—we help you stay in control while we handle the details.",
    cta: "Let's connect",
    accentClass: "decoration-green-400",
    href: "/products#planning",
  },
  case: {
    label: "TAX CASE RESOLUTION",
    h1: "Resolve your tax",
    h2Highlight: "case with ease",
    h3: "and confidence",
    body:
      "Received a tax notice or letter? Our tax case resolution services provide ongoing support by handling IRS and state tax matters on your behalf. Through authorized representation, we communicate with tax agencies, resolve issues, and help keep your accounts current and compliant",
    cta: "Let us help you!",
    accentClass: "decoration-emerald-400",
    href: "/solutions#operations",
  },
  consulting: {
    label: "CONSULTING",
    h1: "Simplify your business",
    h2Highlight: "Amplify",
    h3: "your focus",
    body:
      `Our consulting services are built around one idea: making your life easier.
Whether you’re navigating business decisions, tax planning, or implementing smarter tools like AI, we work alongside you to simplify the process. You focus on what matters—we handle the rest.`,
    cta: "Contact us",
    accentClass: "decoration-sky-400",
    href: "#",
  },
} as const;

export default function FeatureShowcase() {
  const [selected, setSelected] = useState<"taxes" | "accounting" | "case" | "consulting">("consulting");
  return (
    <section className="bg-zinc-100 py-16 dark:bg-zinc-950">
      <h2 className="text-3xl font-semibold text-center mb-8">FEATURED SERVICES</h2>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-3">
        <div>
          <FeatureList selected={selected} onSelect={setSelected} />
        </div>
        <div className="md:col-span-2">
          <FeatureDetailPanel
            imageSrc={
              selected === "taxes"
                ? "/taxes.png"
                : selected === "accounting"
                ? "/accounting.png"
                : selected === "case"
                ? "/taxresolution.png"
                : selected === "consulting"
                ? "/consulting.png" 
                : "/consultingpng"
            }
            
            statLabel={selected === "taxes" ? "REFUNDS" : selected === "accounting" ? "SAVINGS" : selected === "case" ? "TOTAL SAVED" : "PROFIT"}
            statValue={selected === "taxes" ? "$5,490" : selected === "accounting" ? "$12,614" : selected === "case" ? "$3M +" : "$18,614"}
            statDelta={selected === "taxes" ? "Up 15% from last year" : selected === "accounting" ? "Up 33% from last month" : selected === "case" ? "" : "Up 33% from last month"}
            card={cards[selected]}
          />
        </div>
      </div>
    </section>
  );
}
