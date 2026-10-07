import { useState } from "react";
import { Copy, Send, TicketCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { readPurchaseTrackingToken } from "@/lib/purchaseTracking";

type Props = { email?: string; token?: string; receiptOnly?: boolean; showPending?: boolean };

/** A voucher is rendered only from server-issued entitlement, never from a URL coupon. */
export default function LiveVoucherCard({ email, token, receiptOnly = false, showPending = false }: Props) {
  const [trackingToken] = useState(() => readPurchaseTrackingToken());
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState("");
  const [copied, setCopied] = useState(false);
  const member = trpc.liveOctober.eligibility.useQuery(
    { email: email || "", token: token || "" },
    { enabled: !receiptOnly && Boolean(email && token), retry: false },
  );
  const salesStatus = trpc.liveOctober.salesStatus.useQuery();
  const receipt = trpc.liveOctober.getReceipt.useQuery(
    { trackingToken: trackingToken || "" },
    { enabled: receiptOnly && Boolean(trackingToken), retry: false, refetchInterval: (query) => !query.state.data && showPending ? 5000 : false },
  );
  const ticket = receiptOnly ? receipt.data : member.data?.ticket;
  const testTicket = ticket?.code.startsWith("TEST-") === true;
  const sendQuestion = trpc.liveOctober.askQuestion.useMutation({
    onSuccess: () => { setQuestion(""); setFeedback("השאלה נשמרה. תודה ששיתפת אותנו."); },
    onError: (error) => setFeedback(error.message || "לא ניתן לשמור את השאלה כרגע."),
  });
  const ask = () => {
    setFeedback("");
    sendQuestion.mutate({
      question,
      ...(!receiptOnly && email && token ? { email, token } : { trackingToken: trackingToken || undefined }),
    });
  };
  if (!ticket) {
    if (!receiptOnly && member.data?.eligible && !member.data.plus) {
      const href = `/live?${new URLSearchParams({ email: email || "", token: token || "", coupon: "FRIENDS" }).toString()}#tickets`;
      return <div className="rounded-2xl border border-[#e6d69c] bg-[#fff9e8] p-5 text-right" dir="rtl"><p className="font-black text-[#191265]">הטבה לחברי המאגר</p><p className="mt-1 text-sm text-[#625d78]">עדיין אין לך כרטיס ללייב? מחיר חברי המאגר המתוכנן הוא 49 ₪ אחרי אימות אישי.</p>{salesStatus.data?.open && <a href={href} className="mt-3 inline-block rounded-xl bg-[#191265] px-5 py-2.5 text-sm font-bold text-white">למימוש FRIENDS</a>}{!salesStatus.data?.open && <p className="mt-2 text-xs text-[#625d78]">ההרשמה להטבה תיפתח לאחר הכנת האירוע.</p>}</div>;
    }
    if (showPending && trackingToken) return <div className="rounded-2xl border border-[#e8daba] bg-white p-5 text-sm text-[#625d78]" dir="rtl">מאמתים את התשלום ואת הכרטיס האישי שלך. העמוד יתעדכן אוטומטית בעוד רגע.</div>;
    return null;
  }
  return (
    <section dir="rtl" className="overflow-hidden rounded-[1.5rem] border border-[#dbc67d] bg-[linear-gradient(145deg,#fffaf1,#f2e9ca)] text-right shadow-[0_18px_45px_rgba(25,18,101,.1)]">
      <div className="flex items-center gap-3 bg-[#191265] px-6 py-5 text-white"><TicketCheck className="h-6 w-6 text-[#ffe27c]" /><div><p className="text-xs font-bold tracking-widest text-[#ffe27c]">כרטיס אישי ללייב · הטבת {ticket.source === "plus" ? "Plus" : ticket.source === "database_live" ? "LIVE" : ticket.source === "friends" ? "FRIENDS" : "ההרשמה"}</p><h2 className="mt-1 text-lg font-black">סודות ההתאמה המושלמת</h2></div></div>
      <div className="space-y-4 p-6">
        {testTicket ? <p className="rounded-xl border border-[#d5bd78] bg-white p-4 text-sm font-bold leading-6 text-[#191265]">זהו שובר בדיקה לעסקת TEST1 ב־1 ₪. הוא אינו כרטיס כניסה לאירוע ואינו נספר במניין הנרשמים. בדקו שהעסקה והשובר הופיעו, והשתמשו בכתובת מייל אחרת לרכישה אמיתית.</p>
          : <div className="space-y-3"><p className="text-sm leading-6 text-[#625d78]">שבת, 31.10.2026 בשעה 20:30 · כרטיס כניסה אחד. קישור הכניסה האישי יישלח למייל לאחר השלמת רישום הכרטיס ב־Zoom.</p>{ticket.joinUrl && <a href={ticket.joinUrl} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full bg-[#191265] px-6 py-3 text-sm font-black text-white">לכניסה אישית ללייב ב־Zoom</a>}</div>}
        <div className="rounded-xl border border-[#d5bd78] bg-white p-4"><p className="text-xs font-bold text-[#6d627b]">קוד השובר שלך</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><code dir="ltr" className="font-mono text-xl font-black tracking-wide text-[#191265]">{ticket.code}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(ticket.code); setCopied(true); } catch { setCopied(false); } }} className="flex items-center gap-2 rounded-xl bg-[#191265] px-4 py-2 text-xs font-black text-white"><Copy className="h-4 w-4" />{copied ? "הועתק" : "העתקת קוד"}</button></div></div>
        <p className="text-xs leading-5 text-[#6d627b]">זהו מספר השובר האישי באתר, לא קוד כניסה ל־Zoom. אין להעבירו לאחרים.</p>
        {!testTicket && <div className="border-t border-[#d5bd78] pt-4"><label htmlFor="live-question" className="block text-sm font-black text-[#191265]">איזו שאלה מסקרנת אותך לקראת הלייב?</label><p className="mt-1 text-xs text-[#625d78]">אפשר להציע עד שלוש שאלות. נשתדל להתייחס לנושאים שעולים, בלי התחייבות למענה אישי על כל שאלה.</p><textarea id="live-question" value={question} onChange={e => setQuestion(e.target.value)} rows={3} maxLength={1500} placeholder="השאלה שלך להילית" className="mt-3 w-full resize-y rounded-xl border border-[#d5bd78] bg-white p-3 text-sm text-[#191265] outline-none focus:ring-2 focus:ring-[#ffe27c]" /><button type="button" onClick={ask} disabled={sendQuestion.isPending || question.trim().length < 8} className="mt-2 flex items-center gap-2 rounded-xl bg-[#191265] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><Send className="h-4 w-4" />שליחת שאלה</button>{feedback && <p role="status" className="mt-2 text-sm text-[#191265]">{feedback}</p>}</div>}
      </div>
    </section>
  );
}
