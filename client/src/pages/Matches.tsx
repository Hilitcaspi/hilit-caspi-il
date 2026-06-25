/**
 * Matches page - shows the 3 best matches for a registered single
 */
import { useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { track } from "@/lib/track";

const PERSONALITY_LABELS: Record<string, string> = {
  connector: "המחבר/ת",
  achiever: "המשיג/ה",
  nurturer: "המטפח/ת",
  adventurer: "ההרפתקן/ית",
};

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון",
  vocational:  "הכשרה מקצועית",
  technician:  "הנדסאי",
  student:     "סטודנט/ית",
  bachelor: "תואר ראשון",
  master: "תואר שני",
  phd: "דוקטורט",
  other: "אחר",
};

const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני",
  traditional: "מסורתי",
  religious: "דתי",
  orthodox: "חרדי",
};

const WANTS_KIDS_LABELS: Record<string, string> = {
  yes: "רוצה ילדים",
  no: "לא רוצה ילדים",
  open: "פתוח/ה לאפשרויות",
};

export default function Matches() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const singleId = parseInt(params.get("id") || "0");

  const { data: matches, isLoading, error } = trpc.singles.getMatches.useQuery(
    { singleId },
    { enabled: singleId > 0 }
  );

  if (!singleId) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-black text-[#191265] mb-2">לא נמצא פרופיל</h2>
          <p className="text-[#727272]">נא לחזור ולמלא את הפרופיל</p>
          <a href="/register" className="mt-4 inline-block bg-[#191265] text-white font-bold px-6 py-3 rounded-xl">
            חזרה להרשמה
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] py-6 px-6 text-center">
        <h1 className="text-white font-black text-2xl md:text-3xl mb-2">
          💛 ההתאמות שלך מוכנות!
        </h1>
        <p className="text-white/70">
          האלגוריתם שלנו מצא את ה-3 ההתאמות הטובות ביותר עבורך
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 animate-bounce">💛</div>
            <p className="text-[#191265] font-bold text-xl">מחפשת התאמות...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">😔</div>
            <p className="text-[#191265] font-bold text-xl">שגיאה בטעינת ההתאמות</p>
            <p className="text-[#727272] mt-2">{error.message}</p>
          </div>
        )}

        {matches && matches.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-2xl font-black text-[#191265] mb-4">
              עוד מעט יהיו התאמות!
            </h2>
            <p className="text-[#727272] leading-relaxed max-w-md mx-auto">
              המאגר שלנו גדל כל הזמן. הילית תיצור איתך קשר ברגע שתהיה התאמה מתאימה עבורך.
            </p>
            <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm text-right">
              <h3 className="font-bold text-[#191265] mb-3">בינתיים:</h3>
              <ul className="space-y-2 text-[#727272] text-sm">
                <li>✓ הפרופיל שלך כבר פעיל במאגר</li>
                <li>✓ הילית תסקור אותו ותיצור קשר</li>
                <li>✓ תקבלי עדכון ברגע שתהיה התאמה</li>
              </ul>
            </div>
          </div>
        )}

        {matches && matches.length > 0 && (
          <>
            <div className="text-center mb-8">
              <p className="text-[#727272] text-lg">
                מצאנו <strong className="text-[#191265]">{matches.length} התאמות</strong> עבורך
              </p>
            </div>

            <div className="space-y-6">
              {matches.map((match: any, idx: number) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.2, duration: 0.5 }}
                  className="bg-white rounded-3xl shadow-lg overflow-hidden"
                >
                  {/* Match rank badge */}
                  <div className={`px-6 py-3 flex items-center justify-start ${idx === 0 ? "bg-[#ffe27c]" : idx === 1 ? "bg-[#191265]" : "bg-[#f0eadc]"}`}>
                    <span className={`font-black text-sm ${idx === 0 ? "text-[#191265]" : idx === 1 ? "text-white" : "text-[#191265]"}`}>
                      {idx === 0 ? "⭐ ההתאמה הטובה ביותר" : idx === 1 ? "💙 התאמה מצוינת" : "✨ התאמה טובה"}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex gap-5">
                      {/* Photo */}
                      <div className="flex-shrink-0">
                        {match.photoUrl ? (
                          <img
                            src={match.photoUrl}
                            alt={match.firstName}
                            className="w-24 h-24 rounded-2xl object-cover object-[center_20%] shadow-md"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-[#f0eadc] flex items-center justify-center text-3xl">
                            {match.gender === "female" ? "👩" : "👨"}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-xl font-black text-[#191265]">
                              {match.firstName}{match.lastName ? ` ${match.lastName}` : ""}
                            </h3>
                            <p className="text-[#727272] text-sm">
                              {match.age && match.age > 0 ? `${match.age} שנים` : '?'} • {match.city}
                            </p>
                          </div>
                          {match.personalityType && (
                            <span className="bg-[#f0eadc] text-[#191265] text-xs font-bold px-3 py-1 rounded-full">
                              {PERSONALITY_LABELS[match.personalityType] || match.personalityType}
                            </span>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {match.occupation && (
                            <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                              💼 {match.occupation}
                            </span>
                          )}
                          {match.education && EDUCATION_LABELS[match.education] && (
                            <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                              🎓 {EDUCATION_LABELS[match.education]}
                            </span>
                          )}
                          {match.religiosity && RELIGIOSITY_LABELS[match.religiosity] && (
                            <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                              ✡️ {RELIGIOSITY_LABELS[match.religiosity]}
                            </span>
                          )}
                          {match.wantsKids && WANTS_KIDS_LABELS[match.wantsKids] && (
                            <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                              👶 {WANTS_KIDS_LABELS[match.wantsKids]}
                            </span>
                          )}
                          {match.height && (
                            <span className="bg-[#191265]/10 text-[#191265] text-xs px-3 py-1 rounded-full">
                              📏 {match.height} ס"מ
                            </span>
                          )}
                        </div>

                        {match.about && (
                          <p className="text-[#727272] text-sm leading-relaxed line-clamp-2">
                            "{match.about}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Hilit's personal explanation */}
                    {match.matchAutoExplanation && (
                      <div className="mt-4 pt-4 border-t border-[#f0eadc]">
                        <p className="text-xs text-[#ffe27c] font-bold mb-1.5 flex items-center gap-1">
                          <span>💛</span> למה הילית חיברה ביניכם:
                        </p>
                        <p className="text-[#191265] text-sm leading-relaxed italic">
                          {match.matchAutoExplanation}
                        </p>
                      </div>
                    )}

                    {/* Interests */}
                    {match.interests && (
                      <div className="mt-4 pt-4 border-t border-[#f0eadc]">
                        <p className="text-xs text-[#727272] mb-2">תחומי עניין:</p>
                        <div className="flex flex-wrap gap-2">
                          {match.interests.split(",").map((interest: string) => (
                            <span key={interest} className="bg-[#ffe27c]/30 text-[#191265] text-xs px-3 py-1 rounded-full">
                              {interest.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact CTA */}
                    <div className="mt-5 pt-4 border-t border-[#f0eadc] flex items-center justify-between">
                      <p className="text-[#727272] text-sm">
                        הילית תיצור קשר ותתאם היכרות
                      </p>
                      <a
                        href="https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%AA%D7%90%D7%9E%D7%95%D7%AA%20%D7%A9%D7%A7%D7%99%D7%91%D7%9C%D7%AA%D7%99"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#25D366] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#20ba57] transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        צרי קשר עם הילית
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-10 bg-[#191265] rounded-3xl p-8 text-center text-white">
              <div className="text-4xl mb-4">💛</div>
              <h3 className="text-xl font-black mb-3">מה הלאה?</h3>
              <p className="text-white/75 mb-6 leading-relaxed">
                הילית תסקור את ההתאמות שלך ותיצור איתך קשר תוך 48 שעות
                כדי לתאם היכרות עם ההתאמה הטובה ביותר עבורך.
              </p>
              <a
                href="https://wa.me/972552442334?text=%D7%94%D7%99%D7%99%20%D7%94%D7%99%D7%9C%D7%99%D7%AA%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A0%D7%95%D7%A1%D7%A4%D7%99%D7%9D%20%D7%9C%D7%92%D7%91%D7%99%20%D7%94%D7%AA%D7%90%D7%9E%D7%95%D7%AA%20%D7%A9%D7%A7%D7%99%D7%91%D7%9C%D7%AA%D7%99"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#25D366] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#20ba57] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                שלחי הודעה להילית
              </a>
            </div>

            {/* Upsell CTA - 8-session coaching package */}
            <div className="mt-6 bg-gradient-to-br from-[#ffe27c] to-[#ffd84a] rounded-3xl p-8 text-right">
              <div className="flex items-start justify-between mb-4">
                <span className="bg-[#191265] text-white text-xs font-bold px-3 py-1.5 rounded-full">💎 שדרוג מומלץ</span>
                <div className="text-3xl">🌟</div>
              </div>
              <h3 className="text-[#191265] font-black text-xl mb-2">
                רוצה ליווי אישי עמוק?
              </h3>
              <p className="text-[#191265]/80 text-sm leading-relaxed mb-4">
                מעבר למאגר, הילית מציעה תהליך ליווי אישי של 8 פגישות - שבו אנחנו עובדות יחד על הדפוסים שלך,
                בונות את הפרופיל הנכון, ומוצאות את הדרך שלך לזוגיות.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#191265] font-black text-2xl">₪2,900</div>
                  <div className="text-[#191265]/60 text-xs">8 פגישות ליווי אישי + כניסה למאגר (שווי ₪249) כלולה</div>
                </div>
                <a
                  href="https://calendly.com/hilitcaspi/meet-with-me"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track({ eventType: "calendly_click", page: "/matches" })}
                  className="bg-[#191265] text-white font-black px-6 py-3 rounded-2xl hover:bg-[#1800ad] transition-colors text-sm"
                >
                  ♡ קביעת שיחת היכרות
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
