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
          ? "flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-2 ring-pink-500/60 dark:bg-zinc-900"
          : "flex cursor-pointer items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-black/5 hover:bg-zinc-50 dark:bg-zinc-900 dark:ring-white/10"
      }
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/10">
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
  selected: "taxes" | "progress" | "run" | "grow";
  onSelect: (key: "taxes" | "progress" | "run" | "grow") => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Item icon={<CheckCircle size={16} color="#f43f5e" />} title="Your taxes done right" active={selected === "taxes"} onClick={() => onSelect("taxes")} />
      <Item icon={<CheckCircle size={16} color="#16a34a" />} title="Make financial progress" active={selected === "progress"} onClick={() => onSelect("progress")} />
      <Item icon={<Rocket size={16} color="#16a34a" />} title="Run your business" active={selected === "run"} onClick={() => onSelect("run")} />
      <Item icon={<CircleSlash size={16} color="#f59e0b" />} title="Grow your business" highlight active={selected === "grow"} onClick={() => onSelect("grow")} />
    </div>
  );
}
