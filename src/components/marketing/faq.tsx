const faqs = [
  {
    q: "Is DispenseRx Practice affiliated with Fred IT Group?",
    a: "No. DispenseRx Practice is an independent training prototype. It is not affiliated with, endorsed by, or connected to Fred IT Group Pty Ltd. 'Fred Dispense' is a trademark of Fred IT Group Pty Ltd.",
  },
  {
    q: "How realistic is the simulator?",
    a: "The simulator uses a Fred-style visual layout and covers patient selection, medicine selection, directions, quantity, repeats, warning labels and a final clinical decision. Many production Fred features are not yet simulated, so it should be used for foundation practice rather than treated as an exact replica.",
  },
  {
    q: "What cases are included?",
    a: "The current beta contains six foundation cases covering antibiotics, warfarin, a paediatric liquid, temazepam, metformin and doxycycline. Authority, streamlined-authority and genuine Schedule 8 workflows are not yet included.",
  },
  {
    q: "Is this a clinical or PBS reference?",
    a: "No. It is a training simulation. Students must use current product information, PBS listings, legislation, university guidance and supervisor feedback for real clinical decisions.",
  },
  {
    q: "Who is DispenseRx Practice for?",
    a: "It is designed for Australian pharmacy students in Years 3–5 who are preparing for clinical placements, dispensing OSCEs, or simply want more practice time outside of university hours. It is also useful for internationally trained pharmacists revalidating in Australia.",
  },
  {
    q: "Do I need to download anything?",
    a: "No. DispenseRx Practice runs in a browser. The simulator is intentionally designed for laptop and desktop screens rather than phone use.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-slate-50 py-20">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-slate-200">
          {faqs.map(({ q, a }) => (
            <div key={q} className="py-6">
              <h3 className="mb-2 font-semibold text-slate-900">{q}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
