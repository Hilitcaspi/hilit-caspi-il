import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, EyeOff, Heart, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function MatchBoostLanding() {
  const [email, setEmail] = useState("");
  const [requestAccepted, setRequestAccepted] = useState(false);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const previous = document.title;
    document.title = "Match Boost | הילית כספי";
    return () => { document.title = previous; };
  }, []);

  const interest = trpc.matchBoostPilot.submitInterest.useMutation();
  const submit = () => {
    if (!requestAccepted || !email.includes("@")) return;
    interest.mutate({
      email: email.trim(),
      requestLink: true,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      utmContent: params.get("utm_content") || undefined,
    });
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#f8f4ff] text-[#20113e]">
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#fd73bd_0,transparent_28%),radial-gradient(circle_at_82%_12%,#ffcc68_0,transparent_24%),linear-gradient(145deg,#180b43_0%,#5d176d_48%,#a52178_100%)] px-4 pb-16 pt-7 text-white sm:pb-24 sm:pt-10">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          {["10%", "24%", "42%", "69%", "84%"].map((left, index) => (
            <Heart key={left} className="absolute text-pink-200/80 motion-safe:animate-pulse" style={{ left, top: `${12 + index * 13}%`, width: 16 + index * 4, animationDelay: `${index * 0.35}s` }} fill="currentColor" />
          ))}
        </div>
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between">
          <a href="/" className="text-sm font-black text-white">הילית כספי</a>
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">פתוח לחברי המאגר</span>
        </nav>

        <div className="relative z-10 mx-auto mt-12 grid max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#4b235f] shadow-lg">
              <Sparkles className="h-4 w-4" /> אישור אישי לחברי המאגר
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              לפני התמונה,
              <span className="block bg-gradient-to-l from-[#ffe27c] via-white to-[#ffb6dc] bg-clip-text text-transparent">מכירים את האדם.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-white/90 sm:text-xl">
              Match Boost מאפשר לפתוח הזדמנות עם התאמה אנונימית שהאלגוריתם זיהה, על בסיס החיים, הערכים וההתאמה ביניכם, ורק אחר כך להגיע לתמונה.
            </p>
            <div className="mt-7 grid gap-3 text-sm sm:grid-cols-3">
              {[
                [EyeOff, "בלי שם ותמונה", "לפני הסכמה הדדית"],
                [ShieldCheck, "רק בהסכמה", "שני הצדדים מצטרפים מראש"],
                [Zap, "הצעה בעדיפות", "לא הבטחה להסכמה"],
              ].map(([Icon, title, text]: any) => (
                <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-[#ffe27c]" />
                  <strong className="mt-3 block">{title}</strong>
                  <span className="mt-1 block text-xs text-white/70">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/30 bg-white p-5 text-[#20113e] shadow-2xl shadow-fuchsia-950/30 sm:p-7">
            <div className="rounded-2xl bg-gradient-to-br from-[#fff3fa] to-[#fff8d7] p-5">
              <p className="text-xs font-black text-[#a52178]">דוגמה לכרטיס אנונימי</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">התאמה מהמרכז</h2>
                  <p className="mt-1 text-xs text-[#6f627a]">תחום מקצועי, תואר ראשון, כוונת קשר רצינית</p>
                </div>
                <span className="rounded-full bg-[#251064] px-3 py-2 text-sm font-black text-white">82%</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {["גיל ואזור כללי", "השכלה ועיסוק", "מצב משפחתי", "עישון וזיקה דתית"].map(item => <div key={item} className="rounded-xl bg-white px-3 py-2 font-bold shadow-sm">{item}</div>)}
              </div>
              <p className="mt-4 rounded-xl bg-[#eee8ff] p-3 text-xs font-bold leading-5 text-[#51448c]">הצעת Boost אלגוריתמית. לא נבדקה ידנית על ידי הילית.</p>
            </div>

            {interest.isSuccess ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
                <CheckCircle2 className="mx-auto h-9 w-9" />
                <h3 className="mt-3 text-lg font-black">ההתעניינות נשמרה</h3>
                <p className="mt-2 text-sm leading-6">{interest.data.message}</p>
              </div>
            ) : (
              <div className="mt-5">
                <h3 className="text-xl font-black">קבלת קישור אישי לאישור</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f627a]">מזינים את המייל שאיתו הצטרפתם למאגר. אם הפרופיל פעיל, יישלח קישור אישי שבו אפשר לקרוא ולאשר את תנאי Match Boost.</p>
                <div className="mt-4 space-y-3">
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="האימייל של המאגר" className="w-full rounded-xl border border-[#ddd4eb] bg-white px-4 py-3 text-sm outline-none focus:border-[#a52178]" />
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f3ff] p-3 text-xs leading-5 text-[#5d526b]">
                  <input type="checkbox" checked={requestAccepted} onChange={event => setRequestAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#a52178]" />
                  <span>אפשר לשלוח לכתובת הזו קישור אישי לאישור Match Boost. קבלת הקישור אינה מצרפת למסלול ואינה הסכמה לקבלת הצעות.</span>
                </label>
                <button type="button" onClick={submit} disabled={!requestAccepted || !email.includes("@") || interest.isPending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#a52178] to-[#5d176d] px-5 py-4 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45">
                  {interest.isPending ? "שולחים קישור..." : "שלחו לי קישור אישי לאישור"}<ArrowLeft className="h-4 w-4" />
                </button>
                {interest.isError && <p className="mt-3 text-center text-xs font-bold text-red-600">לא הצלחנו לשמור כרגע. אפשר לנסות שוב בעוד רגע.</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a52178]">איך מצטרפים</p>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">מייל, קישור אישי, הסכמה.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["01", "מזינים את המייל", "משתמשים באותה כתובת שאיתה הצטרפתם למאגר."],
            ["02", "מקבלים קישור אישי", "הקישור פותח את אזור ההתאמות האישי ומציג את תנאי השירות."],
            ["03", "מצטרפים בהסכמה", "רק אחרי שלוש הסכמות מפורשות הפרופיל מסומן ויכול להופיע בכרטיסי Boost."],
          ].map(([number, title, text]) => (
            <article key={number} className="rounded-3xl border border-[#e8dff2] bg-white p-6 shadow-sm">
              <span className="text-3xl font-black text-[#d52b8c]">{number}</span>
              <h3 className="mt-4 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f627a]">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-[#241257] p-6 text-white sm:p-10">
          <h2 className="text-2xl font-black sm:text-4xl">מה חשוב לדעת לפני שמצטרפים</h2>
          <div className="mt-6 grid gap-3 text-sm leading-6 sm:grid-cols-2">
            {["הכרטיס אינו כולל שם, תמונה, עיר מדויקת או מקום עבודה.", "המערכת בודקת ששני הצדדים פעילים, פנויים והסכימו למסלול.", "הצעת Boost אינה המלצה אישית או אישור ידני של הילית.", "הזהות נחשפת רק אם שני הצדדים מאשרים את ההצעה.", "אפשר לצאת מהמסלול בכל עת דרך האזור האישי.", "הפיילוט אינו מבטיח מספר הצעות, הסכמה הדדית או זוגיות."].map(item => (
              <p key={item} className="flex gap-2 rounded-xl bg-white/8 p-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ffe27c]" />{item}</p>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5ddeb] bg-white px-4 py-8 text-center text-xs text-[#766d80]">
        <p className="font-black text-[#251064]">Match Boost מבית הילית כספי</p>
        <p className="mt-2">השירות מיועד לחברי המאגר הפעילים ובהצטרפות יזומה בלבד.</p>
      </footer>
    </main>
  );
}
