import { useEffect, useMemo, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { track } from "@/lib/track";
import { purchaseFromThankYouPath, selectSmartUpsell, type PurchaseFlags } from "@/lib/smartUpsellPolicy";

const PURCHASE_KEYS: Array<keyof PurchaseFlags> = ["database", "guide", "course", "session", "coaching"];

function readPurchases(): PurchaseFlags {
  return PURCHASE_KEYS.reduce<PurchaseFlags>((result, product) => {
    result[product] = localStorage.getItem(`hilit_purchase_${product}`) === "1";
    return result;
  }, {});
}

function trackedHref(href: string, offerId: string) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}utm_source=site_upsell&utm_medium=onsite&utm_campaign=${encodeURIComponent(offerId)}`;
}

export default function ContextualUpsell() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [purchases, setPurchases] = useState<PurchaseFlags>(() => readPurchases());

  useEffect(() => {
    const purchased = purchaseFromThankYouPath(location);
    if (purchased) {
      localStorage.setItem(`hilit_purchase_${purchased}`, "1");
      setPurchases(readPurchases());
    }
  }, [location]);

  const offer = useMemo(() => selectSmartUpsell(location, purchases), [location, purchases]);

  useEffect(() => {
    setVisible(false);
    if (!offer) return;
    const dismissedAt = Number(localStorage.getItem(`hilit_upsell_dismissed_${offer.id}`) || 0);
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    const timer = window.setTimeout(() => {
      setVisible(true);
      track({ eventType: "section_view", page: location, metadata: { component: "contextual_upsell", action: "view", offerId: offer.id } });
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [location, offer?.id]);

  if (!offer || !visible) return null;

  const close = () => {
    localStorage.setItem(`hilit_upsell_dismissed_${offer.id}`, String(Date.now()));
    setVisible(false);
    track({ eventType: "button_click", page: location, metadata: { component: "contextual_upsell", action: "dismiss", offerId: offer.id } });
  };

  return (
    <aside dir="rtl" className="fixed bottom-3 left-3 right-3 z-[80] mx-auto max-w-3xl rounded-2xl border border-[#d9c76c] bg-white p-4 shadow-2xl md:bottom-5 md:p-5">
      <button type="button" onClick={close} aria-label="סגירת ההצעה" className="absolute left-3 top-3 rounded-full p-1 text-[#777] hover:bg-[#f2efe5]"><X className="h-4 w-4" /></button>
      <div className="grid gap-4 pl-7 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#191265] text-[#ffe27c] md:flex"><Sparkles className="h-6 w-6" /></div>
        <div>
          <p className="text-[11px] font-bold text-[#8b7420]">{offer.eyebrow}</p>
          <h3 className="mt-0.5 text-lg font-black text-[#191265]">{offer.title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#666]">{offer.text}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:max-w-52">
          <a href={trackedHref(offer.primaryHref, offer.id)} onClick={() => track({ eventType: "product_click", page: location, metadata: { component: "contextual_upsell", action: "primary_click", offerId: offer.id, destination: offer.primaryHref } })} className="flex-1 rounded-xl bg-[#191265] px-4 py-2.5 text-center text-xs font-black text-white md:flex-none">{offer.primaryLabel}</a>
          {offer.secondaryHref && <a href={trackedHref(offer.secondaryHref, `${offer.id}_secondary`)} onClick={() => track({ eventType: "product_click", page: location, metadata: { component: "contextual_upsell", action: "secondary_click", offerId: `${offer.id}_secondary`, destination: offer.secondaryHref || "" } })} className="flex-1 rounded-xl border border-[#d9d3c5] px-4 py-2.5 text-center text-xs font-bold text-[#191265] md:flex-none">{offer.secondaryLabel}</a>}
        </div>
      </div>
    </aside>
  );
}
