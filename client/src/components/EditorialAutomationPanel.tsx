import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";

/** Mount inside the authenticated CRM; no generated prose or schedule/model credentials. */
export default function EditorialAutomationPanel() {
  const utils = trpc.useUtils();
  const status = trpc.editorialAutomation.status.useQuery(undefined, { retry: false });
  const pause = trpc.editorialAutomation.setPaused.useMutation({
    onSuccess: () => { void utils.editorialAutomation.status.invalidate(); toast.success("הגדרת הפרסום עודכנה"); },
    onError: () => toast.error("לא ניתן לעדכן את הפרסום כרגע. נסו שוב."),
  });
  const data = status.data;
  const last = data?.runs[0];
  const stateText = data?.state === "active" ? "פעיל" : data?.state === "paused" ? "מושהה" : "ממתין לפרסום ולקישור תזמון";
  const disposition = last?.status === "published" ? "פורסם באתר" : last?.status === "draft" ? "נשמר כטיוטה לבדיקה אנושית"
    : last?.status === "failed" ? "לא נוצר מאמר — נדרשת בדיקה" : "העיבוד התחיל; אם אינו מסתיים, נדרשת בדיקה";
  return (
    <Card dir="rtl" className="border-violet-100 bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base text-[#191265]">פרסום מאמרים באתר</CardTitle>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-[#191265]" aria-live="polite">
            {status.isLoading ? "בודק הגדרה…" : status.isError ? "המצב אינו זמין" : stateText}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {status.isError ? (
          <div role="alert" className="flex items-center justify-between gap-3">
            <p>לא ניתן לקרוא את מצב האוטומציה. לא בוצעה הפעלה.</p>
            <Button variant="outline" size="sm" onClick={() => void status.refetch()}>נסו שוב</Button>
          </div>
        ) : data && (
          <>
            <p className="text-muted-foreground">התזמון המוצע: {data.cadenceLabel}. מופעל רק לאחר אישור, פרסום הגרסה וקישור התזמון.</p>
            {!data.configured && <p className="font-medium text-[#191265]">לא הופעל: יש לפרסם את הגרסה ואז לקשור תזמון.</p>}
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="editorial-enabled" className="cursor-pointer">פרסום אוטומטי באתר</label>
              <Switch id="editorial-enabled" checked={data.enabled} disabled={!data.configured || pause.isPending}
                aria-label="פרסום אוטומטי באתר" onCheckedChange={enabled => pause.mutate({ paused: !enabled })} />
            </div>
            <p className="text-xs text-muted-foreground">מאמרים בלבד, עם בדיקת איכות וביקורת בטיחות. אין פרסום ברשתות חיצוניות או שליחת הודעות ללקוחות. השהיה חוסמת פרסום גם אם טריגר כבר התקבל.</p>
            {last ? (
              <div className="rounded-lg border border-border px-3 py-2" aria-live="polite">
                <p className="font-medium">הריצה האחרונה: {disposition}</p>
                <p className="mt-1 text-xs text-muted-foreground">חלון הפרסום: <bdi>{last.slotKey}</bdi> · עודכן {new Date(last.updatedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}</p>
                {last.status !== "published" && last.codes.length > 0 && <p className="mt-1 text-xs text-muted-foreground">הפרסום נחסם בבקרה. פרטי הבדיקה זמינים לצוות בלבד.</p>}
                {last.status === "draft" && last.articleId && <Link href="/crm/blog" className="mt-2 inline-block text-xs font-medium text-[#191265] underline">לבדיקת הטיוטה בניהול הבלוג</Link>}
              </div>
            ) : <p className="text-xs text-muted-foreground">עדיין אין ריצות. לא נוצר מאמר מתוזמן.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
