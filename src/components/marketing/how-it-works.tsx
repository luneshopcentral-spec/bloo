import { UserPlus, ClipboardList, BarChart3 } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign up free",
    description:
      "Create your account in 30 seconds — no credit card required. Get immediate access to 3 full practice cases.",
  },
  {
    icon: ClipboardList,
    step: "02",
    title: "Practise cases",
    description:
      "Work through dispensing scenarios just like you would in a real Fred Dispense session. Enter drug names, quantities, PBS codes, and counselling points.",
  },
  {
    icon: BarChart3,
    step: "03",
    title: "Track your progress",
    description:
      "Review your score for each case, see where you went wrong, and watch your accuracy improve over time as your placement approaches.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-slate-50 py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Up and running in minutes
          </h2>
          <p className="mt-4 text-slate-600">
            No setup, no software to install. Just open your browser and start
            practising.
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* connector line — desktop only */}
          <div className="absolute top-10 left-[calc(50%/3+2rem)] right-[calc(50%/3+2rem)] hidden h-px bg-emerald-200 lg:block" />

          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map(({ icon: Icon, step, title, description }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-emerald-600 shadow-lg">
                  <Icon className="h-8 w-8 text-white" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {step}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {title}
                </h3>
                <p className="text-sm text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
