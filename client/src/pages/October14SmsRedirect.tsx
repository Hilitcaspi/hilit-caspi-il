import { useEffect } from "react";
import { october14SmsAliasTarget } from "@shared/october14CampaignLinks";
export default function October14SmsRedirect() {
  const target = october14SmsAliasTarget();
  useEffect(() => { window.location.replace(target); }, [target]);
  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f2d8e1] px-6 text-center font-rubik text-[#301c2c]"><div><p className="text-xl font-black">הילית כספי</p><p className="mt-3">פותחים את ההצטרפות למאגר והטבת הלייב…</p><a href={target} className="mt-5 inline-block font-bold underline">אם העמוד לא נפתח, אפשר ללחוץ כאן</a></div></main>;
}
