"use client";

import Link from "next/link";
import { CheckCircle, Check } from "lucide-react";

interface ActionItemProps {
  title: string;
  description: string;
}

function ActionItem({ title, description }: ActionItemProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 border-l-4 border-red-600">
      <CheckCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-bold text-zinc-900 dark:text-white">{title}</h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

const actionItems = [
  {
    title: "Review Asset Purchases",
    description:
      "Analyze current and planned capital expenditures to maximize depreciation timing.",
  },
  {
    title: "Evaluate R&D Spending",
    description:
      "Document research activities to qualify for immediate expensing under the new rules.",
  },
  {
    title: "Update Estate Plans",
    description:
      "Adjust trust structures to leverage the increased lifetime exemption limits.",
  },
];

const consultationFeatures = [
  "1-on-1 Consultation",
  "Comprehensive Impact Report",
  "Immediate Implementation Steps",
];

export default function OBBAActionPlan() {
  return (
    <section className="w-full bg-white dark:bg-zinc-900 py-16">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Action Plan */}
          <div>
            <h2 className="text-zinc-900 dark:text-white text-3xl font-extrabold leading-tight tracking-tight mb-6">
              How to Capitalize: Your Action Plan
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">
              Success with the OBBA requires proactive planning. Use this
              checklist to begin your transition and optimize your tax strategy.
            </p>
            <div className="flex flex-col gap-4">
              {actionItems.map((item, index) => (
                <ActionItem
                  key={index}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </div>

          {/* Right Column - CTA Card */}
          <div className="bg-zinc-100 dark:bg-zinc-800 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Ready for a Deep Dive?
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Our senior tax partners are ready to build your custom OBBA
                compliance and strategy roadmap.
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {consultationFeatures.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 text-sm text-zinc-900 dark:text-zinc-300"
                >
                  <Check className="size-5 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/support"
              className="w-full flex cursor-pointer items-center justify-center rounded-lg h-14 px-6 bg-red-600 text-white text-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              Schedule Strategy Session
            </Link>

            <p className="text-center text-xs text-zinc-500 italic">
              No obligation. Limited availability for Q3 sessions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
