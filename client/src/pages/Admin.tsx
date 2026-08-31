import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, ExternalLink, FileImage, LoaderCircle, LockKeyhole, RefreshCw, ShieldAlert } from "lucide-react";

const statusLabels = {
  new: "חדשה",
  reviewing: "בבדיקה",
  approved: "אושרה",
  rejected: "לא אושרה",
} as const;

const relationshipStatusLabels = {
  single: "רווק/ה",
  divorced: "גרוש/ה",
  widowed: "אלמן/ה",
  separated: "פרוד/ה",
  other: "אחר",
} as const;

const csvEscape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const isOwner = isAuthenticated && user?.role === "admin";
  const applications = trpc.applications.list.useQuery(undefined, { enabled: isOwner });
  const exportRows = trpc.applications.exportRows.useQuery(undefined, { enabled: false });
  const applicationList = applications.data ?? [];
  const updateStatus = trpc.applications.updateReviewStatus.useMutation({
    onSuccess: () => utils.applications.list.invalidate(),
  });

  const exportApplications = async () => {
    const response = await exportRows.refetch();
    if (!response.data?.length) return;
    const rows = [
      ["מזהה", "שם מלא", "גיל", "עיר/אזור", "טלפון", "סטטוס זוגי", "ילדים", "תוצאת DNA", "אינסטגרם", "על עצמי", "מה מחפש/ת", "סטטוס בדיקה", "נשלח בתאריך", "תמונה"],
      ...response.data.map(item => [
        item.id,
        item.fullName,
        item.age,
        item.city,
        item.phone,
        relationshipStatusLabels[item.relationshipStatus],
        item.hasChildren ? "כן" : "לא",
        item.dnaResult,
        `@${item.instagramUsername}`,
        item.selfDescription,
        item.desiredPartner,
        statusLabels[item.reviewStatus],
        new Date(item.submittedAt).toLocaleString("he-IL"),
        item.photoAttached ? "כן — נשמרה במערכת" : "לא",
      ]),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(csvEscape).join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `single-of-week-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-[#914e60]" /></div>;
  }

  if (!isAuthenticated) {
    return <DashboardLayout><div /></DashboardLayout>;
  }

  if (!isOwner) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#fcf8f5] p-6">
        <div className="max-w-md rounded-3xl border border-[#eaded7] bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-[#a85868]" />
          <h1 className="font-serif mt-4 text-3xl font-semibold">הגישה מוגבלת</h1>
          <p className="mt-3 leading-7 text-[#76635e]">עמוד זה זמין לבעלת האתר בלבד.</p>
        </div>
      </main>
    );
  }

  return (
    <DashboardLayout>
      <div dir="rtl" className="mx-auto max-w-7xl space-y-7 p-1 text-right">
        <header className="flex flex-col justify-between gap-4 border-b border-[#eaded7] pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold tracking-[0.14em] text-[#9a5868]">ניהול פרטי</p>
            <h1 className="font-serif mt-1 text-4xl font-semibold text-[#392927]">פניות לרווק/ת השבוע</h1>
            <p className="mt-2 text-[#75625c]">פרטים ותמונות מופיעים כאן לבעלת האתר בלבד.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => applications.refetch()} disabled={applications.isFetching}>
              <RefreshCw className={`ml-2 h-4 w-4 ${applications.isFetching ? "animate-spin" : ""}`} />רענון
            </Button>
            <Button onClick={exportApplications} disabled={!applicationList.length || exportRows.isFetching}>
              <Download className="ml-2 h-4 w-4" />ייצוא CSV
            </Button>
          </div>
        </header>

        {applications.isLoading ? (
          <div className="flex justify-center py-20"><LoaderCircle className="h-7 w-7 animate-spin text-[#914e60]" /></div>
        ) : applications.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">לא ניתן לטעון את הפניות כעת. נסי לרענן את העמוד.</div>
        ) : applicationList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#ddc9c3] bg-[#fffdfa] px-6 py-16 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-[#ad7781]" />
            <h2 className="font-serif mt-4 text-2xl">עדיין אין פניות</h2>
            <p className="mt-2 text-[#796762]">הפניות שיוגשו בטופס יוצגו כאן באופן פרטי.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {applicationList.map(item => (
              <article key={item.id} className="overflow-hidden rounded-3xl border border-[#eaded7] bg-white shadow-[0_8px_24px_rgba(73,49,42,0.06)]">
                <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                  <a href={item.photoUrl} target="_blank" rel="noreferrer" className="group relative block min-h-44 bg-[#f5eae8]">
                    <img src={item.photoUrl} alt={`תמונה של ${item.fullName}`} className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-x-3 bottom-3 inline-flex items-center justify-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100"><ExternalLink className="h-3 w-3" />פתיחת תמונה</span>
                  </a>
                  <div className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-3xl font-semibold text-[#3d2d29]">{item.fullName}</h2><Badge variant="outline" className="border-[#d9c1c5] bg-[#fff7f8] text-[#8c4e5e]">{statusLabels[item.reviewStatus]}</Badge></div>
                        <p className="mt-1 text-sm text-[#7c6861]">{item.age} · {item.city} · {relationshipStatusLabels[item.relationshipStatus]} · {item.hasChildren ? "עם ילדים" : "ללא ילדים"}</p>
                      </div>
                      <p className="text-xs text-[#9a8580]">נשלח: {new Date(item.submittedAt).toLocaleString("he-IL")}</p>
                    </div>
                      <div className="mt-5 grid gap-4 text-sm leading-6 lg:grid-cols-2">
                        <div><p className="font-bold text-[#674944]">עליי</p><p className="mt-1 whitespace-pre-wrap text-[#61504a]">{item.selfDescription}</p></div>
                        <div><p className="font-bold text-[#674944]">מה חשוב לי להכיר</p><p className="mt-1 whitespace-pre-wrap text-[#61504a]">{item.desiredPartner}</p></div>
                      </div>
                      {item.dnaResult && <p className="mt-4 rounded-xl bg-[#f7f0ec] px-3 py-2 text-sm text-[#674944]"><span className="font-bold">תוצאת DNA:</span> {item.dnaResult}</p>}
                    <div className="mt-5 flex flex-col gap-3 border-t border-[#f0e7e1] pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#745d57]">
                        <a href={`https://instagram.com/${item.instagramUsername}`} target="_blank" rel="noreferrer" className="text-[#914e60] underline underline-offset-4">@{item.instagramUsername}</a>
                        <a href={`tel:${item.phone}`} dir="ltr" className="underline underline-offset-4">{item.phone}</a>
                        <span className="inline-flex items-center gap-1"><FileImage className="h-4 w-4" />{item.photoFilename}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map(status => (
                          <Button key={status} type="button" variant={item.reviewStatus === status ? "default" : "outline"} size="sm" onClick={() => updateStatus.mutate({ id: item.id, reviewStatus: status })} disabled={updateStatus.isPending}>{statusLabels[status]}</Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
