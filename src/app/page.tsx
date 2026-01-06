import Image from "next/image";
import Hero from "../components/Hero";
import FeatureShowcase from "../components/FeatureShowcase";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <Hero />
      <FeatureShowcase />
    </div>
  );
}
