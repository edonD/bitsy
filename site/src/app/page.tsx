import { Hero } from "@/components/home/Hero";
import { ProductBar } from "@/components/home/ProductBar";
import { HowItWorks } from "@/components/home/HowItWorks";
import { SimulationDiagram } from "@/components/home/SimulationDiagram";
import { Features } from "@/components/home/Features";
import { BuiltFor } from "@/components/home/BuiltFor";
import { Pricing } from "@/components/home/Pricing";
import { Faq } from "@/components/home/Faq";
import { CallToAction } from "@/components/home/CallToAction";

export default function HomePage() {
  return (
    <div className="divide-y divide-[color:var(--line)]">
      <Hero />
      <ProductBar />
      <HowItWorks />
      <SimulationDiagram />
      <Features />
      <BuiltFor />
      <Pricing />
      <Faq />
      <CallToAction />
    </div>
  );
}
