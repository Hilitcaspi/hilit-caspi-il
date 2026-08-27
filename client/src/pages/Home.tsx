/**
 * BRAND REMINDER — הילית כספי: נייבי עמוק, זהב #FFE27C, קרם, Rubik וצילום הילית אמיתי.
 * היררכיה: הילית והשיטה, אחריה המוצרים וההצעה. החג הוא נגיעה טקסטואלית בלבד.
 */
import { Check, ChevronDown, Heart, MessageCircle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const BASE_UTM = {
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "sep26_holidays_tubav_bundle",
  utm_content: "landing_bundle_v1",
  utm_term: "landing_page",
};

const FAQ = [
  {
    question: "כמה התאמות אקבל/י?",
    answer:
      "זו שאלה חשובה, ולכן חשוב לי לענות עליה ישר: אין מספר קבוע שאפשר להבטיח מראש. מספר ההתאמות תלוי באנשים הפעילים במאגר, בהעדפות, באזור ובאישור ההדדי. המטרה היא לא לשלוח סתם שמות בשביל כמות, אלא לבדוק היכרות שיש לה היגיון אמיתי.",
  },
  {
    question: "מה ההבדל בין המאגר לבין אפליקציית היכרויות?",
    answer:
      "המאגר אינו אפליקציה. לא גוללים לבד בין פרופילים. כל מי שנכנס/ת ממלא/ת שאלון, עובר/ת סינון, וההתאמות נבנות על בסיס עומק, נתונים והיכרות אנושית עם שני הצדדים.",
  },
  {
    question: "מה כולל מבצע החגים?",
    answer:
      "ההצעה משלבת את הכניסה למאגר עם המדריך ״לבחור נכון״. המדריך נועד לעזור להבין את הדפוסים שעומדים מאחורי הבחירות הזוגיות, כדי שהיכרות חדשה תתחיל ממקום מדויק יותר.",
  },
];

function withUtm(path: string, fallback: Record<string, string>) {
  const inbound = new URLSearchParams(window.location.search);
  const merged = Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => [key, inbound.get(key) || value]),
  );
  return `https://hilitcaspi.com${path}?${new URLSearchParams(merged).toString()}`;
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const links = useMemo(() => ({
    database: withUtm("/database", BASE_UTM),
    guide: withUtm("/guide", { ...BASE_UTM, utm_content: "landing_guide_v1" }),
    quiz: withUtm("/dna-quiz", { ...BASE_UTM, utm_content: "landing_dna_v1" }),
  }), []);
  const whatsapp = "https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%94%D7%92%D7%A2%D7%AA%D7%99%20%D7%9E%D7%9E%D7%91%D7%A6%D7%A2%20%D7%94%D7%97%D7%92%D7%99%D7%9D%20%D7%95%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%9C%20%D7%94%D7%9E%D7%90%D7%92%D7%A8.";

  return (
    <main className="hilit-page" dir="rtl">
      <section className="brand-hero" id="top">
        <header className="brand-header">
          <a className="wordmark" href="#top" aria-label="הילית כספי">
            <strong>הילית כספי</strong>
            <span>Relationship Expert &amp; Matchmaker</span>
          </a>
          <a className="header-link" href={links.quiz}>שאלון חינמי <Sparkles size={15} /></a>
        </header>

        <div className="hero-main">
          <div className="hero-copy">
            <span className="expert-pill">✦ Relationship Expert &amp; Matchmaker</span>
            <h1>פיצחתי את הקוד<br />הסודי <mark>למציאת האהבה.</mark><br /><b>עכשיו תורך.</b></h1>
            <p>
              המאגר והמדריך שלי נבנו כדי לעזור לך להפסיק לחזור על אותן בחירות, ולהתחיל להכיר אחרת.
              לקראת החגים, הכנתי את שניהם יחד בהצעה אחת.
            </p>
            <div className="hero-buttons">
              <a href="#offer" className="cta-gold"><Heart size={19} fill="currentColor" /> למבצע החגים</a>
              <a href={links.quiz} className="cta-outline">שאלון DNA חינמי</a>
            </div>
          </div>

          <div className="hero-photo-wrap">
            <div className="gold-glow" />
            <img src="/manus-storage/hilit-hero-original_e7f57482.png" alt="הילית כספי" className="hero-photo" />
            <div className="photo-note"><span>🧬</span><strong>התאמה מקצועית</strong><small>מדע, עומק ובדיקה אנושית</small></div>
          </div>
        </div>
        <p className="scroll-cue">לגלות איך זה עובד ↓</p>
      </section>

      <section className="offer-section" id="offer" aria-labelledby="offer-title">
        <div className="offer-heading">
          <p className="section-kicker">מבצע חגי תשרי</p>
          <h2>לא צריך לבחור<br />בין להבין לבין להכיר.</h2>
          <p>בדיוק כמו בט״ו באב, גם לקראת החגים אפשר לקבל את שני הכלים יחד: מאגר שנותן אפשרות אמיתית להיכרות, ומדריך שעוזר לבחור נכון בתוכה.</p>
        </div>
        <article className="offer-card">
          <div className="card-topline"><span>הטבה מיוחדת</span><span>לזמן מוגבל</span></div>
          <div className="offer-products">
            <div><span className="product-index">01</span><h3>מאגר הרווקים החכם</h3><p>התאמה מקצועית על בסיס עומק, נתונים ובדיקה אישית.</p></div>
            <span className="product-plus">+</span>
            <div><span className="product-index">02</span><h3>״לבחור נכון״</h3><p>מדריך מעשי שיעזור לך לזהות למה את/ה נמשכ/ת ולבחור אחרת.</p></div>
          </div>
          <div className="offer-bottom">
            <div className="price-line"><span>במקום <del>₪748</del></span><strong>₪349</strong><small>חיסכון של ₪399</small></div>
            <a href={links.database} className="cta-navy">לפרטים ולהצטרפות <span>←</span></a>
          </div>
        </article>
      </section>

      <section className="story-section" aria-labelledby="story-title">
        <div className="story-image"><img src="/manus-storage/hilit-about-original_d5a478de.jpg" alt="הילית כספי" /></div>
        <div className="story-copy">
          <p className="section-kicker">זה לא מזל. זה דפוסים.</p>
          <h2 id="story-title">למה אנשים טובים,<br />חכמים ואוהבים<br />לא מצליחים למצוא אהבה?</h2>
          <p>מאות אנשים כבר ישבו מולי עייפים מדייטים, מותשים מאפליקציות ובטוחים שמשהו בהם שבור. אבל הבעיה בדרך כלל לא הייתה שאין אנשים טובים, אלא דפוסים עמוקים שממשיכים להוביל לאותן בחירות.</p>
          <p>אני משלבת פסיכולוגיה, אינטואיציה וניסיון מעשי כדי לעזור להבין את הדפוסים האלה, וליצור דרך אחרת להכיר.</p>
          <a href={links.quiz} className="inline-link">להתחיל מהשאלון החינמי <span>←</span></a>
        </div>
      </section>

      <section className="products-section" aria-labelledby="products-title">
        <div className="products-heading"><p className="section-kicker">המוצרים שלי</p><h2 id="products-title">לבחור את הצעד<br />שמתאים לך עכשיו.</h2></div>
        <div className="product-grid">
          <article className="product-card feature-card">
            <span className="mini-badge">הכי פופולרי</span><span className="card-icon">💛</span>
            <h3>מאגר הרווקים החכם</h3><p>מאגר רווקים ורווקות שעברו סינון, עם התאמות שמבוססות על חישובים מתקדמים ועוברות אישור אישי.</p>
            <strong className="product-price">₪149 <del>₪499</del></strong><a href={links.database}>לפרטים והצטרפות <span>←</span></a>
          </article>
          <article className="product-card">
            <span className="card-icon">📖</span><h3>לבחור נכון</h3><p>שאלון אישי, תרגילים מעמיקים וכלים שיעזרו להפסיק לבחור מתוך פחד ולהתחיל לבחור מתוך חופש.</p>
            <strong className="product-price">₪149 <del>₪249</del></strong><a href={links.guide}>לפרטים ורכישה <span>←</span></a>
          </article>
          <article className="product-card">
            <span className="card-icon">🧬</span><h3>אבחון DNA זוגי</h3><p>20 משפטים שיכולים לעזור להבין מהו הטיפוס הזוגי שלך ואיזו התאמה יכולה להיות מדויקת עבורך.</p>
            <strong className="product-price free">חינם</strong><a href={links.quiz}>לאבחון החינמי <span>←</span></a>
          </article>
        </div>
      </section>

      <section className="database-section" aria-labelledby="database-title">
        <div className="database-copy">
          <p className="section-kicker">מאגר הרווקים הבלעדי</p>
          <h2 id="database-title">לא אפליקציה.<br /><mark>Matchmaking אמיתי.</mark></h2>
          <p>כל מי שנכנס/ת למאגר עובר/ת שאלון וסינון. אני לא מחברת אנשים באקראי: אני בודקת את שני הצדדים, ומעבירה התאמה רק כשיש סיבה אמיתית לבדוק אותה.</p>
          <ul><li><Check size={18} /> סינון קפדני של כל המועמדים</li><li><Check size={18} /> היכרות אישית עם כל צד</li><li><Check size={18} /> התאמה שמבוססת על עומק, לא על תמונה</li></ul>
          <a href={links.database} className="cta-gold">לפרטים והצטרפות <span>←</span></a>
        </div>
        <div className="database-photo"><img src="/manus-storage/hilit-casual-original_92df5afc.jpg" alt="הילית כספי" /><span className="photo-caption">מדע, עומק וקסם החיבור</span></div>
      </section>

      <section className="faq-section" aria-labelledby="faq-title">
        <div className="faq-intro"><p className="section-kicker">חשוב לי להיות ברורה</p><h2 id="faq-title">השאלות שכדאי<br />לשאול לפני שמצטרפים.</h2><p>כן, גם השאלה על כמות ההתאמות. שקיפות היא חלק מהדרך שלי לעבוד.</p></div>
        <div className="faq-list">
          {FAQ.map((item, index) => <article className={`faq-item ${openFaq === index ? "open" : ""}`} key={item.question}>
            <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} aria-expanded={openFaq === index}><span>{item.question}</span><ChevronDown size={22} /></button>
            {openFaq === index && <p>{item.answer}</p>}
          </article>)}
        </div>
      </section>

      <section className="final-section">
        <div className="final-copy"><p className="section-kicker">לקראת החגים</p><h2>אולי הגיע הזמן<br />להכיר אחרת.</h2><p>בלי הבטחות קסם ובלי מסלול אחיד לכולם. רק דרך ברורה יותר להבין, לבחור ולהיפתח לאפשרות חדשה.</p><div><a href={links.database} className="cta-gold">למבצע החגים <Heart size={19} fill="currentColor" /></a><a href={whatsapp} target="_blank" rel="noreferrer" className="whatsapp-link"><MessageCircle size={18} /> יש שאלות? דברו איתי</a></div></div>
        <img src="/manus-storage/hilit-profile-original_9ce4f7ac.jpg" alt="הילית כספי" className="final-photo" />
      </section>

      <footer className="brand-footer"><a className="wordmark" href="#top"><strong>הילית כספי</strong><span>Relationship Expert &amp; Matchmaker</span></a><span>© 2026 הילית כספי. כל הזכויות שמורות.</span><a href="https://hilitcaspi.com">לאתר הראשי ←</a></footer>
    </main>
  );
}
