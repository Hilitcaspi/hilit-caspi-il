import { Link, useLocation } from "wouter";
import { PUBLIC_ROUTE_META } from "@shared/siteSeoMetadata";

export default function PrivacyFooter() {
  const [location] = useLocation();
  const path = location.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (!PUBLIC_ROUTE_META[path] && !path.startsWith("/terms/") && !path.startsWith("/blog/")) return null;
  return <footer dir="rtl" className="border-t border-[#191265]/10 bg-[#f0eadc] px-6 py-5 text-[#191265]"><nav aria-label="מידע משפטי ופרטיות" className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-7 gap-y-3 text-sm"><Link href="/privacy" className="underline underline-offset-4 hover:text-[#94265b]">מדיניות פרטיות</Link><Link href="/terms/database" className="underline underline-offset-4 hover:text-[#94265b]">תקנון המאגר</Link><Link href="/" className="underline underline-offset-4 hover:text-[#94265b]">דף הבית</Link></nav></footer>;
}
