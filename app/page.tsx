import Link from "next/link";

const impactStats = [
  { label: "Average match time", value: "7 min" },
  { label: "Partner pharmacies", value: "240+" },
  { label: "Cities covered", value: "38" },
  { label: "Patient satisfaction", value: "97%" },
];

const workflowSteps = [
  {
    title: "Upload your prescription",
    description:
      "Share a clear photo and basic details. We verify format and route it securely.",
  },
  {
    title: "Nearby pharmacies get notified",
    description:
      "Subscribed pharmacies in your area can review and respond in real time.",
  },
  {
    title: "Confirm and collect",
    description:
      "Compare response speed and availability, then choose where to fulfill.",
  },
];

const highlightCards = [
  {
    title: "Faster fulfillment",
    description:
      "Reduce wait times with location-aware matching and instant notification flow.",
  },
  {
    title: "Built for trust",
    description:
      "Role-based access, session protection, and audit-ready prescription history.",
  },
  {
    title: "Pharmacy growth",
    description:
      "Help local pharmacies discover nearby demand and manage requests efficiently.",
  },
];

const faqItems = [
  {
    question: "Who can use E-Pharmacy?",
    answer:
      "Patients can upload prescriptions and browse nearby options. Pharmacies can subscribe to receive matching requests.",
  },
  {
    question: "Does it replace my doctor or pharmacy?",
    answer:
      "No. E-Pharmacy is a coordination platform between patients and licensed pharmacies.",
  },
  {
    question: "How quickly do pharmacies respond?",
    answer:
      "Response time depends on your area, but most active requests receive initial visibility within minutes.",
  },
  {
    question: "Can I track past requests?",
    answer:
      "Yes. Patients can view history and status updates, while pharmacists can manage live demand from the dashboard.",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(45,212,191,0.28),transparent_34%),radial-gradient(circle_at_80%_22%,rgba(251,146,60,0.2),transparent_30%),radial-gradient(circle_at_52%_84%,rgba(56,189,248,0.18),transparent_30%)]" />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8">
        <section className="grid items-center gap-10 pb-16 pt-8 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Modern Prescription Coordination
            </p>
            <h1 className="text-balance text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Healthcare access should feel as responsive as messaging.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              E-Pharmacy connects patients and pharmacies with a workflow that is
              fast, local, and easier to manage from first upload to fulfillment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/upload"
                className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-200"
              >
                Upload Prescription
              </Link>
              <Link
                href="/pharmacies"
                className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-slate-900"
              >
                Browse Pharmacies
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-6 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-8">
            <p className="mb-6 text-sm font-medium uppercase tracking-[0.15em] text-slate-300">
              Why teams choose us
            </p>
            <div className="space-y-5">
              <article className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
                <h2 className="text-lg font-semibold text-cyan-100">
                  Local-first matching
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Pharmacy notifications prioritize nearby demand, improving response
                  time and convenience for patients.
                </p>
              </article>
              <article className="rounded-2xl border border-orange-300/20 bg-orange-300/10 p-5">
                <h2 className="text-lg font-semibold text-orange-100">
                  Better operations for pharmacists
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Subscription-based access and dashboard tools keep incoming work
                  organized without switching platforms.
                </p>
              </article>
              <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                <h2 className="text-lg font-semibold text-emerald-100">
                  Clear patient journey
                </h2>
                <p className="mt-2 text-sm text-slate-200">
                  Upload, match, confirm, and track in one place with no complicated
                  onboarding.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="mb-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {impactStats.map((stat) => (
            <div
              key={stat.label}
              className="glass-panel rounded-2xl border border-white/10 p-5 text-center"
            >
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                {stat.label}
              </p>
            </div>
          ))}
        </section>

        <section className="mb-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              How it works
            </h2>
            <Link
              href="/register"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Create an account
            </Link>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="glass-panel rounded-2xl border border-white/10 p-6"
              >
                <p className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-cyan-100">
                  {index + 1}
                </p>
                <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-slate-300">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-16 grid gap-5 lg:grid-cols-3">
          {highlightCards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl border border-slate-700 bg-slate-900/80 p-6"
            >
              <h3 className="text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-slate-300">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="mb-16 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-white">Safety and privacy</h2>
              <p className="mt-4 text-slate-300">
                Sensitive data stays in controlled flows with role-specific access.
                We designed the experience so patients share only what is required
                while pharmacies see only the cases relevant to them.
              </p>
              <ul className="mt-5 space-y-3 text-sm text-slate-200">
                <li>Secure authentication sessions</li>
                <li>Prescription history for patient visibility</li>
                <li>Structured pharmacy subscription model</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                For pharmacy owners
              </p>
              <h3 className="mt-2 text-2xl font-bold text-white">
                Turn demand into measurable growth
              </h3>
              <p className="mt-3 text-slate-100">
                Subscription gives your team access to local prescription demand,
                helping you allocate staff and inventory with better confidence.
              </p>
              <Link
                href="/subscribe"
                className="mt-6 inline-block rounded-full bg-emerald-300 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-200"
              >
                View subscription options
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-white">What people say</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            <blockquote className="glass-panel rounded-2xl border border-white/10 p-6">
              <p className="text-slate-100">
                &quot;I uploaded at night and had nearby responses fast the next morning.
                Way easier than calling multiple places.&quot;
              </p>
              <footer className="mt-4 text-sm text-slate-300">A patient in Dallas</footer>
            </blockquote>
            <blockquote className="glass-panel rounded-2xl border border-white/10 p-6">
              <p className="text-slate-100">
                &quot;The dashboard gives my staff a clearer queue. We now respond to
                demand we used to miss.&quot;
              </p>
              <footer className="mt-4 text-sm text-slate-300">
                Independent pharmacy manager
              </footer>
            </blockquote>
            <blockquote className="glass-panel rounded-2xl border border-white/10 p-6">
              <p className="text-slate-100">
                &quot;The process feels transparent. I can track status without guessing
                what happened after upload.&quot;
              </p>
              <footer className="mt-4 text-sm text-slate-300">Repeat patient user</footer>
            </blockquote>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="mb-8 text-3xl font-bold text-white">Frequently asked questions</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {faqItems.map((item) => (
              <article
                key={item.question}
                className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5"
              >
                <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-2 text-slate-300">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-200/30 bg-gradient-to-r from-cyan-300/20 to-sky-300/10 p-7 text-center sm:p-10">
          <h2 className="text-3xl font-bold text-white">
            Start your first prescription request today
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-100">
            Whether you are a patient looking for faster service or a pharmacy
            looking for qualified local demand, E-Pharmacy is ready.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/upload"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200"
            >
              Upload now
            </Link>
            <Link
              href="/subscribe"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Become a pharmacy partner
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
