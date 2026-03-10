import Link from "next/link";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload" },
  { href: "/pharmacies", label: "Pharmacies" },
  { href: "/subscribe", label: "Plans" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-slate-950/95">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <h3 className="text-lg font-semibold text-white">E-Pharmacy</h3>
          <p className="mt-2 max-w-sm text-sm text-slate-300">
            Connecting patients and pharmacies for faster prescription fulfillment.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
            Quick Links
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">
            Contact
          </h4>
          <p className="mt-3 text-sm text-slate-300">
            support@epharmacy.com
          </p>
          <p className="mt-1 text-sm text-slate-300">Mon to Sat, 9:00 AM - 7:00 PM</p>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
        Copyright {year} E-Pharmacy. All rights reserved.
      </div>
    </footer>
  );
}
