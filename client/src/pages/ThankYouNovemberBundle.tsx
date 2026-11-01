import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenCheck, CheckCircle2, CircleAlert, Clock3, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { readPurchaseTrackingToken } from "@/lib/purchaseTracking";
import { NOVEMBER_BUNDLE_PRODUCT } from "@shared/novemberBundleOffer";

const SUPPORT_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, הגעתי מעמוד הטבת נובמבר ואשמח לעזרה");

type ReceiptStatus = "checking" | "pending" | "confirmed" | "unavailable";

export default function ThankYouNovemberBundle() {
  const [trackingToken] = useState(() => readPurchaseTrackingToken());
  const [receiptStatus, setReceiptStatus] = useState<ReceiptStatus>(() => trackingToken ? "checking" : "unavailable");
  const confirmPurchase = trpc.payment.confirmPurchaseTracking.useMutation();

  useEffect(() => {
    document.title = "בדיקת תשלום | הטבת נובמבר | הילית כספי";
  }, []);

  useEffect(() => {
    if (!trackingToken) return;

    let stopped = false;
    let timer: number | undefined;
    let attempts = 0;

    const checkReceipt = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const result = await confirmPurchase.mutateAsync({ trackingToken, expectedProduct: NOVEMBER_BUNDLE_PRODUCT });
        if (stopped) return;
        if (result.status === "confirmed" || result.status === "already_tracked") {
          setReceiptStatus("confirmed");
          return;
        }
        if (result.status === "invalid") {
          setReceiptStatus("unavailable");
          return;
        }
        setReceiptStatus("pending");
      } catch {
        setReceiptStatus("pending");
      }

      if (attempts < 90) timer = window.setTimeout(checkReceipt, 2_000);
    };

    void checkReceipt();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [trackingToken]);

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
              {isConfirmed ? "התשלום אומת, ברוכים הבאים." : isPending ? "מאמתים את התשלום שלך." : "לא נמצא אישור תשלום בעמוד הזה."}
            </h1>
            <p className={`mx-auto mt-4 max-w-lg text-sm leading-7 ${isConfirmed ? "text-white/70" : "text-[#514451]"}`}>
              {isConfirmed
                ? "הגישה לקורס והשלב הבא להשלמת פרופיל המאגר יישלחו לכתובת המייל שנמסרה בקופה."
                : isPending
                  ? "המעבר לעמוד הזה אינו אישור תשלום. העמוד בודק את הקבלה מול המערכת ויתעדכן אוטומטית כשהאישור יתקבל."
                  : "כדי להציג קבלה אישית צריך להגיע לכאן בסיום תהליך תשלום שבו נשמר אישור בדפדפן. אם שילמת, אפשר להמתין למייל או לפנות לשירות."}
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

            {isConfirmed ? (
              <>
                <div className="rounded-2xl border border-[#d2c3cd] bg-[#f7f1f4] p-5 text-center">
                  <Mail className="mx-auto h-7 w-7 text-[#4d3c49]" />
                  <h2 className="mt-3 text-xl font-black">בדקו את תיבת המייל</h2>
                  <p className="mt-2 text-sm leading-7 text-[#5d505a]">פרטי גישה אישיים לקורס ״המסע לזוגיות״ והשלב הבא להשלמת פרופיל המאגר יישלחו למייל אחרי אישור הרכישה.</p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex gap-4 rounded-2xl border border-[#171519]/10 p-5"><BookOpenCheck className="mt-1 h-6 w-6 shrink-0 text-[#765d70]" /><div><h2 className="font-black">הקורס המלא במתנה</h2><p className="mt-1 text-sm leading-6 text-[#5d505a]">חמישה מודולים, חוברת עבודה ומפה זוגית אישית. הקישור הוא אישי ונשלח למייל.</p></div></div>
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
