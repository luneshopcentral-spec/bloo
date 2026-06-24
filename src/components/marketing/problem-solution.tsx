import { MapPin, AlertCircle, GraduationCap, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const problems = [
  {
    icon: MapPin,
    title: "Limited to campus",
    description:
      "Practice dispensing software is only available on-site, making it impossible to study on your own schedule.",
    colour: "text-red-500",
    bg: "bg-red-50",
  },
  {
    icon: AlertCircle,
    title: "No prep for placement",
    description:
      "Clinical placements move fast. Without hands-on practice beforehand, students feel lost in the dispensing workflow on day one.",
    colour: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: GraduationCap,
    title: "Exam pressure",
    description:
      "Dispensing OSCE stations are high-stakes. Cramming theory is no substitute for repeated practice with realistic scenarios.",
    colour: "text-orange-500",
    bg: "bg-orange-50",
  },
];

export function ProblemSolution() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            The problem every pharmacy student faces
          </h2>
          <p className="mt-4 text-slate-600">
            And why practising from home changes everything.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map(({ icon: Icon, title, description, colour, bg }) => (
            <Card
              key={title}
              className="border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-6">
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}
                >
                  <Icon className={`h-6 w-6 ${colour}`} />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">{title}</h3>
                <p className="text-sm text-slate-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Solution callout */}
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <h3 className="mb-3 text-xl font-bold text-slate-900">
            DispenseRx Practice brings the dispensing bay to you
          </h3>
          <p className="text-slate-700">
            A browser-based simulator modelled on the Fred Dispense interface,
            packed with real PBS scenarios, instant feedback, and progress
            tracking — so you can practise anywhere, anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
