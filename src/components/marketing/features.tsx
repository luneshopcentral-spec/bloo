import {
  Monitor,
  Zap,
  FileText,
  CircleAlert,
  ShieldCheck,
  Laptop,
} from "lucide-react";

const features = [
  {
    icon: Monitor,
    title: "Realistic Fred-style interface",
    description:
      "Build familiarity with a laptop-first, Fred-style dispensing layout. This independent training tool is not an official Fred product.",
  },
  {
    icon: Zap,
    title: "Instant, detailed feedback",
    description:
      "Eight checks are scored on submission, with mandatory safety gates for the patient, medicine, directions, quantity, repeats and final decision.",
  },
  {
    icon: FileText,
    title: "Foundation case library",
    description:
      "Six training scenarios cover patient entry, product selection, labels, warnings and clinically unsafe prescriptions. Live PBS details still require a current reference.",
  },
  {
    icon: CircleAlert,
    title: "Critical-error feedback",
    description:
      "Unsafe choices cannot be rescued by easier points. Feedback identifies the failed safety gate and explains the expected disposition.",
  },
  {
    icon: ShieldCheck,
    title: "Clinical decision practice",
    description:
      "Choose whether to dispense, hold and contact the prescriber, or not supply. Problem cases no longer reveal their answer in the case title.",
  },
  {
    icon: Laptop,
    title: "Designed for laptops",
    description:
      "The simulator is intentionally optimised for laptop and desktop study. No download or local installation is required.",
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
