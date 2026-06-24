import {
  Monitor,
  Zap,
  FileText,
  TrendingUp,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Monitor,
    title: "Realistic Fred-style interface",
    description:
      "Practise in an interface modelled closely on Fred Dispense — the dispensing software used across most Australian community pharmacies.",
  },
  {
    icon: Zap,
    title: "Instant, detailed feedback",
    description:
      "Every dispensing step is scored the moment you submit. Mistakes are highlighted with clear explanations so you learn fast.",
  },
  {
    icon: FileText,
    title: "Real PBS scenarios",
    description:
      "Cases drawn from common PBS items — metformin, atorvastatin, amoxicillin, warfarin, and more — with correct quantities, repeats, and authority requirements.",
  },
  {
    icon: TrendingUp,
    title: "Progress tracking",
    description:
      "See your scores over time, track which case categories you struggle with, and measure your accuracy streak before placement.",
  },
  {
    icon: ShieldCheck,
    title: "S4 & S8 case library",
    description:
      "Includes Schedule 4 and Schedule 8 dispensing scenarios with the additional checks and documentation those scripts require.",
  },
  {
    icon: Smartphone,
    title: "Study anywhere",
    description:
      "Fully responsive — practise on your laptop, tablet, or phone. No app download required, nothing to install.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Everything you need to practise with confidence
          </h2>
          <p className="mt-4 text-slate-600">
            Built specifically for Australian pharmacy students, with the
            workflows and scenarios you will actually encounter.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="group flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 transition-colors group-hover:bg-emerald-600">
                  <Icon className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-white" />
                </div>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
