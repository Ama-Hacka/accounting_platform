import { OBBAHero, OBBABenefits, OBBAActionPlan } from "@/components/obba";
import Footer from "@/components/Footer";

export const metadata = {
  title: "OBBA Tax Act Overview | IC Multi Services",
  description:
    "Navigate the One Big Beautiful Bill Act with expert guidance. Discover unprecedented tax savings opportunities for businesses and high-net-worth individuals.",
};

export default function OBBBAPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pt-16">
      <OBBAHero />
      <OBBABenefits />
      <OBBAActionPlan />
      <Footer />
    </div>
  );
}

