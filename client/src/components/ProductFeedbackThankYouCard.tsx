import { Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export type FeedbackThankYouProduct = "guide" | "course" | "bundle_tubav" | "bundle_new_year";

export function transactionIdFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return (params.get("transactionId") || params.get("trxId") || "").trim();
}

export default function ProductFeedbackThankYouCard({ expectedProduct }: { expectedProduct: FeedbackThankYouProduct }) {
  const transactionId = useMemo(() => transactionIdFromSearch(window.location.search), []);
  const [pollAttempts, setPollAttempts] = useState(0);
  const feedbackLink = trpc.testimonial.public.productThankYouLink.useQuery(
    { transactionId, expectedProduct },
    { enabled: transactionId.length >= 6, retry: false, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (transactionId.length < 6 || feedbackLink.data?.feedbackUrl || feedbackLink.isFetching || pollAttempts >= 8) return;
    const timer = window.setTimeout(() => {
      setPollAttempts((attempts) => attempts + 1);
      void feedbackLink.refetch();
    }, 1_500);
    return () => window.clearTimeout(timer);
  }, [feedbackLink.data?.feedbackUrl, feedbackLink.isFetching, feedbackLink.refetch, pollAttempts, transactionId]);

  if (!feedbackLink.data?.feedbackUrl) return null;

  return (
    <section className="rounded-3xl border border-[#efcad7] bg-[#fff1f5] p-6 text-center text-[#6f3f52] shadow-sm" aria-label="שיתוף חוויה">
      <Heart className="mx-auto h-7 w-7" aria-hidden="true" />
      <h2 className="mt-3 text-xl font-black">נשמח לשמוע את דעתך</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-[#795e69]">
        כמה מילים אמיתיות על החוויה יכולות לעזור לעוד אנשים שמחפשים אהבה להכיר את הדרך, להרחיב את הקהילה וליצור עוד הזדמנויות להיכרות עבור כולם.
      </p>
      <a
        href={feedbackLink.data.feedbackUrl}
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#9f4968] px-7 py-3 text-sm font-black text-white shadow-sm transition-transform duration-150 active:scale-[0.97]"
      >
        לשיתוף החוויה ולקבלת המתנה
      </a>
      <p className="mt-3 text-xs leading-6 text-[#866c76]">הקישור אישי. המתנה ניתנת על עצם מילוי המשוב, גם ללא אישור לפרסום.</p>
    </section>
  );
}
