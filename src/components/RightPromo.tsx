import Link from "next/link";

type Card = {
  label: string;
  h1: string;
  h2Highlight: string;
  h3: string;
  body: string;
  cta: string;
  accentClass?: string;
  href?: string;
};

export default function RightPromo({ card }: { card: Card }) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {card.label}
      </div>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-zinc-900 dark:text-white">
        {card.h1}
        <br />
        <span className={`underline decoration-4 ${card.accentClass ?? "decoration-sky-400"}`}>{card.h2Highlight}</span>
        <br />
        {card.h3}
      </h2>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
        {card.body}
      </p>
      <Link
        href={card.href ?? "#"}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0b1b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0f2547]"
      >
        {card.cta}
      </Link>
    </div>
  );
}
