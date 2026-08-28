import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Heart, Mail, Sparkles, UserRoundCheck, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";

const HILIT_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

export default function MatchBoostLanding() {
  const [email, setEmail] = useState("");
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [personalConsent, setPersonalConsent] = useState(false);
  const [personalJoined, setPersonalJoined] = useState(false);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const personalEmail = params.get("email")?.trim() || "";
  const personalToken = params.get("token")?.trim() || "";
  const isPersonalLink = personalEmail.includes("@") && personalToken.length >= 16;

  useEffect(() => {
    const previous = document.title;
    document.title = "Boost | הילית כספי";
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    if (!isPersonalLink) return;
    const dashboardUrl = `/my-profile?email=${encodeURIComponent(personalEmail)}&token=${encodeURIComponent(personalToken)}&tab=matches&focus=boost`;
    window.location.replace(dashboardUrl);
  }, [isPersonalLink, personalEmail, personalToken]);

  const interest = trpc.matchBoostPilot.submitInterest.useMutation();
  const utils = trpc.useUtils();
  const personalStatus = trpc.matchBoost.getMyStatus.useQuery(
    { email: personalEmail, token: personalToken },
    { enabled: isPersonalLink, retry: false },
  );
  const joinPool = trpc.matchBoost.joinPool.useMutation({
    onSuccess: async () => {
      setPersonalJoined(true);
      await utils.matchBoost.getMyStatus.invalidate({ email: personalEmail, token: personalToken });
    },
  });
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

  if (isPersonalLink) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#241257] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#ffe27c] border-t-transparent" />
          <p className="mt-4 font-black">מעבירים אותך ל־Boost באזור האישי...</p>
        </div>
      </main>
    );
  }

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
          <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">חדש לחברי המאגר</span>
        </nav>

        <div className="relative z-10 mx-auto mt-12 grid max-w-6xl items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <img src={HILIT_PHOTO} alt="הילית כספי" className="h-20 w-20 rounded-full border-4 border-white/35 object-cover shadow-xl sm:h-24 sm:w-24" />
              <div>
                <p className="font-black">הילית כספי</p>
                <p className="text-sm text-white/70">מאמנת למציאת זוגיות ומנהלת המאגר</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#ffe27c] px-4 py-2 text-xs font-black text-[#4b235f] shadow-lg">
              <Sparkles className="h-4 w-4" /> אתם ביקשתם, ואני מקשיבה
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              ביקשתם יותר התאמות.
              <span className="block bg-gradient-to-l from-[#ffe27c] via-white to-[#ffb6dc] bg-clip-text text-transparent">עכשיו הבחירה גם בידיים שלכם.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-bold leading-8 text-white/90 sm:text-xl">
              שירות <span className="inline-block font-black text-[#ffe27c] motion-safe:animate-pulse">Boost</span> מאפשר לכם לראות באזור האישי התאמות פוטנציאליות ולבחור בעצמכם למי לשלוח בקשת התאמה.
            </p>
            <p className="mt-3 max-w-2xl text-base font-bold leading-7 text-white/80">השירות מיועד למי שכבר רשומים ופעילים במאגר.</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [Zap, "יותר אפשרויות", "בנוסף להתאמות השוטפות שאני שולחת"],
                [UserRoundCheck, "בחירה שלכם", "אפשר לבחור גם התאמות מתחת ל־80%"],
                [Heart, "לשלוח ולקבל", "מי שמאשרים את שירות הבוסט יהיו רשאים לשלוח ולקבל בקשות Boost"],
              ].map(([Icon, title, text]: any) => (
                <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-[#ffe27c]" />
                  <strong className="mt-3 block text-lg">{title}</strong>
                  <span className="mt-1 block text-sm leading-6 text-white/80">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/30 bg-white p-5 text-[#20113e] shadow-2xl shadow-fuchsia-950/30 sm:p-7">
            <div className="rounded-2xl bg-gradient-to-br from-[#fff3fa] to-[#fff8d7] p-5">
              <p className="text-xs font-black text-[#a52178]">אחרי האישור</p>
              <h2 className="mt-2 text-2xl font-black">אם יש התאמות שממתינות לכם, הן יופיעו באזור האישי</h2>
              <div className="mt-4 space-y-2 text-sm leading-6 text-[#62566e]">
                <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#a52178]" />צופים בהתאמות פוטנציאליות ובפרטים המרכזיים.</p>
                <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#a52178]" />בוחרים למי רוצים לשלוח Boost.</p>
                <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#a52178]" />לא צריך לחכות לאישור אישי שלי.</p>
              </div>
            </div>

            {isPersonalLink ? (
              <div className="mt-5">
                {personalStatus.isLoading ? (
                  <div className="h-40 animate-pulse rounded-2xl bg-[#f7f3ff]" />
                ) : personalStatus.isError ? (
                  <div className="rounded-2xl bg-amber-50 p-5 text-center text-amber-900">
                    <h3 className="font-black">לא ניתן לפתוח את האישור בקישור הזה</h3>
                    <p className="mt-2 text-sm leading-6">שירות Boost מיועד לחברי מאגר פעילים. אפשר לפנות לצוות אם הפרופיל אמור להיות פעיל.</p>
                  </div>
                ) : personalJoined || personalStatus.data?.membership?.active ? (
                  <div className="rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
                    <CheckCircle2 className="mx-auto h-9 w-9" />
                    <h3 className="mt-3 text-lg font-black">שירות Boost פעיל בפרופיל שלכם</h3>
                    <p className="mt-2 text-sm leading-6">האישור נשמר והפרופיל עודכן. מעכשיו אפשר לשלוח ולקבל בקשות Boost.</p>
                    <a href={`/my-profile?email=${encodeURIComponent(personalEmail)}&token=${encodeURIComponent(personalToken)}&tab=matches`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#191265] px-5 py-3 text-sm font-black text-white">כניסה לאזור האישי<ArrowLeft className="h-4 w-4" /></a>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-black">אישור הצטרפות לשירות Boost</h3>
                    <p className="mt-2 text-sm leading-6 text-[#6f627a]">בלחיצה על האישור, הפרופיל יתעדכן מיד ותוכלו לשלוח ולקבל בקשות Boost באזור האישי.</p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f3ff] p-4 text-sm leading-6 text-[#51475d]">
                      <input type="checkbox" checked={personalConsent} onChange={event => setPersonalConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#a52178]" />
                      <span>אישור זה מצרף את הפרופיל לשירות Boost, מאפשר להופיע בכרטיס אנונימי ולשלוח ולקבל בקשות התאמה שנוצרו על ידי האלגוריתם ואינן עוברות אישור אישי של הילית. הפרטים ייחשפו רק לאחר הסכמה הדדית.</span>
                    </label>
                    <button type="button" disabled={!personalConsent || joinPool.isPending} onClick={() => joinPool.mutate({ email: personalEmail, token: personalToken, algorithmicDisclosureAccepted: true, anonymousProfileAccepted: true, termsAccepted: true })} className="mt-4 w-full rounded-xl bg-gradient-to-l from-[#a52178] to-[#5d176d] px-5 py-4 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45">
                      {joinPool.isPending ? "מאשרים..." : "אישור הצטרפות לשירות Boost"}
                    </button>
                    {joinPool.isError && <p className="mt-3 text-center text-xs font-bold text-red-600">{joinPool.error.message}</p>}
                  </div>
                )}
              </div>
            ) : interest.isSuccess ? (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-5 text-center text-emerald-800">
                <CheckCircle2 className="mx-auto h-9 w-9" />
                <h3 className="mt-3 text-lg font-black">הקישור בדרך אליכם</h3>
                <p className="mt-2 text-sm leading-6">{interest.data.message}</p>
              </div>
            ) : (
              <div className="mt-5">
                <h3 className="text-xl font-black">פותחים את הפרופיל ל־Boost</h3>
                <p className="mt-2 text-sm leading-6 text-[#6f627a]">השירות מיועד לחברי מאגר פעילים. הזינו את כתובת המייל שאיתו נרשמתם למאגר, ונשלח אליה קישור אישי לאישור השירות ולכניסה לאזור האישי.</p>
                <p className="mt-3 rounded-xl bg-[#fff8d8] p-3 text-xs font-bold leading-5 text-[#5f4a00]">האישור וההצטרפות לשירות אינם כרוכים בתשלום נוסף. 19.99 ₪ נגבים רק אם בוחרים לשלוח Boost בפועל.</p>
                <div className="relative mt-4">
                  <Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a52178]" />
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="המייל שאיתו נרשמתם למאגר" className="w-full rounded-xl border border-[#ddd4eb] bg-white py-3 pl-4 pr-11 text-sm outline-none focus:border-[#a52178]" />
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-[#f7f3ff] p-3 text-xs leading-5 text-[#5d526b]">
                  <input type="checkbox" checked={requestAccepted} onChange={event => setRequestAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#a52178]" />
                  <span>אפשר לשלוח לי קישור אישי לאישור שירות Boost. הקישור נשלח כדי לוודא שזהו הפרופיל שלי במאגר.</span>
                </label>
                <button type="button" onClick={submit} disabled={!requestAccepted || !email.includes("@") || interest.isPending} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-[#a52178] to-[#5d176d] px-5 py-4 text-sm font-black text-white shadow-lg transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45">
                  {interest.isPending ? "שולחים קישור..." : "שלחו לי קישור לפתיחת Boost"}<ArrowLeft className="h-4 w-4" />
                </button>
                {interest.isError && <p className="mt-3 text-center text-xs font-bold text-red-600">לא הצלחנו לשלוח כרגע. אפשר לנסות שוב בעוד רגע.</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a52178]">שלושה צעדים פשוטים</p>
          <h2 className="mt-3 text-3xl font-black sm:text-5xl">מאשרים פעם אחת, ובוחרים בכל פעם מחדש.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["01", "מזינים את המייל שאיתו נרשמתם למאגר", "הקישור נשלח למייל כדי לוודא שזהו הפרופיל שלכם."],
            ["02", "מאשרים את שירות Boost", "בלחיצה אחת מאשרים לשלוח ולקבל Boost והפרופיל מתעדכן במערכת."],
            ["03", "רואים ובוחרים", "צופים בהתאמות הפוטנציאליות ומחליטים אם לשלוח Boost."],
          ].map(([number, title, text]) => (
            <article key={number} className="rounded-3xl border border-[#e8dff2] bg-white p-6 shadow-sm">
              <span className="text-3xl font-black text-[#d52b8c]">{number}</span>
              <h3 className="mt-4 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#6f627a]">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 rounded-3xl bg-[#241257] p-6 text-white sm:p-10">
          <h2 className="text-2xl font-black sm:text-4xl">האישור שלכם ל־Boost</h2>
          <p className="mt-3 max-w-3xl text-base leading-8 text-white/85">Boost הוא שירות נוסף לחברי המאגר, מעבר להתאמות השוטפות שאני ממשיכה לשלוח. האישור פותח את הפרופיל שלכם לאפשרות לשלוח ולקבל בקשות Boost. ההתאמות נוצרות רק לאחר שהאלגוריתם מצא התאמה פוטנציאלית, אך הן אינן עוברות אישור אישי שלי לפני השליחה.</p>
          <div className="mt-6 grid gap-3 text-sm leading-6 sm:grid-cols-2">
            {["אפשר לראות גם התאמות פוטנציאליות מתחת ל־80% ולבחור בעצמכם.", "מי שמאשרים את שירות הבוסט יכולים גם לשלוח וגם לקבל בקשות Boost.", "כל כרטיס מוצג באופן אנונימי, ללא שם, תמונה או פרטי קשר.", "הפרטים המלאים נפתחים רק אם שני הצדדים מאשרים את ההצעה."].map(item => (
              <p key={item} className="flex gap-2 rounded-xl bg-white/8 p-3"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#ffe27c]" />{item}</p>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[#e5ddeb] bg-white px-4 py-8 text-center text-xs text-[#766d80]">
        <p className="font-black text-[#251064]">Boost מבית הילית כספי</p>
        <p className="mt-2">אפשרות נוספת לחברי המאגר הפעילים, לפי בחירתכם ובאישור הפרופיל שלכם.</p>
      </footer>
    </main>
  );
}
