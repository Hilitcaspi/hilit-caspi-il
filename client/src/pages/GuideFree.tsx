/**
 * GuideFree - דף נחיתה למדריך החינמי
 * "4 מלכודות חשיבה שמעכבות אותך במציאת זוגיות"
 * Route: /guide-free
 */
import { getUtmParams } from "@/lib/utils";
import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/track";
import { trackLead } from "@/lib/metaPixel";

const HILIT_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-hero_30e4b53c.png";
const HILIT_PROFILE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663464075430/ByosHxKceEZVvPCNnZPjYz/hilit-profile_6821862b.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};
const stagger = { visible: { transition: { staggerChildren: 0.12 } } };

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={stagger} initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

const PATTERNS = [
  {
    num: "01",
    title: "Miswanting",
    subtitle: "לרצות את הדבר הלא נכון",
    desc: "המוח שלנו גרוע בלחזות מה יגרום לנו להיות מאושרים. אנחנו מחפשים את מי שנראה מושלם - ומפספסים את מי שיכול להיות נכון.",
  },
  {
    num: "02",
    title: "הסתגלות הדוניסטית",
    subtitle: "כשהניצוץ נגמר",
    desc: "המוח מתרגל לכל דבר טוב ומפסיק להרגיש אותו. הרגשה ש'הניצוץ נגמר' היא לא סימן שהבן אדם לא מתאים - היא ביולוגיה.",
  },
  {
    num: "03",
    title: "השוואה חברתית",
    subtitle: "כשכולם כבר מצאו",
    desc: "הרגשה שכולם כבר בזוגיות ורק את נשארת מאחור. זה לא המציאות - זה הטיה קוגניטיבית שמרחיקה אותך מהחיפוש האמיתי.",
  },
  {
    num: "04",
    title: "הטיית הקבועה",
    subtitle: "הפחד מקבלת אהבה",
    desc: "המוח מעדיף את הוודאי על פני הטוב. לפעמים אנחנו דוחים אהבה לא כי היא לא מתאימה - אלא כי היא מפחידה.",
  },
];

export default function GuideFree() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitLead = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      track({ eventType: "guide_download", email: email.trim() });
      track({ eventType: "form_submit", page: "/free-guide", metadata: { form: "free_guide", email: email.trim() } });
      trackLead({ content_name: "מדריך חינמי - 4 מלכודות" });
    },
    onError: (err: { message?: string }) => setError(err.message || "משהו השתבש, נסי שוב"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) return;
    submitLead.mutate({ name: name.trim(), email: email.trim(), ...getUtmParams() });
  };

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">

      {/* ── NAVBAR ── */}
      <nav className="bg-[#191265] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl">הילית כספי</Link>
        <Link href="/guide" className="text-[#ffe27c] text-sm font-medium hover:underline">
          המדריך המלא ₪149 ←
        </Link>
      </nav>

      {/* ── HERO ── */}
      <section className="bg-[#191265] py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #ffe27c 0%, transparent 50%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="text-right">
            <div className="inline-block bg-[#ffe27c]/20 border border-[#ffe27c]/40 text-[#ffe27c] text-sm font-medium px-4 py-2 rounded-full mb-6">
              מדריך חינמי · PDF להורדה מיידית
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-6">
              4 מלכודות חשיבה<br />
              <span className="text-[#ffe27c]">שמעכבות אותך</span><br />
              במציאת זוגיות
            </h1>
            <p className="text-white/75 text-lg leading-relaxed mb-8">
              המוח שלנו עושה דברים מאוד מסוימים כשאנחנו מחפשים אהבה - ורובנו לא מודעים להם.
              <br /><br />
              המדריך הזה מסביר את 4 המנגנונים הפסיכולוגיים שמרחיקים אותך מזוגיות, ומה לעשות אחרת.
            </p>
            <div className="flex flex-wrap gap-3">
              {["מבוסס פסיכולוגיה חיובית", "קריאה של 15 דקות", "חינמי לחלוטין"].map(tag => (
                <span key={tag} className="bg-white/10 text-white/80 text-sm px-3 py-1.5 rounded-full border border-white/20">{tag}</span>
              ))}
            </div>
          </motion.div>

          {/* Form */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
            {submitted ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                <div className="text-5xl mb-4">📬</div>
                <h3 className="text-2xl font-black text-[#191265] mb-3">המדריך בדרך אלייך!</h3>
                <p className="text-[#727272] mb-3 leading-relaxed">
                  שלחנו לך את המדריך למייל: כדאי לבדוק את תיבת הדואר הנכנסת.
                </p>
                <p className="text-[#727272] text-xs mb-6">לא רואים? בדקו גם בתיקיית הספאם והעבירו לתיבה הראשית.</p>
                <Link href="/guide"
                  className="inline-block bg-[#191265] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#1800ad] transition-colors">
                  רוצים ללכת עמוק יותר? המדריך המלא ←
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 shadow-2xl">
                <h2 className="text-xl font-black text-[#191265] mb-2 text-center">קבלי את המדריך עכשיו</h2>
                <p className="text-[#727272] text-sm text-center mb-6">חינמי לחלוטין · ללא ספאם · ניתן להסרה בכל עת</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="השם שלך"
                    className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="כתובת המייל שלך"
                    className="px-5 py-4 rounded-xl border-2 border-[#e9e8e8] text-[#191265] placeholder-[#727272] focus:outline-none focus:border-[#191265] text-right text-base transition-all"
                  />
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitLead.isPending}
                    className="bg-[#ffe27c] text-[#191265] font-black text-lg py-4 rounded-xl hover:bg-[#ffd84a] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-60"
                  >
                    {submitLead.isPending ? "שולחת..." : "שלחי לי את המדריך החינמי ←"}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── 4 PATTERNS ── */}
      <section className="py-20 px-6 bg-white">
        <AnimatedSection>
          <div className="max-w-4xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-14">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-3">מה תמצאי במדריך</p>
              <h2 className="text-3xl md:text-4xl font-black text-[#191265]">
                4 המלכודות שמונעות ממך<br />למצוא אהבה
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {PATTERNS.map((p) => (
                <motion.div key={p.num} variants={fadeUp}
                  className="bg-[#f0eadc] rounded-2xl p-6 border border-[#e0d8cc]">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-black text-[#ffe27c] leading-none">{p.num}</span>
                    <div>
                      <h3 className="text-lg font-black text-[#191265]">{p.title}</h3>
                      <p className="text-[#1800ad] text-sm font-semibold mb-2">{p.subtitle}</p>
                      <p className="text-[#555] text-sm leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── ABOUT HILIT ── */}
      <section className="py-16 px-6 bg-[#f0eadc]">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-8 items-center">
            <motion.img variants={fadeUp} src={HILIT_PROFILE} alt="הילית כספי"
              className="w-40 h-40 rounded-full object-cover shadow-xl flex-shrink-0" />
            <motion.div variants={fadeUp} className="text-right">
              <p className="text-[#1800ad] font-semibold text-sm uppercase tracking-widest mb-2">מי אני</p>
              <h3 className="text-2xl font-black text-[#191265] mb-3">הילית כספי</h3>
              <p className="text-[#555] leading-relaxed">
                מאמנת ומרצה למציאת זוגיות, מתמחה בפסיכולוגיה חיובית ומאגר רווקים ורווקות.
                ליוויתי מאות נשים וגברים בדרך לזוגיות - לא דרך מזל, אלא דרך שיטה.
              </p>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="bg-[#191265] py-16 px-6 text-center">
        <AnimatedSection>
          <motion.div variants={fadeUp} className="max-w-xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4">
              רוצה ללכת עמוק יותר?
            </h2>
            <p className="text-white/75 mb-6 leading-relaxed">
              המדריך "לבחור נכון" מכיל שאלון אישי, תרגילים מעשיים לכל מלכודת, וכלים לבחירה מתוך חופש.
            </p>
            <Link href="/guide"
              className="inline-block bg-[#ffe27c] text-[#191265] font-black text-lg px-10 py-5 rounded-2xl hover:bg-white transition-all duration-300 hover:scale-105 shadow-2xl">
              למדריך המלא ←
            </Link>
            <div className="mt-6 bg-white/10 border border-[#ffe27c]/40 rounded-2xl px-6 py-5 text-center">
              <p className="text-white/60 text-xs mb-2">קוד מיוחד לקוראי המדריך החינמי:</p>
              <p className="text-[#ffe27c] font-black text-2xl tracking-widest mb-1">BRAIN99</p>
              <p className="text-white/70 text-sm">הזיני בקופה ותשלמי רק ₪99. בלעדי ולזמן מוגבל.</p>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d0a3a] py-8 px-6 text-center">
        <p className="text-white/40 text-sm">
          © 2025 הילית כספי · Relationship Expert & Matchmaker ·{" "}
          <Link href="/" className="hover:text-white/70 transition-colors">דף הבית</Link>
        </p>
      </footer>
    </div>
  );
}
