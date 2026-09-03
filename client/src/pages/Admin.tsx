/**
 * Admin Panel - Hilit's management dashboard
 * Shows stats, all singles, leads, quiz results
 * Protected: admin role required
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Tab = "stats" | "singles" | "leads" | "quiz";

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "תיכון", vocational: "הכשרה מקצועית", technician: "הנדסאי", student: "סטודנט/ית", bachelor: "תואר א'", master: "תואר ב'", phd: "דוקטורט", other: "אחר",
};
const RELIGIOSITY_LABELS: Record<string, string> = {
  secular: "חילוני", traditional: "מסורתי", religious: "דתי", orthodox: "חרדי",
};
const PERSONALITY_LABELS: Record<string, string> = {
  connector: "מחבר/ת", achiever: "משיג/ה", nurturer: "מטפח/ת", adventurer: "הרפתקן/ית",
};

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: singles } = trpc.admin.getAllSingles.useQuery(undefined, { enabled: tab === "singles" && user?.role === "admin" });
  const { data: leads } = trpc.admin.getAllLeads.useQuery(undefined, { enabled: tab === "leads" && user?.role === "admin" });
  const { data: quizResults } = trpc.admin.getAllQuizResults.useQuery(undefined, { enabled: tab === "quiz" && user?.role === "admin" });

  const toggleActive = trpc.admin.toggleActive.useMutation({
    onSuccess: () => { window.location.reload(); },
  });

  const [followUpTestStatus, setFollowUpTestStatus] = useState<string | null>(null);

  const sendTestFollowUpMutation = trpc.emails.sendTestFollowUp.useMutation({
    onSuccess: () => {
      setFollowUpTestStatus('✅ מייל הפידבק נשלח ל-hilitcaspi@gmail.com');
    },
    onError: (err) => {
      setFollowUpTestStatus(`❌ שגיאה: ${err.message}`);
    },
  });

  const resendQuestionnaireMutation = trpc.admin.resendPendingQuestionnaireEmails.useMutation({
    onSuccess: (data) => {
      setResendStatus(`✅ נשלחו ${data.sent} מיילים (${data.failed} נכשלו) מתוך ${data.total} ממתינים`);
    },
    onError: (err) => {
      setResendStatus(`❌ שגיאה: ${err.message}`);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center">
        <div className="text-[#191265] font-bold text-xl">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-black text-[#191265] mb-4">נדרשת כניסה</h2>
          <a href={getLoginUrl()} className="bg-[#191265] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#1800ad] transition-colors">
            כניסה למערכת
          </a>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center font-rubik" dir="rtl">
        <div className="text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h2 className="text-2xl font-black text-[#191265] mb-2">אין הרשאה</h2>
          <p className="text-[#727272]">רק מנהלים יכולים לגשת לדף זה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0eadc] font-rubik" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] py-4 px-6 flex items-center justify-between">
        <a href="/" className="text-white/70 hover:text-white text-sm transition-colors">← חזרה לאתר</a>
        <span className="text-white font-bold">לוח ניהול - הילית כספי</span>
        <span className="text-white/60 text-sm">שלום, {user.name}</span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#e9e8e8] px-6">
        <div className="max-w-6xl mx-auto flex gap-1 overflow-x-auto">
          {[
            { id: "stats", label: "📊 סטטיסטיקות" },
            { id: "singles", label: "💎 רווקים/ות" },
            { id: "leads", label: "📧 לידים" },
            { id: "quiz", label: "🎯 שאלונים" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id as Tab)}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === id ? "border-[#191265] text-[#191265]" : "border-transparent text-[#727272] hover:text-[#191265]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── STATS ── */}
        {tab === "stats" && stats && (
          <div>
            <h2 className="text-2xl font-black text-[#191265] mb-6">סטטיסטיקות כלליות</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "סה\"כ רווקים/ות", value: stats.totalSingles, icon: "💎", color: "bg-[#191265]" },
                { label: "רשומים בתשלום", value: stats.paidRegistrations, icon: "💰", color: "bg-green-600" },
                { label: "לידים", value: stats.totalLeads, icon: "📧", color: "bg-blue-600" },
                { label: "שאלונים", value: stats.totalQuizResults, icon: "🎯", color: "bg-purple-600" },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className={`${color} text-white rounded-2xl p-6 text-center`}>
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-3xl font-black mb-1">{value}</div>
                  <div className="text-white/75 text-sm">{label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[#191265] mb-4">מידע למנהל</h3>
              <div className="space-y-3 text-sm text-[#727272]">
                <p>• לחצי על "רווקים/ות" כדי לראות את כל הפרופילים ולהפעיל/לכבות אותם</p>
                <p>• לחצי על "לידים" כדי לראות את כל מי שהשאיר פרטים למדריך החינמי</p>
                <p>• לחצי על "שאלונים" כדי לראות את תוצאות השאלון של כולם</p>
                <p>• פרופילים עם isSeed=true הם הפרופילים הפיקטיביים שנוצרו לצורך הדגמה</p>
              </div>
            </div>

            {/* Resend questionnaire emails to pending singles */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mt-4 border-2 border-orange-200">
              <h3 className="font-bold text-[#191265] mb-2">🔧 תיקון: שלח שאלון לממתינים</h3>
              <p className="text-sm text-[#727272] mb-4">
                שלח מחדש מייל עם קישור לשאלון המדעי לכל מי שנרשם אך טרם קיבל/מילא את השאלון.
                פעולה זו בטוחה - ניתן להריץ אותה מספר פעמים.
              </p>
              {resendStatus && (
                <div className={`text-sm font-medium mb-4 p-3 rounded-xl ${resendStatus.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {resendStatus}
                </div>
              )}
              <button
                onClick={() => {
                  setResendStatus(null);
                  resendQuestionnaireMutation.mutate({ origin: window.location.origin });
                }}
                disabled={resendQuestionnaireMutation.isPending}
                className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {resendQuestionnaireMutation.isPending ? "שולח..." : "📧 שלח שאלון לכל הממתינים"}
              </button>
            </div>

            {/* Test follow-up email */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mt-4 border-2 border-blue-200">
              <h3 className="font-bold text-[#191265] mb-2">📬 בדיקת מייל פידבק (שבוע אחרי התאמה)</h3>
              <p className="text-sm text-[#727272] mb-4">
                שלח לעצמך דוגמה של המייל שנשלח אוטומטית שבוע אחרי הצעת התאמה למי שלא הגיב.
                המייל כולל כפתורי כן/לא ושאלת פידבק אחת.
              </p>
              {followUpTestStatus && (
                <div className={`text-sm font-medium mb-4 p-3 rounded-xl ${followUpTestStatus.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {followUpTestStatus}
                </div>
              )}
              <button
                onClick={() => {
                  setFollowUpTestStatus(null);
                  sendTestFollowUpMutation.mutate();
                }}
                disabled={sendTestFollowUpMutation.isPending}
                className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sendTestFollowUpMutation.isPending ? "שולח..." : "📬 שלח מייל פידבק לדוגמה"}
              </button>
            </div>
          </div>
        )}

        {/* ── SINGLES ── */}
        {tab === "singles" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-[#191265]">
                רווקים/ות במאגר {singles ? `(${singles.length})` : ""}
              </h2>
            </div>

            {!singles && (
              <div className="text-center py-10 text-[#727272]">טוען...</div>
            )}

            {singles && (
              <div className="space-y-3">
                {singles.map((s: any) => (
                  <div key={s.id} className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 ${!s.isActive ? "opacity-50" : ""}`}>
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.firstName} className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[#f0eadc] flex items-center justify-center text-2xl">
                          {s.gender === "female" ? "👩" : "👨"}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#191265]">{s.firstName} {s.lastName || ""}</span>
                        <span className="text-[#727272] text-sm">{s.age && s.age > 0 ? `${s.age} שנים` : '?'}</span>
                        <span className="text-[#727272] text-sm">•</span>
                        <span className="text-[#727272] text-sm">{s.city}</span>
                        {s.isSeed && (
                          <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">פיקטיבי</span>
                        )}
                        {s.isPaid && !s.isSeed && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">שילם/ה</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.occupation && <span className="text-xs text-[#727272] bg-[#f0eadc] px-2 py-0.5 rounded">{s.occupation}</span>}
                        {s.education && EDUCATION_LABELS[s.education] && <span className="text-xs text-[#727272] bg-[#f0eadc] px-2 py-0.5 rounded">{EDUCATION_LABELS[s.education]}</span>}
                        {s.religiosity && RELIGIOSITY_LABELS[s.religiosity] && <span className="text-xs text-[#727272] bg-[#f0eadc] px-2 py-0.5 rounded">{RELIGIOSITY_LABELS[s.religiosity]}</span>}
                        {s.personalityType && PERSONALITY_LABELS[s.personalityType] && <span className="text-xs text-[#191265] bg-[#ffe27c]/30 px-2 py-0.5 rounded">{PERSONALITY_LABELS[s.personalityType]}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {s.isActive ? "פעיל" : "לא פעיל"}
                      </span>
                      <button
                        onClick={() => toggleActive.mutate({ id: s.id, isActive: !s.isActive })}
                        className="text-xs bg-[#f0eadc] text-[#191265] px-3 py-1.5 rounded-lg hover:bg-[#e9e8e8] transition-colors font-medium"
                      >
                        {s.isActive ? "השבת" : "הפעל"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LEADS ── */}
        {tab === "leads" && (
          <div>
            <h2 className="text-2xl font-black text-[#191265] mb-6">
              לידים {leads ? `(${leads.length})` : ""}
            </h2>

            {!leads && <div className="text-center py-10 text-[#727272]">טוען...</div>}

            {leads && leads.length === 0 && (
              <div className="text-center py-10 text-[#727272]">אין לידים עדיין</div>
            )}

            {leads && leads.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-[#f0eadc]">
                    <tr>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">שם</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">מייל</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">מקור</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead: any) => (
                      <tr key={lead.id} className="border-t border-[#f0eadc] hover:bg-[#f0eadc]/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-[#191265] font-medium">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-[#727272]">
                          <a href={`mailto:${lead.email}`} className="hover:text-[#191265] transition-colors">{lead.email}</a>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#727272]">{lead.source || "-"}</td>
                        <td className="px-4 py-3 text-sm text-[#727272]">
                          {new Date(lead.createdAt).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── QUIZ RESULTS ── */}
        {tab === "quiz" && (
          <div>
            <h2 className="text-2xl font-black text-[#191265] mb-6">
              תוצאות שאלון {quizResults ? `(${quizResults.length})` : ""}
            </h2>

            {!quizResults && <div className="text-center py-10 text-[#727272]">טוען...</div>}

            {quizResults && quizResults.length === 0 && (
              <div className="text-center py-10 text-[#727272]">אין תוצאות שאלון עדיין</div>
            )}

            {quizResults && quizResults.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-right">
                  <thead className="bg-[#f0eadc]">
                    <tr>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">שם</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">מייל</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">סוג אישיות</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">תואם עם</th>
                      <th className="px-4 py-3 text-sm font-bold text-[#191265]">תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizResults.map((r: any) => (
                      <tr key={r.id} className="border-t border-[#f0eadc] hover:bg-[#f0eadc]/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-[#191265] font-medium">{r.name || "אנונימי"}</td>
                        <td className="px-4 py-3 text-sm text-[#727272]">
                          {r.email ? (
                            <a href={`mailto:${r.email}`} className="hover:text-[#191265] transition-colors">{r.email}</a>
                          ) : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-[#ffe27c]/30 text-[#191265] px-2 py-1 rounded-full text-xs font-medium">
                            {PERSONALITY_LABELS[r.personalityType] || r.personalityType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="bg-[#191265]/10 text-[#191265] px-2 py-1 rounded-full text-xs font-medium">
                            {PERSONALITY_LABELS[r.compatibleType] || r.compatibleType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#727272]">
                          {new Date(r.createdAt).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
