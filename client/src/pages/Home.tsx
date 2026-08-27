/**
 * DESIGN REMINDER — "שולחן אחד קדימה": מודרניזם ים־תיכוני עריכתי, א־סימטרי וחם.
 * צבעי שמנת, זית ורימון; שפה אנושית וישירה ללא לחץ, הבטחות זוגיות או עדויות מומצאות.
 */
import { ArrowLeft, Check, ChevronDown, HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const DEFAULT_UTM = {
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "sep26_tishrei_database_cold",
  utm_content: "landing_open_place_v1",
  utm_term: "landing_page",
};

const FAQ = [
  {
    question: "כמה התאמות אקבל/י?",
    answer:
      "זאת שאלה חשובה, והתשובה הישרה היא שאין מספר קבוע שאפשר להבטיח מראש. מספר ההתאמות תלוי בפרופילים הפעילים, בהעדפות, באזור ובאישור ההדדי. אנחנו מעדיפים לא לשלוח סתם שמות בשביל כמות, אלא להציע חיבורים עם היגיון אמיתי.",
  },
  {
    question: "מה שונה כאן מאפליקציית היכרויות?",
    answer:
      "זה לא עוד מקום לגלול בו לבד. הפרופילים נבדקים, וההצעות עוברות תהליך התאמה ובדיקה אנושית לפני שהן מגיעות לאישור. המטרה היא להפוך את החיפוש לפחות אקראי ויותר מדויק.",
  },
  {
    question: "מה קורה אחרי ההצטרפות?",
    answer:
      "ממלאים את הפרטים וההעדפות, נכנסים למאגר, ואז מתחיל תהליך בדיקה והתאמה. כשיש היכרות רלוונטית, היא נשלחת לאישור הדדי. אין דמי מנוי חודשיים.",
  },
];

const productBenefits = [
  "כניסה למאגר רווקים ורווקות שמחפשים קשר רציני",
  "פרופיל והעדפות שעוברים בדיקה אנושית",
  "תהליך התאמה המבוסס על עומק, נתונים והיכרות",
  "המדריך המעשי „לבחור נכון” — בבאנדל החג",
];

function buildDatabaseLink(utm: Record<string, string>) {
  const params = new URLSearchParams(utm);
  return `https://hilitcaspi.com/database?${params.toString()}`;
}

export default function Home() {
  const [openFaq, setOpenFaq] = useState(0);
  const databaseLink = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(
      Object.entries(DEFAULT_UTM).map(([key, fallback]) => [key, search.get(key) || fallback]),
    );
    return buildDatabaseLink(utm);
  }, []);

  const whatsappLink = `https://wa.me/972552442334?${new URLSearchParams({
    text: "היי הילית, הגעתי מעמוד חגי תשרי ורוצה לשמוע עוד על המאגר.",
  }).toString()}`;

  return (
    <main className="tishrei-page" dir="rtl">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="עמוד חגי תשרי של הילית כספי">
          <img
            src="/manus-storage/hilit-tishrei-pomegranate-mark_f11bb954.png"
            alt=""
            className="brand-mark"
          />
          <span className="brand-copy">
            <strong>הילית כספי</strong>
            <span>Relationship Expert &amp; Matchmaker</span>
          </span>
        </a>
        <a className="header-cta" href={databaseLink}>
          לפרטים והצטרפות <ArrowLeft size={16} strokeWidth={2.3} />
        </a>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <div className="hero-background" aria-hidden="true" />
        <div className="hero-route" aria-hidden="true"><span /><span /></div>
        <div className="hero-content">
          <span className="eyebrow"><i /> חגי תשרי תשפ״ז</span>
          <p className="hero-kicker">מקום לשניים מתחיל בהחלטה אחת.</p>
          <h1 id="hero-title">בחגים האלה,<br /><em>פותחים מקום</em><br />להיכרות חדשה.</h1>
          <p className="hero-lede">
            לא עוד גלילה ולא עוד ניחושים. מאגר הרווקים החכם של הילית כספי מחבר בין אנשים שמחפשים קשר רציני—עם עומק, נתונים ובדיקה אנושית.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={databaseLink}>
              לפתוח מקום במאגר <ArrowLeft size={19} />
            </a>
            <a className="button button-quiet" href="#how-it-works">
              לראות איך זה עובד <ChevronDown size={18} />
            </a>
          </div>
          <p className="small-note">ללא דמי מנוי חודשיים · התאמות נשלחות רק אחרי בדיקה ואישור הדדי</p>
        </div>
        <div className="hero-seal" aria-label="מאגר היכרויות, לא אפליקציה">
          <HeartHandshake size={22} />
          <span>מאגר היכרויות</span>
          <strong>לא אפליקציה</strong>
        </div>
      </section>

      <section className="opening-section">
        <div className="motif-route motif-route-opening" aria-hidden="true" />
        <div className="section-aside">
          <span className="section-number">01</span>
          <img src="/manus-storage/hilit-tishrei-pomegranate-mark_f11bb954.png" alt="" className="section-mark" />
          <p>לפני שולחן החג הבא</p>
        </div>
        <div className="opening-copy">
          <p className="label">הצעה לחג</p>
          <h2>פחות „אולי”.<br />יותר מקום לאפשרות אמיתית.</h2>
          <p>
            חגי תשרי מזכירים לנו מה חשוב: שיחות טובות, אנשים קרובים ומקום שאפשר להיות בו עצמנו. ההצעה שלנו לא מבטיחה קסם—היא פותחת דרך אחרת להכיר.
          </p>
          <p>
            מצטרפים למאגר, בונים פרופיל מדויק, ומתחילים תהליך שבו ההתאמות נבדקות לפני שהן נשלחות. כי הזמן והלב שלך ראויים ליותר מעוד מסך.
          </p>
        </div>
        <figure className="match-figure">
          <img src="/manus-storage/tishrei-match-path_290002ce.jpg" alt="כרטיס מקום על שולחן חג" />
          <figcaption>שני מסלולים. נקודת מפגש אחת.</figcaption>
        </figure>
      </section>

      <section className="bundle-section" aria-labelledby="bundle-title">
        <div className="bundle-heading">
          <span className="eyebrow eyebrow-light"><i /> הצעת חג מוגבלת</span>
          <h2 id="bundle-title">„מקום לשניים”</h2>
          <p>שני שלבים משלימים: להרחיב אפשרויות להיכרות, ולדעת לבחור אחרת כשמשהו כבר מתחיל.</p>
        </div>
        <div className="bundle-card place-card">
          <span className="card-notch card-notch-top" aria-hidden="true" />
          <span className="card-notch card-notch-bottom" aria-hidden="true" />
          <div className="bundle-card-top">
            <span>המאגר החכם של הילית</span>
            <span className="plus">+</span>
            <span>„לבחור נכון” — מדריך מעשי</span>
          </div>
          <div className="bundle-content">
            <div>
              <p className="bundle-label">מה נכנס לחג הזה</p>
              <ul>
                {productBenefits.map((benefit) => (
                  <li key={benefit}><Check size={18} strokeWidth={2.5} /> {benefit}</li>
                ))}
              </ul>
            </div>
            <div className="bundle-price">
              <span>מסלול חג</span>
              <div><del>₪748</del> <strong>₪249</strong></div>
              <small>מחיר הבאנדל כפוף למחיר הקופה הפעיל</small>
              <a href={databaseLink} className="button button-primary">לראות את ההצעה <ArrowLeft size={18} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="process-section" id="how-it-works" aria-labelledby="process-title">
        <div className="process-intro">
          <span className="section-number">02</span>
          <p className="label">הדרך למפגש מתחילה כאן</p>
          <h2 id="process-title">לא יותר התאמות בכל מחיר.<br /><em>יותר התאמות שיש להן סיבה.</em></h2>
        </div>
        <div className="process-route" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div>
        <ol className="process-list">
          <li>
            <span>01</span>
            <h3>מספרים מי את ומה באמת חשוב לך</h3>
            <p>פרופיל, העדפות ודפוסים—כדי להתחיל מהמקום שנכון לך, לא מרשימת קלישאות.</p>
          </li>
          <li>
            <span>02</span>
            <h3>מכניסים אותך למאגר חי</h3>
            <p>אנשים שמחפשים קשר רציני. לא משחק, לא מרתון של swipe, לא עוד סתם עוד אפליקציה.</p>
          </li>
          <li>
            <span>03</span>
            <h3>בודקים לפני שמציעים</h3>
            <p>כל חיבור עובר תהליך התאמה ובדיקה אנושית, ורק אז מגיע לאישור של שני הצדדים.</p>
          </li>
        </ol>
      </section>

      <section className="clarity-section" aria-labelledby="clarity-title">
        <div className="clarity-photo">
          <img src="/manus-storage/tishrei-community-portrait_835fabcb.jpg" alt="אישה קוראת הודעה בחלל ביתי מואר" />
          <span className="photo-stamp">שקיפות לפני הכול</span>
        </div>
        <div className="clarity-copy">
          <p className="label">שאלה שמגיעה הרבה</p>
          <span className="place-card-tag"><img src="/manus-storage/hilit-tishrei-pomegranate-mark_f11bb954.png" alt="" /> תשובה ישירה</span>
          <h2 id="clarity-title">„כמה התאמות<br />אקבל/י?”</h2>
          <p className="quote-intro">זאת לא שאלה לא נוחה. זאת בדיוק השאלה שכדאי לשאול.</p>
          <p>
            אין מספר קבוע שאפשר להבטיח מראש, כי התאמה טובה תלויה באנשים פעילים, בהעדפות, באזור ובאישור הדדי. אנחנו לא שולחים שמות רק כדי לייצר כמות. אנחנו בודקים, ומציעים כשיש היגיון אמיתי לחיבור.
          </p>
          <a className="text-link" href="#faq">לקרוא את התשובה המלאה <ArrowLeft size={16} /></a>
        </div>
      </section>

      <section className="proof-section" aria-labelledby="proof-title">
        <div className="proof-title-block">
          <span className="section-number">03</span>
          <p className="label">הוכחה בדרך שעובדת לנו</p>
          <h2 id="proof-title">לא הבטחות גדולות.<br />תהליך שאפשר להבין.</h2>
        </div>
        <div className="proof-grid">
          <article className="proof-card">
            <span className="proof-seed" />
            <Sparkles size={24} />
            <h3>בחינה אנושית</h3>
            <p>מאחורי הנתונים יש מישהי שמכירה את התהליך ואת שני הצדדים של ההיכרות.</p>
          </article>
          <article className="proof-card">
            <span className="proof-seed" />
            <HeartHandshake size={24} />
            <h3>אישור הדדי</h3>
            <p>היכרות טובה מתחילה רק כשיש רצון של שני אנשים לבדוק אותה.</p>
          </article>
          <article className="proof-card">
            <span className="proof-seed" />
            <MessageCircle size={24} />
            <h3>שיחה במקום רעש</h3>
            <p>פחות סימנים מעורבים, יותר תהליך שמחזיר מקום לתקשורת ברורה.</p>
          </article>
        </div>
      </section>

      <section className="faq-section" id="faq" aria-labelledby="faq-title">
        <div className="faq-heading">
          <p className="label">שקיפות היא חלק מהשיטה</p>
          <h2 id="faq-title">כדאי לשאול<br />לפני שמצטרפים.</h2>
          <p>התשובות הישרות חשובות לא פחות מההזמנה להצטרף.</p>
        </div>
        <div className="faq-list">
          {FAQ.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <article className={`faq-item ${isOpen ? "is-open" : ""}`} key={item.question}>
                <button
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={22} aria-hidden="true" />
                </button>
                <div id={`faq-panel-${index}`} className="faq-answer" hidden={!isOpen}>
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="closing-section">
        <div className="closing-table-art" aria-hidden="true">
          <img src="/manus-storage/hilit-tishrei-pomegranate-mark_f11bb954.png" alt="" />
          <span className="table-card card-one">מקום אחד</span>
          <span className="table-card card-two">לשיחה חדשה</span>
          <span className="table-route" />
        </div>
        <div className="closing-copy">
          <span className="eyebrow eyebrow-light"><i /> מקום להיכרות חדשה</span>
          <h2>אפשר לפנות<br />מקום חדש בשולחן.</h2>
          <p>אפשר לבחור בדרך קצת אחרת להכיר. בלי לחץ, בלי הבטחות קסם, עם מקום לשיחה אמיתית.</p>
          <div className="closing-actions">
            <a className="button button-cream" href={databaseLink}>לפרטים והצטרפות <ArrowLeft size={19} /></a>
            <a className="button button-outline-light" href={whatsappLink} target="_blank" rel="noreferrer">לשאלה ב-WhatsApp <MessageCircle size={18} /></a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand" href="#top">
          <img src="/manus-storage/hilit-tishrei-pomegranate-mark_f11bb954.png" alt="" className="brand-mark" />
          <span className="brand-copy"><strong>הילית כספי</strong><span>Matchmaking with depth</span></span>
        </a>
        <p>© 2026 הילית כספי · כל הזכויות שמורות</p>
        <a href="https://hilitcaspi.com" className="text-link">לאתר הראשי <ArrowLeft size={15} /></a>
      </footer>
    </main>
  );
}
