import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { ProblemSolution } from "@/components/marketing/problem-solution";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { FAQ } from "@/components/marketing/faq";

export const metadata: Metadata = {
  title: "Australian Dispensing Workflow Practice",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <div id="experience">
        <ProblemSolution />
      </div>
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
    </>
  );
}
