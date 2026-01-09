"use client";

import {
  TrendingUp,
  FlaskConical,
  ShieldCheck,
  Rocket,
  Landmark,
  Info,
} from "lucide-react";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function BenefitCard({ icon, title, description }: BenefitCardProps) {
  return (
    <div className="flex flex-1 gap-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className="size-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
        {icon}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-zinc-900 dark:text-white text-lg font-bold leading-tight">
          {title}
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

function CalloutCard() {
  return (
    <div className="flex flex-1 gap-4 rounded-xl bg-slate-800 dark:bg-red-900/40 p-6 flex-col text-white shadow-sm">
      <div className="size-12 rounded-lg bg-white/20 flex items-center justify-center">
        <Info className="size-7" />
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-white text-lg font-bold leading-tight">
          What's Next?
        </h3>
        <p className="text-white/80 text-sm font-normal leading-relaxed">
          The OBBA provisions are complex. Discover how these changes
          specifically impact your portfolio today.
        </p>
      </div>
    </div>
  );
}

const benefits = [
  {
    icon: <TrendingUp className="size-7" />,
    title: "100% Bonus Depreciation",
    description:
      "Accelerated recovery for capital investments and immediate cash flow injections through full expensing.",
  },
  {
    icon: <FlaskConical className="size-7" />,
    title: "R&D Expensing",
    description:
      "Immediate tax relief for innovation costs, allowing businesses to deduct 100% of R&D expenses in year one.",
  },
  {
    icon: <ShieldCheck className="size-7" />,
    title: "Estate Tax Exemption",
    description:
      "Protecting generational wealth with expanded limits and strategic shelter provisions for high-net-worth families.",
  },
  {
    icon: <Rocket className="size-7" />,
    title: "QSBS Expansion",
    description:
      "Incentivizing small business investments through expanded tax-free gains and more flexible eligibility criteria.",
  },
  {
    icon: <Landmark className="size-7" />,
    title: "SALT Cap Relief",
    description:
      "Strategic deductions for state and local taxes, offering significant relief for high-earning individuals in high-tax states.",
  },
];

export default function OBBABenefits() {
  return (
    <section className="mx-auto max-w-6xl py-12 px-4 lg:px-6">
      <div className="flex flex-col gap-2 mb-8">
        <span className="text-red-600 font-bold tracking-widest uppercase text-xs">
          Legislative Update
        </span>
        <h2 className="text-zinc-900 dark:text-white text-3xl font-extrabold leading-tight tracking-tight">
          Key Benefits of the OBBA
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl">
          Discover how the One Big Beautiful Bill Act transforms the fiscal
          landscape for your business and estate planning.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((benefit, index) => (
          <BenefitCard
            key={index}
            icon={benefit.icon}
            title={benefit.title}
            description={benefit.description}
          />
        ))}
        <CalloutCard />
      </div>
    </section>
  );
}
