import { useEffect } from "react";
import { DATABASE_NOW_CAMPAIGN, DATABASE_NOW_COUPON } from "@shared/databaseHolidayNow";

export default function DatabaseNowRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedSource = params.get("s");
    const source = requestedSource === "sms" || requestedSource === "whatsapp" || requestedSource === "story" ? requestedSource : "email";
    const target = new URL("/database", window.location.origin);
    target.searchParams.set("utm_source", source);
    target.searchParams.set("utm_medium", source === "whatsapp" ? "group" : source === "story" ? "social" : "holiday_launch");
    target.searchParams.set("utm_campaign", DATABASE_NOW_CAMPAIGN);
    target.searchParams.set("utm_content", source === "whatsapp" ? "database_now_whatsapp_group" : source === "story" ? "database_now_story" : `database_now_${source}`);
    target.searchParams.set("coupon", DATABASE_NOW_COUPON);
    window.location.replace(target.toString());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#18132e] px-6 text-center text-white" dir="rtl">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-[#e8cf95]" />
        <p className="mt-5 text-lg font-bold">הטבת החג נטענת...</p>
      </div>
    </main>
  );
}
