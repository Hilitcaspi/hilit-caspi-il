/**
 * Email Preview Page - /crm/emails
 * Shows all journeys with rendered HTML preview and test send button
 * Supports variable-length sequences (3 emails for standard, 6 for v2)
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Send, Eye, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";

type EmailItem = {
  index: number;
  subject: string;
  htmlBody: string;
  textBody: string;
  timing: string;
};

type Journey = {
  key: string;
  label: string;
  gender: string;
  emails: EmailItem[];
};

// Colors for up to 6 emails
const TIMING_COLORS = [
  "bg-green-100 text-green-800",
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-orange-100 text-orange-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];

function EmailCard({
  email,
  journeyKey,
  journeyLabel,
}: {
  email: EmailItem;
  journeyKey: string;
  journeyLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHtml, setShowHtml] = useState(true);
  const sendTest = trpc.emails.sendTest.useMutation({
    onSuccess: () => {
      toast.success("מייל בדיקה נשלח! ✅ בדקי את תיבת המייל של hilitcaspi@gmail.com");
    },
    onError: (err) => {
      toast.error(`שגיאה בשליחה: ${err.message}`);
    },
  });

  const emailLabel = `מייל ${email.index + 1}`;
  const colorClass = TIMING_COLORS[email.index] ?? "bg-gray-100 text-gray-800";

  return (
    <div className="border border-[#e9e8e8] rounded-xl overflow-hidden bg-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#f9f7f3]">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${colorClass}`}>
            {emailLabel}
          </span>
          <span className="text-xs text-[#727272] bg-white border border-[#e9e8e8] px-2 py-1 rounded-full">
            {email.timing}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => sendTest.mutate({ journeyKey, emailIndex: email.index })}
            disabled={sendTest.isPending}
            className="text-xs border-[#191265] text-[#191265] hover:bg-[#191265] hover:text-white"
          >
            {sendTest.isPending ? (
              <Loader2 className="w-3 h-3 ml-1 animate-spin" />
            ) : (
              <Send className="w-3 h-3 ml-1" />
            )}
            שלחי מייל בדיקה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#727272]"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? "סגרי" : "הצגי"}
          </Button>
        </div>
      </div>

      {/* Subject */}
      <div className="px-4 py-3 border-b border-[#f0eadc]">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#727272] flex-shrink-0" />
          <span className="text-sm font-semibold text-[#191265]">{email.subject}</span>
        </div>
      </div>

      {/* Expanded preview */}
      {expanded && (
        <div>
          {/* Toggle HTML/Text */}
          <div className="flex gap-2 px-4 pt-3">
            <button
              onClick={() => setShowHtml(true)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${showHtml ? "bg-[#191265] text-white" : "bg-[#f0eadc] text-[#727272]"}`}
            >
              <Eye className="w-3 h-3 inline ml-1" />
              תצוגה מלאה
            </button>
            <button
              onClick={() => setShowHtml(false)}
              className={`text-xs px-3 py-1 rounded-full transition-all ${!showHtml ? "bg-[#191265] text-white" : "bg-[#f0eadc] text-[#727272]"}`}
            >
              טקסט בלבד
            </button>
          </div>

          {showHtml ? (
            <div className="m-4 border border-[#e9e8e8] rounded-lg overflow-hidden" style={{ height: "500px" }}>
              <iframe
                srcDoc={email.htmlBody}
                style={{ width: "100%", height: "100%", border: "none" }}
                title={`${journeyLabel} - מייל ${email.index + 1}`}
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="m-4 p-4 bg-[#f9f7f3] rounded-lg">
              <pre className="text-xs text-[#444] whitespace-pre-wrap font-sans leading-relaxed">
                {email.textBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function JourneySection({ journey }: { journey: Journey }) {
  const [open, setOpen] = useState(false);
  const emailCount = journey.emails.length;
  const genderIcon = journey.gender === "נשים" ? "♀" : journey.gender === "גברים" ? "♂" : "📣";

  return (
    <div className="border border-[#e9e8e8] rounded-2xl overflow-hidden bg-white shadow-sm" dir="rtl">
      {/* Journey header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-[#f9f7f3] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#191265] flex items-center justify-center text-white text-sm font-bold">
            {genderIcon}
          </div>
          <div className="text-right">
            <div className="font-bold text-[#191265] text-base">{journey.label}</div>
            <div className="text-xs text-[#727272]">{emailCount} מיילים · אוטומטי</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-[#ffe27c] text-[#191265] bg-[#ffe27c]/10">
            {journey.gender}
          </Badge>
          {emailCount === 6 && (
            <Badge className="text-xs bg-purple-100 text-purple-700 border-0">V2</Badge>
          )}
          {open ? (
            <ChevronUp className="w-5 h-5 text-[#727272]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#727272]" />
          )}
        </div>
      </button>

      {/* Emails */}
      {open && (
        <div className="border-t border-[#f0eadc] p-4 space-y-3 bg-[#fdfcfa]">
          {journey.emails.map((email) => (
            <EmailCard
              key={email.index}
              email={email}
              journeyKey={journey.key}
              journeyLabel={journey.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function EmailPreview() {
  const { user, loading } = useAuth();
  const { data: journeys, isLoading } = trpc.emails.getAll.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#191265]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#191265] mb-4">נדרשת כניסה</h2>
          <a href={getLoginUrl()} className="bg-[#191265] text-white px-6 py-3 rounded-xl font-bold">
            כניסה עם Manus
          </a>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#f0eadc] flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#191265] mb-2">אין הרשאה</h2>
          <p className="text-[#727272]">דף זה מיועד למנהל בלבד</p>
        </div>
      </div>
    );
  }

  const totalEmails = journeys?.reduce((sum, j) => sum + j.emails.length, 0) ?? 0;

  // Group by gender
  const womenJourneys = journeys?.filter((j) => j.gender === "נשים") ?? [];
  const menJourneys = journeys?.filter((j) => j.gender === "גברים") ?? [];
  const generalJourneys = journeys?.filter((j) => j.gender === "כלל") ?? [];

  return (
    <div className="min-h-screen bg-[#f0eadc]" dir="rtl">
      {/* Header */}
      <div className="bg-[#191265] text-white px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">📧 תצוגת מיילים</h1>
            <p className="text-white/60 text-sm mt-1">{journeys?.length ?? 0} מסעות · {totalEmails} מיילים · כולם אוטומטיים</p>
          </div>
          <Link href="/crm">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 bg-transparent">
              <ArrowRight className="w-4 h-4 ml-2" />
              חזרה ל-CRM
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#191265]" />
          </div>
        ) : (
          <>
            {/* Info banner */}
            <div className="bg-[#191265]/10 border border-[#191265]/20 rounded-xl p-4 text-sm text-[#191265]">
              <strong>איך זה עובד:</strong> מסעות רגילים מכילים 3 מיילים. מסעות V2 מכילים 6 מיילים.
              לחצי "שלחי מייל בדיקה" כדי לקבל את המייל לתיבת הדואר שלך ולוודא שהכל נראה טוב.
            </div>

            {/* Women journeys */}
            <div>
              <h2 className="text-lg font-bold text-[#191265] mb-4 flex items-center gap-2">
                <span className="text-2xl">♀</span> מסעות לנשים
              </h2>
              <div className="space-y-3">
                {womenJourneys.map((journey) => (
                  <JourneySection key={journey.key} journey={journey} />
                ))}
              </div>
            </div>

            {/* Men journeys */}
            <div>
              <h2 className="text-lg font-bold text-[#191265] mb-4 flex items-center gap-2">
                <span className="text-2xl">♂</span> מסעות לגברים
              </h2>
              <div className="space-y-3">
                {menJourneys.map((journey) => (
                  <JourneySection key={journey.key} journey={journey} />
                ))}
              </div>
            </div>

            {/* General journeys (Meta, abandoned cart, etc.) */}
            {generalJourneys.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-[#191265] mb-4 flex items-center gap-2">
                  <span className="text-2xl">📣</span> מסעות כלליים (Meta, נטישת עגלה, קורס)
                </h2>
                <div className="space-y-3">
                  {generalJourneys.map((journey) => (
                    <JourneySection key={journey.key} journey={journey} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
