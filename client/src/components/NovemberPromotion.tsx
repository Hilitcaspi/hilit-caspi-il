import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { X, ArrowLeft, Check } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/track";
import { NOVEMBER_CAMPAIGN_COPY } from "@shared/novemberCampaignCopy";
import { canShowNovemberPopup, isNovemberPromoPage, NOVEMBER10_PRODUCTS, PROMO_BAR_KEY, PROMO_DELAY_MS, PROMO_SEEN_KEY, PROMO_SESSION_KEY } from "@/lib/novemberPromoPolicy";

/** Onsite promotions only: no lead creation, consent changes, messaging or payment calls. */
export default function NovemberPromotion() {
  const [path] = useLocation();
  const eligible = isNovemberPromoPage(path);
  const [barClosed, setBarClosed] = useState(() => {
    try { return sessionStorage.getItem(PROMO_BAR_KEY) === "1"; } catch { return false; }
  });
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const mountedSeen = useRef(false);
  const barViewSeen = useRef(false);
  const visible = eligible && !barClosed;
  const log = (action: string, product?: string) => track({
    eventType: action.endsWith("view") ? "section_view" : "button_click",
    page: path,
    metadata: { component: "november_promotion", action, ...(product ? { product } : {}) },
  });

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("hc-november-bar-active");
    const resize = () => document.body.style.setProperty("--hc-promo-height", `${barRef.current?.offsetHeight || 0}px`);
    resize();
    const observer = new ResizeObserver(resize);
    if (barRef.current) observer.observe(barRef.current);
    if (!barViewSeen.current) { barViewSeen.current = true; log("bar_view"); }
    return () => {
      observer.disconnect();
      document.body.classList.remove("hc-november-bar-active");
      document.body.style.removeProperty("--hc-promo-height");
    };
  }, [visible, path]);

  useEffect(() => {
    setOpen(false);
    setCopied(false);
    if (mountedSeen.current) return;
    // Optional browser storage blocked? Skip the automatic popup entirely.
    try {
      if (!canShowNovemberPopup(path, localStorage.getItem(PROMO_SEEN_KEY), sessionStorage.getItem(PROMO_SESSION_KEY))) return;
    } catch { return; }
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"], [data-slot="dialog-content"], iframe[src*="grow"], iframe[src*="meshulam"]')) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.matches("input, textarea, select, [contenteditable=true]") || active.closest("form"))) return;
      try {
        if (!canShowNovemberPopup(path, localStorage.getItem(PROMO_SEEN_KEY), sessionStorage.getItem(PROMO_SESSION_KEY))) return;
        localStorage.setItem(PROMO_SEEN_KEY, String(Date.now()));
        sessionStorage.setItem(PROMO_SESSION_KEY, "1");
      } catch { return; }
      mountedSeen.current = true;
      setOpen(true);
      log("popup_view");
    }, PROMO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [path]);

  const closeBar = () => {
    try { sessionStorage.setItem(PROMO_BAR_KEY, "1"); } catch { /* Optional preference. */ }
    setBarClosed(true);
    log("bar_dismiss");
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText("november10"); setCopied(true); log("coupon_copy"); }
    catch { setCopied(false); /* Code remains visible and manually selectable. */ }
  };
  if (!eligible) return null;
  return <>
    {visible && <>
      <div aria-hidden="true" style={{ height: "var(--hc-promo-height, 64px)" }} />
      <div ref={barRef} data-testid="november-bar" dir="rtl" className="fixed inset-x-0 top-0 z-[51] bg-[#d9c6ed] text-[#271d32]">
        <div className="relative mx-auto flex max-w-6xl items-center justify-center gap-3 px-12 py-3 sm:gap-6">
          <a href="/november-love" onClick={() => log("bar_click")} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs leading-5 sm:text-sm focus-visible:outline-2 focus-visible:outline-offset-4">
            <span>{NOVEMBER_CAMPAIGN_COPY.sloganIntro}, {NOVEMBER_CAMPAIGN_COPY.sloganLead} <strong className="font-black">{NOVEMBER_CAMPAIGN_COPY.sloganEmphasis}</strong></span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap font-bold underline underline-offset-4">להטבת נובמבר <ArrowLeft className="h-4 w-4" /></span>
          </a>
          <button type="button" onClick={closeBar} aria-label="סגירת סרגל נובמבר" className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-3 hover:bg-white/30"><X className="h-4 w-4" /></button>
        </div>
      </div>
    </>}
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) log("popup_dismiss"); }}>
      <DialogContent dir="rtl" showCloseButton={false} className="max-h-[85dvh] overflow-y-auto rounded-3xl border-0 bg-[#faf7fc] p-7 text-center text-[#271d32] sm:max-w-md sm:p-10">
        <DialogClose aria-label="סגירת ההטבה" className="absolute left-3 top-3 rounded-full p-3 hover:bg-[#e9dcf3]"><X className="h-5 w-5" /></DialogClose>
        <p className="text-xs font-bold tracking-wide text-[#765b8b]">עוד דרך לעשות צעד באהבה</p>
        <div aria-hidden="true" className="mx-auto py-2 text-7xl font-black leading-none tracking-tight text-[#8a63aa]">10%</div>
        <DialogTitle className="text-2xl font-black leading-tight">הטבה קטנה לצעד הבא שלך</DialogTitle>
        <DialogDescription className="text-sm leading-6 text-[#66566e]">10% הנחה על המאגר, הקורס המלא שלי, המדריך והפגישות האישיות עם הקוד</DialogDescription>
        <button type="button" onClick={() => void copy()} className="flex items-center justify-center gap-3 rounded-xl border border-dashed border-[#ac87c5] bg-[#e9dcf3] px-4 py-3 font-black">
          <span dir="ltr" className="select-all text-xl tracking-[0.08em]">november10</span>
          <span className="text-xs font-medium">{copied ? <span className="inline-flex items-center gap-1"><Check className="h-4 w-4" />הקוד הועתק</span> : "העתקת הקוד"}</span>
        </button>
        <p aria-live="polite" className="sr-only">{copied ? "הקוד הועתק" : ""}</p>
        <div className="grid grid-cols-2 gap-2">
          {NOVEMBER10_PRODUCTS.map(product => <a key={product.id} href={product.href} onClick={() => log("offer_click", product.id)} className="rounded-xl bg-[#271d32] px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-[#765b8b] last:col-span-2">{product.label}</a>)}
        </div>
        <p className="text-xs leading-5 text-[#76667e]">לא כולל חבילת נובמבר, מנוי Plus ובוסט. ללא כפל קופונים.</p>
        <DialogClose className="text-sm text-[#76667e] underline underline-offset-4">אולי בהמשך</DialogClose>
      </DialogContent>
    </Dialog>
  </>;
}
