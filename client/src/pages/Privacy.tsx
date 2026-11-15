import { Link } from "wouter";
import { PRIVACY_CONTACT, PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@shared/israeliPrivacyPolicy";

export default function Privacy() {
  return <div dir="rtl" className="min-h-screen bg-[#f0eadc] font-rubik text-[#191265]">
    <nav className="bg-[#191265] px-6 py-5 text-white" aria-label="ניווט מדיניות פרטיות"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4"><Link href="/" className="text-xl font-bold">הילית כספי</Link><div className="flex gap-5 text-sm"><Link href="/database">מאגר ההיכרויות</Link><Link href="/terms/database">תקנון המאגר</Link></div></div></nav>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <header><p className="mb-3 text-sm text-[#605b6a]">האתר הישראלי</p><h1 className="text-3xl font-bold sm:text-4xl">מדיניות פרטיות</h1><p className="mt-3 text-sm text-[#605b6a]">עודכן: {PRIVACY_UPDATED}</p><p className="mt-5 max-w-3xl leading-8">איך משמש המידע שמסרתם באתר, מה עשוי להופיע בהצעת התאמה ואיך אפשר לפנות בנוגע למידע שלכם.</p></header>
      <aside className="mt-7 rounded-2xl bg-[#191265] p-6 text-white" aria-label="קשר בנוגע לפרטיות"><h2 className="text-lg font-bold">פנייה בנוגע למידע שלכם</h2><p className="mt-3 text-sm leading-7">{PRIVACY_CONTACT.name}. {PRIVACY_CONTACT.address}.</p><div className="mt-3 flex flex-wrap gap-x-6 gap-y-3"><a href={`mailto:${PRIVACY_CONTACT.email}`} className="underline underline-offset-4" dir="ltr">{PRIVACY_CONTACT.email}</a><a href={`tel:${PRIVACY_CONTACT.phone}`} className="underline underline-offset-4" dir="ltr">{PRIVACY_CONTACT.phone}</a></div></aside>
      <nav aria-label="תוכן מדיניות הפרטיות" className="my-8 flex flex-wrap gap-3">{PRIVACY_SECTIONS.map(section => <a key={section.id} href={`#${section.id}`} className="rounded-full border border-[#191265]/20 px-4 py-2 text-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#191265]">{section.title}</a>)}</nav>
      <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-9">{PRIVACY_SECTIONS.map(section => <section id={section.id} key={section.id} className="scroll-mt-24 border-b border-[#191265]/10 py-7 first:pt-0 last:border-0 last:pb-0"><h2 className="mb-4 text-xl font-bold">{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="mt-3 leading-8 text-[#514d5c]">{paragraph}</p>)}</section>)}</div>
      <section className="mt-8" aria-label="תקנוני השירות"><h2 className="mb-4 text-lg font-bold">לצד המדיניות, תקנון השירות שבחרתם</h2><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm"><Link href="/terms/database" className="underline">תקנון המאגר</Link><Link href="/terms/single-session" className="underline">תקנון פגישה אישית</Link><Link href="/terms/november-love" className="underline">תקנון חבילת נובמבר</Link></div></section>
    </main>
  </div>;
}
