import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CircleCheck, MessageCircle, Send, TicketCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function LiveQuestion() {
  const [questionToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("q") || "");
  const [question, setQuestion] = useState("");
  const [feedback, setFeedback] = useState("");
  const utils = trpc.useUtils();
  const access = trpc.liveOctober.questionAccess.useQuery(
    { questionToken }, { enabled: Boolean(questionToken), retry: false },
  );
  const send = trpc.liveOctober.askQuestion.useMutation({
    onSuccess: async () => {
      setQuestion("");
      setFeedback("השאלה נשמרה. תודה ששיתפת אותי, נתראה בלייב!");
      await utils.liveOctober.questionAccess.invalidate({ questionToken });
    },
    onError: (error) => setFeedback(error.message || "לא הצלחתי לשמור את השאלה כרגע. נסו שוב בעוד רגע."),
  });
  const missing = !questionToken || access.isError || (access.isSuccess && !access.data);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f3eddf] font-rubik text-[#191265]">
      <header className="bg-[#191265] px-5 py-5 text-center text-white">
        <Link href="/live" className="font-black tracking-wide">הילית כספי <span className="text-[#ffe27c]">· LIVE</span></Link>
      </header>
      <section className="relative overflow-hidden bg-[#191265] px-5 pb-24 pt-12 text-center text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_15%_40%,rgba(255,226,124,.23),transparent_40%)]" />
        <div className="relative mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ffe27c]/60 px-4 py-2 text-xs font-bold text-[#ffe27c]"><TicketCheck size={16} /> סודות ההתאמה המושלמת</span>
          <h1 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">מה מסקרן אותך לקראת הלייב?</h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-white/85 sm:text-base">כאן אפשר לשאול אותי על ההתאמות, על הפרופיל שעובד עבורך, או על כל מה שמעניין אותך מאחורי הקלעים. אשמח לקרוא את השאלה לפני שניפגש.</p>
        </div>
      </section>
      <section className="relative mx-auto -mt-12 max-w-xl px-5 pb-16">
        <div className="rounded-[1.5rem] border border-[#dfca85] bg-[#fffaf1] p-6 shadow-[0_18px_45px_rgba(25,18,101,.12)] sm:p-9">
          {access.isLoading && questionToken ? <p role="status" className="py-9 text-center text-sm text-[#625d78]">מאמתים את הכרטיס שלך...</p>
            : missing ? <div className="py-6 text-center">
              <MessageCircle className="mx-auto mb-4 h-9 w-9 text-[#a18338]" />
              <h2 className="text-xl font-black">הקישור לשאלות אינו זמין</h2>
              <p className="mt-3 text-sm leading-7 text-[#625d78]">אפשר לפתוח שוב את הקישור המקורי מהמייל של הכרטיס. אם עדיין לא עובד, כדאי לפנות אלינו ונעזור.</p>
              <Link href="/live" className="mt-6 inline-flex items-center gap-2 font-bold underline underline-offset-4">לפרטי הלייב <ArrowLeft size={17} /></Link>
            </div> : <>
              <div className="mb-6 flex items-center gap-3 border-b border-[#dfca85] pb-5">
                <div className="rounded-xl bg-[#191265] p-2.5 text-[#ffe27c]"><CircleCheck size={23} /></div>
                <div><h2 className="text-lg font-black">הכרטיס שלך אומת</h2><p className="text-xs text-[#625d78]">אין צורך להיכנס לאזור האישי או למלא פרטים שוב.</p></div>
              </div>
              {access.data!.remaining > 0 ? <form onSubmit={e => { e.preventDefault(); setFeedback(""); send.mutate({ questionToken, question }); }}>
                <label htmlFor="live-question-direct" className="block font-black">השאלה שלך להילית</label>
                <p className="mt-1 text-xs leading-6 text-[#625d78]">אפשר לשלוח עד שלוש שאלות לכרטיס. נשארו לך {access.data!.remaining}. נשתדל לענות על נושאים שעולים, אך לא נוכל להתחייב למענה אישי לכל שאלה.</p>
                <textarea id="live-question-direct" value={question} onChange={e => setQuestion(e.target.value)} rows={5} maxLength={1500} placeholder="מה הכי מסקרן אותך לדעת?" className="mt-4 w-full resize-y rounded-xl border border-[#d5bd78] bg-white p-4 text-sm text-[#191265] outline-none placeholder:text-[#817c95] focus:ring-2 focus:ring-[#d5bd78]" />
                <button type="submit" disabled={send.isPending || question.trim().length < 8} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#191265] px-6 py-3 text-sm font-black text-white transition-transform active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50"><Send size={17} />{send.isPending ? "שולחים..." : "שליחת שאלה"}</button>
              </form> : <p className="text-sm leading-7 text-[#625d78]">כל שלוש השאלות נשמרו. תודה על הסקרנות, נתראה בלייב!</p>}
              {feedback && <p role="status" className="mt-5 rounded-xl bg-[#f1e6c6] p-4 text-sm font-bold leading-6">{feedback}</p>}
            </>}
        </div>
        <p className="mt-5 text-center text-xs leading-6 text-[#625d78]">הקישור האישי לשאלות נכלל במייל הכרטיס שלך. בבקשה לא להעביר אותו לאחרים.</p>
      </section>
    </main>
  );
}
