import { CheckCircle2, Clock3 } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
    <main className="min-h-screen bg-[#f0eadc] px-5 py-16 font-rubik text-[#191265]" dir="rtl">
      <section className="mx-auto max-w-xl rounded-[30px] bg-white p-8 text-center shadow-xl">
        {sent ? <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" /> : <Clock3 className="mx-auto h-16 w-16 text-[#9b7c18]" />}
        <h1 className="mt-5 text-3xl font-black">{sent ? "ה־Boost נשלח" : credited ? "התשלום נשמר כקרדיט Boost" : "התשלום התקבל"}</h1>
        <p className="mt-3 text-sm leading-7 text-[#666]">
          {sent
            ? "הצעת Boost אלגוריתמית ואנונימית נשלחה לשני הצדדים. זהות תיחשף רק לאחר אישור הדדי."
            : credited
              ? "המועמד או המועמדת כבר לא היו זמינים בזמן האישור הסופי. הקרדיט ממתין באזור האישי וניתן למימוש חוזר ללא חיוב נוסף."
              : "אנחנו מאמתים כעת את העסקה ואת זמינות שני הצדדים. הסטטוס יתעדכן באזור האישי בתוך זמן קצר."}
        </p>
        <a href={profileUrl} className="mt-6 block rounded-2xl bg-[#191265] py-4 font-black text-white">חזרה להתאמות באזור האישי</a>
      </section>
    </main>
  );
}
