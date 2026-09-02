import { motion } from "framer-motion";
import { useEffect } from "react";
import { BookOpenCheck, CheckCircle2, Mail, Network } from "lucide-react";
import { gaPurchase } from "@/lib/ga";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import ProductFeedbackThankYouCard from "@/components/ProductFeedbackThankYouCard";

const SUPPORT_URL = "https://wa.me/972552442334?text=" + encodeURIComponent("היי הילית, רכשתי את חבילת השנה החדשה ואשמח לעזרה");

export default function ThankYouNewYearBundle() {
  useEffect(() => {
    const dedupeKey = "purchase_fired_bundle_new_year";
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
    const params = new URLSearchParams(window.location.search);
    const txId = params.get("transactionId") || params.get("trxId") || `client-bundle-new-year-${Date.now()}`;
    const eventID = `grow-${txId}`;
    trackPurchase({ value: 399, currency: "ILS", content_name: "חבילת שנה חדשה: מאגר + מדריך + קורס", eventID });
    gaPurchase("bundle_new_year", txId);
    track({ eventType: "purchase", page: "/thank-you/new-year-love", metadata: { product: "bundle_new_year", value: 399 } });
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-[#fbf7ef] px-5 py-14 font-['Rubik',sans-serif] text-[#191265]">
      <div className="mx-auto max-w-2xl">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] bg-white shadow-[0_26px_70px_rgba(25,18,101,0.12)]">
          <div className="bg-[#191265] px-7 py-12 text-center text-white">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#f5d978]" />
            <h1 className="mt-5 text-3xl font-black md:text-4xl">התשלום עבר בהצלחה</h1>
            <p className="mt-3 text-white/70">חבילת שנה חדשה: מאגר, מדריך וקורס</p>
          </div>

          <div className="p-7 md:p-10">
            <div className="rounded-2xl bg-[#efe6d2] p-5 text-center">
              <Mail className="mx-auto h-7 w-7" />
              <h2 className="mt-3 text-xl font-black">בדקו את תיבת המייל</h2>
              <p className="mt-2 text-sm leading-7 text-[#5d576c]">יישלחו שני מיילים לכתובת שאיתה שילמתם. אחד להשלמת פרופיל המאגר, ואחד עם קישור לקורס ולמדריך.</p>
            </div>

            <div className="mt-7 space-y-4">
              <div className="flex gap-4 rounded-2xl border border-[#191265]/10 p-5"><Network className="mt-1 h-6 w-6 shrink-0 text-[#c96b87]" /><div><h3 className="font-black">הצטרפות למאגר</h3><p className="mt-1 text-sm leading-6 text-[#5d576c]">השלימו את הפרטים והשאלונים בקישור האישי כדי שהפרופיל יוכל להיכנס לתהליך ההתאמה.</p></div></div>
              <div className="flex gap-4 rounded-2xl border border-[#191265]/10 p-5"><BookOpenCheck className="mt-1 h-6 w-6 shrink-0 text-[#c96b87]" /><div><h3 className="font-black">המסע ולבחור נכון</h3><p className="mt-1 text-sm leading-6 text-[#5d576c]">המייל הדיגיטלי כולל קישור אישי לקורס וקישור למדריך. אפשר להתחיל מיד לאחר קבלת המייל.</p></div></div>
            </div>

            <div className="mt-7"><ProductFeedbackThankYouCard expectedProduct="bundle_new_year" /></div>

            <p className="mt-7 rounded-2xl border border-[#d4ae3f]/35 bg-[#fff9e8] p-5 text-center text-sm leading-7">לא מצאתם את המייל? בדקו בספאם ובקידומי מכירות. עיבוד התשלום והפקת הקישורים עשויים להימשך כמה דקות.</p>

            <div className="mt-8 text-center"><a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-[#191265] px-7 py-3.5 text-sm font-black text-white">עזרה בשירות הלקוחות</a></div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
