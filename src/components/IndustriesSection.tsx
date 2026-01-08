"use client";

import Image from "next/image";

const industries = [
  {
    name: "Modeling",
    image: "/industries/modeling.svg",
    fallbackColor: "from-pink-500 to-rose-600",
  },
  {
    name: "Restaurants",
    image: "/industries/restaurants.svg",
    fallbackColor: "from-amber-500 to-orange-600",
  },
  {
    name: "Public Figures / Influencers",
    image: "/industries/technology.svg",
    fallbackColor: "from-blue-500 to-cyan-600",
  },
  {
    name: "Furniture Store",
    image: "/industries/furniture.svg",
    fallbackColor: "from-slate-500 to-slate-700",
  },
  {
    name: "Construction",
    image: "/industries/construction.svg",
    fallbackColor: "from-emerald-500 to-green-600",
  },
  {
    name: "Beauty / Barber Shops",
    image: "/industries/legal.svg",
    fallbackColor: "from-red-700 to-red-900",
  },
];

export default function IndustriesSection() {
  return (
    <section className="bg-slate-900 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-white md:text-4xl">
          Industries We Serve
        </h2>
        <p className="mt-4 max-w-xl text-slate-400">
          Tailored expertise for your specific needs, providing specialized financial
          solutions across diverse sectors.
        </p>
        <div className="mt-12 grid grid-cols-1 place-items-center gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((industry) => (
            <div key={industry.name} className="flex flex-col items-center gap-4">
              <div className="rounded-full border-2 border-pink-600 p-1">
                <div
                  className={`relative h-32 w-32 overflow-hidden rounded-full border border-slate-700 bg-gradient-to-br ${industry.fallbackColor} md:h-40 md:w-40`}
                >
                <Image
                  src={industry.image}
                  alt={industry.name}
                  fill
                  className="object-cover grayscale transition-all duration-300 hover:grayscale-0"
                  onError={(e) => {
                    // Hide the image if it fails to load, showing the gradient background
                    e.currentTarget.style.display = 'none';
                  }}
                />
                </div>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                {industry.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
