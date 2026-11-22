import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenCheck, CheckCircle2, CircleAlert, Clock3, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { readPurchaseTrackingToken } from "@/lib/purchaseTracking";
import { NOVEMBER_BUNDLE_PRODUCT } from "@shared/novemberBundleOffer";
import { NOVEMBER_CAMPAIGN_COPY } from "@shared/novemberCampaignCopy";

const SUPPORT_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, הגעתי מעמוד הטבת נובמבר ואשמח לעזרה");

type ReceiptStatus = "checking" | "pending" | "confirmed" | "unavailable" | "needs_help";

export default function ThankYouNovemberBundle() {
  const [trackingToken] = useState(() => readPurchaseTrackingToken());
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(() => trackingToken ? "checking" : "unavailable");
  const [checkCycle, setCheckCycle] = useState(0);
  const checking = useRef(false);
  // This token-only receipt endpoint never creates a checkout or sends mail.
  // checkoutStatus additionally requires a process token, which return pages do not have.
  const confirmPurchase = trpc.payment.confirmPurchaseTracking.useMutation();

  useEffect(() => {
    document.title = "בדיקת תשלום | הטבת נובמבר | הילית כספי";
  }, []);

  useEffect(() => {
    if (!trackingToken) return;

    let stopped = false;
    let timer: number | undefined;
    let requestTimer: number | undefined;
    let cancelRequest: (() => void) | undefined;
    let attempts = 0;
    // A manual check is deliberately shorter than the initial webhook wait.
    const maxAttempts = checkCycle === 0 ? 90 : 5;
    checking.current = true;

    const checkReceipt = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const result = await Promise.race([
          confirmPurchase.mutateAsync({ trackingToken, expectedProduct: NOVEMBER_BUNDLE_PRODUCT }),
          new Promise<never>((_resolve, reject) => {
            cancelRequest = () => reject(new Error("Receipt check stopped"));
            requestTimer = window.setTimeout(() => reject(new Error("Receipt check timed out")), 10_000);
          }),
        ]);
        if (stopped) return;
        if (result.status === "confirmed" || result.status === "already_tracked") {
          checking.current = false;
          setReceiptStatus("confirmed");
          return;
        }
        if (result.status === "invalid") {
          checking.current = false;
          setReceiptStatus("unavailable");
          return;
        }
        setReceiptStatus("pending");
      } catch {
        if (stopped) return;
        setReceiptStatus("pending");
      } finally {
        if (requestTimer !== undefined) window.clearTimeout(requestTimer);
        requestTimer = undefined;
        cancelRequest = undefined;
      }

      if (attempts < maxAttempts) timer = window.setTimeout(checkReceipt, 2_000);
      else {
        checking.current = false;
        setReceiptStatus("needs_help");
      }
    };

    void checkReceipt();
    return () => {
      stopped = true;
      checking.current = false;
      if (timer !== undefined) window.clearTimeout(timer);
      if (requestTimer !== undefined) window.clearTimeout(requestTimer);
      cancelRequest?.();
    };
  }, [trackingToken, checkCycle]);

  const checkAgain = () => {
    if (!trackingToken || checking.current || receiptStatus !== "needs_help") return;
    checking.current = true; // block an immediate second click before rendering
    setReceiptStatus("checking");
    setCheckCycle(cycle => cycle + 1);
  };

  const isConfirmed = receiptStatus === "confirmed";
  const isPending = receiptStatus === "checking" || receiptStatus === "pending";

  return (
    <main dir="rtl" className="min-h-screen bg-[#f4eef1] px-5 py-10 font-['Rubik',sans-serif] text-[#171519] md:px-8 md:py-16">
      <style>{`@media (prefers-reduced-motion: reduce) { .november-thank-motion { opacity: 1 !important; transform: none !important; } }`}</style>
      <div className="mx-auto max-w-2xl">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="november-thank-motion overflow-hidden rounded-[2rem] border border-[#171519]/10 bg-[#fffdf9] shadow-[0_26px_70px_rgba(72,54,67,.13)]">
          <header className={`px-7 py-11 text-center md:px-10 md:py-13 ${isConfirmed ? "bg-[#171519] text-[#fffdf9]" : "bg-[#d2c3cd] text-[#171519]"}`}>
            {isConfirmed ? <CheckCircle2 className="mx-auto h-12 w-12 text-[#d2c3cd]" /> : isPending ? <Clock3 className="mx-auto h-12 w-12 text-[#4d3c49]" /> : <CircleAlert className="mx-auto h-12 w-12 text-[#4d3c49]" />}
            <p className={`mt-5 text-sm font-black ${isConfirmed ? "text-[#e4d7de]" : "text-[#5e4b5a]"}`}>הטבת נובמבר לזוגיות</p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-.04em] md:text-4xl">
              {isConfirmed ? "התשלום אומת, ברוכים הבאים." : isPending ? "מאמתים את התשלום שלך." : receiptStatus === "needs_help" ? "בדיקת התשלום הסתיימה ללא אישור." : "לא נמצא אישור תשלום בעמוד הזה."}
            </h1>
            <p className={`mx-auto mt-4 max-w-lg text-sm leading-7 ${isConfirmed ? "text-white/70" : "text-[#514451]"}`}>
              {isConfirmed
                ? "המערכת אישרה את התשלום. מידע על הגישה לקורס והשלמת פרופיל המאגר מיועד לכתובת המייל שנמסרה בקופה; סטטוס שליחת המייל אינו מוצג כאן."
                : isPending
                  ? "המעבר לעמוד הזה אינו אישור תשלום. מתבצעת בדיקה מוגבלת בזמן מול המערכת; אם יתקבל אישור בזמן הבדיקה, העמוד יתעדכן. אין לשלם שוב לפני בירור."
                  : receiptStatus === "needs_help"
                    ? "הבדיקה האוטומטית נעצרה. זה אינו אומר שהתשלום נכשל. אין לשלם שוב לפני בירור; אפשר לבדוק שוב את אותו אישור או לפנות לשירות."
                    : "כדי להציג קבלה אישית צריך להגיע לכאן בסיום תהליך תשלום שבו נשמר אישור בדפדפן. אין לשלם שוב לפני בירור. אם ניסית לשלם, אפשר לבדוק במייל או לפנות לשירות."}
            </p>
          </header>

          <div className="p-6 md:p-9">
            {isPending ? (
              <div className="rounded-2xl border border-[#c6b5c0] bg-[#f7f1f4] p-5 text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#654f61]" />
                <h2 className="mt-3 text-lg font-black">ממתינים לאישור מאובטח</h2>
                <p className="mt-2 text-sm leading-7 text-[#5d505a]">אין צורך לשלם שוב. לעיתים נדרשות כמה דקות עד שאישור התשלום נקלט ומופק הקישור האישי.</p>
              </div>
            ) : null}

            {receiptStatus === "needs_help" ? (
              <div role="status" className="rounded-2xl border border-[#c6b5c0] bg-[#f7f1f4] p-5 text-center">
                <CircleAlert className="mx-auto h-6 w-6 text-[#654f61]" />
                <h2 className="mt-3 text-lg font-black">צריך לבדוק את התשלום</h2>
                <p className="mt-2 text-sm leading-7 text-[#5d505a]">הבדיקה החוזרת בודקת רק את אותו אישור תשלום, עד חמש פעמים. היא אינה פותחת רכישה או חיוב חדש.</p>
                <button type="button" onClick={checkAgain} className="mt-4 rounded-full bg-[#171519] px-6 py-3 text-sm font-black text-[#fffdf9]">בדיקת סטטוס שוב — ללא חיוב</button>
              </div>
            ) : null}

            {isConfirmed ? (
              <>
                <div className="rounded-2xl border border-[#d2c3cd] bg-[#f7f1f4] p-5 text-center">
                  <Mail className="mx-auto h-7 w-7 text-[#4d3c49]" />
                  <h2 className="mt-3 text-xl font-black">בדקו את תיבת המייל</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5d505a]">חפשו פרטי גישה אישיים לקורס ״המסע לזוגיות״ ואת השלב הבא להשלמת פרופיל המאגר. אם לא מצאתם אותם, אפשר לפנות לשירות. העמוד אינו מאמת שהמייל נשלח.</p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex gap-4 rounded-2xl border border-[#171519]/10 p-5"><BookOpenCheck className="mt-1 h-6 w-6 shrink-0 text-[#765d70]" /><div><h2 className="font-black">{NOVEMBER_CAMPAIGN_COPY.course} במתנה</h2><p className="mt-1 text-sm leading-6 text-[#5d505a]">חמישה מודולים, חוברת עבודה ומפה זוגית אישית. קישור הגישה הוא אישי ומיועד למייל שנמסר בקופה.</p></div></div>
                  <div className="flex gap-4 rounded-2xl border border-[#171519]/10 p-5"><ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-[#765d70]" /><div><h2 className="font-black">השלמת פרופיל המאגר</h2><p className="mt-1 text-sm leading-6 text-[#5d505a]">השלימו פרופיל, תמונה, שאלונים והעדפות. רק לאחר אישור התשלום והשלמת כל הפרטים מתחיל חלון של עד 3 ימים קלנדריים להצעת התאמה ראשונה.</p></div></div>
                </div>

                <p className="mt-6 rounded-2xl border border-[#171519]/10 bg-[#fffdf9] p-4 text-center text-xs leading-6 text-[#6a5c67]">אין התחייבות לדייט, לזוגיות, לאישור של אדם אחר או לתדירות קבועה של הצעות. פרטי קשר נמסרים רק אחרי אישור של שני הצדדים.</p>
              </>
            ) : null}

            <div className="mt-7 text-center">
              <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[#171519] px-7 py-3.5 text-sm font-black text-[#fffdf9] transition hover:bg-[#342d32]">עזרה בשירות הלקוחות</a>
              <p className="mt-4 text-xs leading-6 text-[#756873]">לא מצאתם את המייל? בדקו גם בספאם ובקידומי מכירות.</p>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
