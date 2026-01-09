 "use client";
import { CheckCircle, CircleSlash, Rocket, ChevronRight } from "lucide-react";

function Item({
  icon,
  title,
  highlight = false,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  highlight?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    
    <div
      onClick={onClick}
      className={
        highlight
          ? "flex cursor-pointer items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-white/10"
          : active
          ? "flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-2 ring-red-500/60 dark:bg-zinc-900"
          : "flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-white/10"
      }
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10">
          {icon}
        </span>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {title}
        </span>
      </div>
      {highlight ? <ChevronRight className="text-zinc-400" size={18} /> : null}
    </div>
  );
}

export default function FeatureList({
  selected,
  onSelect,
}: {
  selected: "taxes" | "accounting" | "case" | "consulting";
  onSelect: (key: "taxes" | "accounting" | "case" | "consulting") => void;
}) {
  return (
    
    <div className="flex flex-col gap-3">
      <Item icon={<CheckCircle size={16} className="text-red-600" />} title="Tax Returns Preparation (Individual and business)" active={selected === "taxes"} onClick={() => onSelect("taxes")} />
      <Item icon={<CheckCircle size={16} color="#16a34a" />} title="Accounting and Bookkeeping" active={selected === "accounting"} onClick={() => onSelect("accounting")} />
      <Item icon={<Rocket size={16} color="#16a34a" />} title="Tax Case Resolution" active={selected === "case"} onClick={() => onSelect("case")} />
      <Item icon={<CircleSlash size={16} color="#f59e0b" />} title="Consulting Services" highlight active={selected === "consulting"} onClick={() => onSelect("consulting")} />
    </div>

  );
}
