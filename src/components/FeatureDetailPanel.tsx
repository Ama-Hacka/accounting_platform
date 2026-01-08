import Image from "next/image";
import RightPromo from "./RightPromo";

export type DetailCard = {
  label: string;
  h1: string;
  h2Highlight: string;
  h3: string;
  body: string;
  cta: string;
  accentClass?: string;
  href?: string;
};

export default function FeatureDetailPanel({
  imageSrc,
  statLabel,
  statValue,
  statDelta,
  card,
}: {
  imageSrc: string;
  statLabel: string;
  statValue: string;
  statDelta: string;
  card: DetailCard;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl">
      
          <Image
            src={imageSrc}
            alt="Workspace"
            width={300}
            height={500}
            className="h-auto w-full object-cover"
          />
          <div className="absolute right-4 top-4">
            <div className="rounded-xl bg-white px-4 py-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
              <div className="text-xs font-medium uppercase text-zinc-500">
                {statLabel}
              </div>
              <div className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                {statValue}
              </div>
              <div className="mt-1 text-xs font-medium text-green-600">
                {statDelta}
              </div>
            </div>
          </div>
        </div>
        <RightPromo card={card} />
      </div>
    </div>
  );
}

