import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative isolate min-h-[80vh]">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/window.svg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 dark:bg-black/55" />
      </div>

      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto flex min-h-full max-w-6xl items-center px-6">
          <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold leading-tight text-white sm:text-6xl">
            Focus on what matters,  
            <br />
            we’ll handle the rest
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/85">
            Connect with us
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full bg-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-pink-500"
            >
              GET STARTED →
            </Link>
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
            >
              LEARN MORE
            </Link>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
