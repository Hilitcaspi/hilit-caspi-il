import { Link } from "wouter";
import { editorialNextStep } from "@shared/editorialPaths";
import { isNovemberBundleOfferActive } from "@shared/novemberBundleOffer";

export default function EditorialNextStep({ slug }: { slug: string }) {
  const step = editorialNextStep(slug);
  const destinations = [
    { href: "/database", label: "למאגר ההיכרויות" },
    { href: "/dna-quiz", label: "לשאלון DNA החינמי" },
    { href: "/single-session", label: "לפגישה אישית" },
  ].filter(item => item.href !== step.primaryHref);
  const novemberActive = isNovemberBundleOfferActive();
  return (
    <section aria-label="המשך מהכתבה" className="mt-10 rounded-3xl bg-[#191265] p-6 text-right text-white sm:p-8">
      <h2 className="text-2xl font-bold leading-snug">{step.title}</h2>
      <p className="mt-3 leading-8 text-white/85">{step.text}</p>
      <Link href={step.primaryHref} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffe27c] px-6 py-3 font-bold text-[#191265] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{step.primaryLabel}</Link>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        {destinations.map(item => <Link key={item.href} href={item.href} className="text-white underline underline-offset-4 hover:text-[#ffe27c]">{item.label}</Link>)}
      </div>
      {novemberActive && step.primaryHref !== "/november-love" && <p className="mt-6 border-t border-white/20 pt-5 text-sm leading-7 text-[#ecd7ff]">בנובמבר אפשר להצטרף למאגר עם הקורס המלא שלי במתנה. <Link href="/november-love" className="font-bold underline underline-offset-4">לפרטי הטבת נובמבר</Link>. עד סוף 30.11.2026.</p>}
    </section>
  );
}
