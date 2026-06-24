const faqs = [
  {
    q: "Is DispenseRx Practice affiliated with Fred IT Group?",
    a: "No. DispenseRx Practice is a completely independent study tool created by pharmacy educators and students. It is not affiliated with, endorsed by, or connected to Fred IT Group Pty Ltd in any way. 'Fred Dispense' is a trademark of Fred IT Group Pty Ltd.",
  },
  {
    q: "How realistic is the simulator?",
    a: "The interface and workflows are modelled closely on the Fred Dispense dispensing process — including PBS item selection, quantity, repeats, patient details, and endorsements. It is designed to build real muscle memory, not just theoretical knowledge. The more you practise here, the faster you will be in an actual dispensary.",
  },
  {
    q: "What cases are included?",
    a: "The library covers common and high-stakes PBS items: anti-diabetics, statins, antihypertensives, antibiotics, analgesics, anticoagulants, and more. It includes Schedule 4 and Schedule 8 scenarios, authority scripts, and streamlined authority cases. Cases are graded easy → medium → hard. New cases are added regularly at no extra cost.",
  },
  {
    q: "What is your refund policy?",
    a: "We offer a 30-day money-back guarantee. If you are unhappy with the product for any reason, contact us within 30 days of purchase and we will issue a full refund — no questions asked.",
  },
  {
    q: "Who is DispenseRx Practice for?",
    a: "It is designed for Australian pharmacy students in Years 3–5 who are preparing for clinical placements, dispensing OSCEs, or simply want more practice time outside of university hours. It is also useful for internationally trained pharmacists revalidating in Australia.",
  },
  {
    q: "Do I need to download anything?",
    a: "No. DispenseRx Practice runs entirely in your browser on any device — laptop, tablet, or phone. Just sign up and start practising immediately.",
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
