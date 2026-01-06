import Image from "next/image";

export default function CenterImageWithStat() {
  return (
    <div className="relative rounded-2xl bg-white p-0 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-y-0 left-0 w-16 bg-yellow-300/60" />
        <Image
          src="/window.svg"
          alt="Workspace"
          width={640}
          height={420}
          className="h-auto w-full object-cover"
        />
      </div>
      <div className="absolute right-6 top-6">
        <div className="rounded-xl bg-white px-4 py-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-800 dark:ring-white/10">
          <div className="text-xs font-medium uppercase text-zinc-500">
            SALES
          </div>
          <div className="mt-1 text-xl font-semibold text-zinc-800 dark:text-zinc-100">
            $12,614
          </div>
          <div className="mt-1 text-xs font-medium text-green-600">
            Up 33% from last month
          </div>
        </div>
      </div>
    </div>
  );
}

