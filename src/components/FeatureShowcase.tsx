"use client";
import { useState } from "react";
import FeatureList from "./FeatureList";
import FeatureDetailPanel, { DetailCard } from "./FeatureDetailPanel";

const cards: Record<
  "taxes" | "progress" | "run" | "grow",
  DetailCard
> = {
  taxes: {
    label: "TAX SERVICES",
    h1: "We file your",
    h2Highlight: "taxes accurately",
    h3: "and on time",
    body:
      "End-to-end tax preparation with expert review. Stay compliant and maximize deductions without the stress.",
    cta: "Explore Tax Services",
    accentClass: "decoration-pink-400",
    href: "/products#tax",
  },
  progress: {
    label: "FINANCIAL PLANNING",
    h1: "Make steady",
    h2Highlight: "financial progress",
    h3: "with clear goals",
    body:
      "Track budgets, savings, and investments with guided plans and automated insights tailored to you.",
    cta: "See Plans",
    accentClass: "decoration-green-400",
    href: "/products#planning",
  },
  run: {
    label: "BUSINESS OPERATIONS",
    h1: "Run your business",
    h2Highlight: "without the chaos",
    h3: "from invoicing to payroll",
    body:
      "Unified tools for invoicing, expenses, and payroll. Keep everything organized and audit-ready.",
    cta: "View Operations Suite",
    accentClass: "decoration-emerald-400",
    href: "/solutions#operations",
  },
  grow: {
    label: "GROWTH",
    h1: "Turn your emails",
    h2Highlight: "and SMS into",
    h3: "revenue",
    body:
      "With AI‑backed, personalized marketing, you can create omnichannel campaigns at scale. Drive it all with automation flows.",
    cta: "Go to Mailchimp",
    accentClass: "decoration-sky-400",
    href: "#",
  },
} as const;

export default function FeatureShowcase() {
  const [selected, setSelected] = useState<"taxes" | "progress" | "run" | "grow">("grow");
  return (
    <section className="bg-zinc-100 py-16 dark:bg-zinc-950">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 md:grid-cols-3">
        <div>
          <FeatureList selected={selected} onSelect={setSelected} />
        </div>
        <div className="md:col-span-2">
          <FeatureDetailPanel
            imageSrc={
              selected === "taxes"
                ? "/file.svg"
                : selected === "progress"
                ? "/globe.svg"
                : "/window.svg"
            }
            accentBandClass={
              selected === "taxes"
                ? "bg-pink-300/60"
                : selected === "progress"
                ? "bg-green-300/60"
                : selected === "run"
                ? "bg-emerald-300/60"
                : "bg-yellow-300/60"
            }
            statLabel={selected === "taxes" ? "REFUNDS" : selected === "progress" ? "SAVINGS" : selected === "run" ? "CASH FLOW" : "SALES"}
            statValue={selected === "taxes" ? "$3,240" : selected === "progress" ? "$12,614" : selected === "run" ? "$8,210" : "$12,614"}
            statDelta={selected === "taxes" ? "Up 12% from last year" : selected === "progress" ? "Up 33% from last month" : selected === "run" ? "Stable week over week" : "Up 33% from last month"}
            card={cards[selected]}
          />
        </div>
      </div>
    </section>
  );
}
