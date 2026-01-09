"use client";

import Link from "next/link";

export default function OBBAHero() {
  return (
    <section className="relative isolate">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div
          className="flex min-h-[520px] flex-col gap-6 rounded-xl bg-cover bg-center bg-no-repeat px-6 md:gap-8 md:px-16 items-start justify-center"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.7) 100%), url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop")`,
          }}
        >
          <div className="flex flex-col gap-4 max-w-2xl">
            <h1 className="text-white text-4xl font-extrabold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              The OBBA is Here: Navigating the One Big Beautiful Bill Act
            </h1>
            <p className="text-gray-200 text-base font-normal leading-relaxed md:text-lg">
              Unprecedented tax savings opportunities for businesses and high-net-worth
              individuals. Gain a competitive edge with expert-led navigation of the OBBA.
            </p>
          </div>
          <Link
            href="/support"
            className="flex min-w-[200px] cursor-pointer items-center justify-center rounded-lg h-12 px-6 bg-red-600 text-white text-base font-bold hover:bg-red-700 transition-transform active:scale-95"
          >
            Schedule Strategy Session
          </Link>
        </div>
      </div>
    </section>
  );
}
