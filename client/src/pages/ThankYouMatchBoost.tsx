import { CheckCircle2, Clock3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AnonymousBoostSilhouette from "@/components/AnonymousBoostSilhouette";

export default function ThankYouMatchBoost() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const token = params.get("token") || "";
  const profileUrl = email && token
    ? `/my-profile?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&tab=matches`
    : "/my-profile";
  const statusQuery = trpc.matchBoost.getMyStatus.useQuery(
    { email, token },
    { enabled: Boolean(email && token), retry: 4, retryDelay: attempt => Math.min(1500 * (attempt + 1), 6000), refetchInterval: 2500 },
  );
  const openStatus = statusQuery.data?.openRequest?.status || statusQuery.data?.latestRequest?.status;
  const credited = statusQuery.data?.creditAvailable;
  const sent = openStatus === "approved";

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#f0eadc] px-4 py-12 font-rubik text-[#191265] sm:px-5 sm:py-16" dir="rtl">
      <section className="mx-auto w-full min-w-0 max-w-xl overflow-hidden rounded-[30px] bg-white p-6 text-center shadow-xl sm:p-8">
        {sent ? <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /> : <Clock3 className="mx-auto h-16 w-16 text-[#9b7c18]" />}
        {!credited && <AnonymousBoostSilhouette className="mx-auto mt-5 h-36 w-28" />}
        <h1 className="mt-5 text-3xl font-black">{sent ? "שלחת Boost" : credited ? "התשלום נשמר כקרדיט Boost" : "התשלום התקבל"}</h1>
        <p className="mt-3 break-words text-sm leading-7 text-[#666]">
          {sent
            ? "התאמת ה־Boost נשלחה לשני הצדדים. התשלום אינו אישור להתאמה. מייל עם התמונה, פרטי הפרופיל וכפתורי האישור מחכה לכל אחד מהצדדים. פרטי הקשר יישלחו רק לאחר שני אישורים."
            : credited
              ? "המועמד או המועמדת כבר לא היו זמינים בזמן האישור הסופי. הקרדיט ממתין באזור האישי וניתן למימוש חוזר ללא חיוב נוסף."
              : "אנחנו מאמתים כעת את העסקה ואת זמינות שני הצדדים. הסטטוס יתעדכן באזור האישי בתוך זמן קצר."}
        </p>
        <a href={profileUrl} className="mt-6 block w-full break-words rounded-2xl bg-[#191265] px-4 py-4 font-black text-white">חזרה להתאמות באזור האישי</a>
      </section>
    </main>
  );
}
