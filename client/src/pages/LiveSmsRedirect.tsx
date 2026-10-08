import { useEffect } from "react";
import { liveSmsAliasTarget } from "@shared/liveCampaignLinks";

export default function LiveSmsRedirect() {
  const target = liveSmsAliasTarget(window.location.pathname) || "/live";
  useEffect(() => { window.location.replace(target); }, [target]);
  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#191265] px-6 text-center font-rubik text-white"><div><p className="text-xl font-black text-[#ffe27c]">הילית כספי · LIVE</p><p className="mt-3">פותחים את פרטי הלייב וההטבה...</p><a href={target} className="mt-5 inline-block underline">אם העמוד לא נפתח, אפשר ללחוץ כאן</a></div></main>;
}
