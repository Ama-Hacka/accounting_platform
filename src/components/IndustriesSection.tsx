"use client";

import Image from "next/image";

const industries = [
  {
    name: "Modeling",
    image: "/industries/modeling.webp",
    fallbackColor: "from-pink-500 to-rose-600",
  },
  {
    name: "Restaurants",
    image: "/industries/restaurants.webp",
    fallbackColor: "from-amber-500 to-orange-600",
  },
  {
    name: "Public Figures / Influencers",
    image: "/industries/Influencers.webp",
    fallbackColor: "from-blue-500 to-cyan-600",
  },
  {
    name: "Furniture Store",
    image: "/industries/furniture.webp",
    fallbackColor: "from-slate-500 to-slate-700",
  },
  {
    name: "Construction",
    image: "/industries/construction.webp",
    fallbackColor: "from-emerald-500 to-green-600",
  },
  {
    name: "Beauty / Barber Shops",
    image: "/barbershop.webp",
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
              <div
                className={`relative h-36 w-36 overflow-hidden rounded-full border-[3px] border-pink-600 bg-gradient-to-br ${industry.fallbackColor} md:h-44 md:w-44`}
              >
                <Image
                  src={industry.image}
                  alt={industry.name}
                  fill
                  className="object-cover object-center grayscale transition-all duration-300 hover:grayscale-0"
                  sizes="(max-width: 768px) 144px, 176px"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
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
