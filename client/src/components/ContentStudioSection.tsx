import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Archive, Check, Clipboard, Download, ExternalLink, FileText, Globe2, Loader2, PencilLine, Plus, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const documentTypes = [
  { value: "landing_page", label: "דף נחיתה" },
  { value: "story", label: "Story" },
  { value: "ad_copy", label: "קופי למודעה" },
  { value: "email", label: "מייל" },
  { value: "course", label: "תוכן לקורס" },
] as const;
const designTemplates = [
  { value: "signature_dark", label: "סגול חתימה" },
  { value: "editorial_cream", label: "קרם מערכתי" },
  { value: "warm_brown", label: "חום חם" },
] as const;

function documentType(item: any) { return item?.kind ?? item?.documentType ?? item?.type ?? ""; }
function documentTitle(item: any) { return item?.title || item?.content?.title || "טיוטה ללא כותרת"; }
function documentId(item: any) { return item?.id ?? item?.draftId; }
function documentStatus(item: any) { return item?.status ?? "draft"; }
function documentContent(item: any) { return item?.content && typeof item.content === "object" ? item.content : {}; }
function contentAsText(content: any): string {
  if (!content || typeof content !== "object") return "";
  const parts: string[] = [content.title, content.subtitle, content.subject, content.preheader, content.body, content.promise].filter((part): part is string => typeof part === "string");
  for (const section of content.sections || []) parts.push(section.heading, section.body, ...(section.bullets || []));
  for (const slide of content.slides || []) parts.push(slide.title, slide.body, slide.cta);
  for (const variant of content.variants || []) parts.push(variant.headline, variant.primaryText, variant.description, variant.cta);
  for (const module of content.modules || []) parts.push(module.title, module.summary);
  for (const lesson of content.lessons || []) parts.push(lesson.moduleTitle, lesson.title, lesson.summary, lesson.exercise);
  for (const exercise of content.workbook?.exercises || []) parts.push(exercise);
  return parts.filter((part): part is string => typeof part === "string" && Boolean(part.trim())).join("\n\n");
}
function safeFilename(value: string) { return (value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "match-by-hilit-story").slice(0, 70); }

export default function ContentStudioSection() {
  const api = trpc as any;
  const [type, setType] = useState<(typeof documentTypes)[number]["value"]>("landing_page");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [templateKey, setTemplateKey] = useState<(typeof designTemplates)[number]["value"]>("signature_dark");
  const [selected, setSelected] = useState<any>(null);
  const [slug, setSlug] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const list = api.contentStudio.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const generate = api.contentStudio.generate.useMutation({ onSuccess: (created: any) => { setSelected(created); setTitle(""); setBrief(""); list.refetch(); } });
  const archive = api.contentStudio.archive.useMutation({ onSuccess: () => { setSelected(null); list.refetch(); } });
  const publish = api.contentStudio.publishLandingPage.useMutation({ onSuccess: (result: any) => { setSelected(result); setSlug(result?.slug || slug); list.refetch(); } });
  const unpublish = api.contentStudio.unpublish.useMutation({ onSuccess: () => { setSelected((current: any) => current ? { ...current, status: "draft" } : current); list.refetch(); } });
  const drafts = useMemo(() => Array.isArray(list.data) ? list.data : list.data?.items ?? [], [list.data]);
  const currentKind = documentType(selected);
  const currentId = documentId(selected);
  const isLanding = currentKind === "landing_page";
  const publicLink = selected?.slug ? `/pages/${selected.slug}` : "";
  const create = () => { if (title.trim() && brief.trim() && !generate.isPending) generate.mutate({ kind: type, title: title.trim(), brief: brief.trim(), templateKey }); };
  const copy = async () => { const text = contentAsText(documentContent(selected)); if (!text) return; try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* Browser clipboard permission is handled by the browser. */ } };
  const doPublish = () => { if (currentId && slug.trim() && confirmed && !publish.isPending) publish.mutate({ id: currentId, slug: slug.trim().toLowerCase(), confirmation: true }); };

  return <div dir="rtl" className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
    <Card className="h-fit border-[#191265]/10 shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-xl text-[#191265]"><PencilLine className="size-5" />סטודיו יצירה</CardTitle><CardDescription>יוצרים טיוטה פנימית, בודקים ומעתיקים. פרסום ציבורי אפשרי רק לדף נחיתה ובאישור מפורש.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="document-type">סוג מסמך</Label><Select value={type} onValueChange={(value: any) => setType(value)}><SelectTrigger id="document-type" className="border-[#191265]/20"><SelectValue /></SelectTrigger><SelectContent>{documentTypes.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="design-template">נראות</Label><Select value={templateKey} onValueChange={(value: any) => setTemplateKey(value)}><SelectTrigger id="design-template" className="border-[#191265]/20"><SelectValue /></SelectTrigger><SelectContent>{designTemplates.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="document-title">כותרת</Label><Input id="document-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="כותרת ברורה למסמך" className="border-[#191265]/20 focus-visible:ring-[#ffe27c]" /></div><div className="space-y-2"><Label htmlFor="document-brief">בריף</Label><Textarea id="document-brief" value={brief} onChange={event => setBrief(event.target.value)} placeholder="למי התוכן מיועד, מה המסר ואיזו פעולה רוצים לעודד?" className="min-h-32 border-[#191265]/20 focus-visible:ring-[#ffe27c]" /></div><Button type="button" onClick={create} disabled={!title.trim() || !brief.trim() || generate.isPending} className="w-full bg-[#191265] text-white hover:bg-[#191265]/90">{generate.isPending ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Plus className="ml-1 size-4" />}יצירת טיוטה</Button>{generate.error && <p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-800">{generate.error.message || "לא ניתן ליצור טיוטה כרגע."}</p>}</CardContent></Card>

    <div className="space-y-5"><Card className="border-[#191265]/10 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-lg text-[#191265]">טיוטות</CardTitle><CardDescription>טיוטות נשמרות פנימית עד לבחירה מפורשת בפעולה.</CardDescription></CardHeader><CardContent>{list.isLoading ? <p className="text-sm text-slate-500">טוענים טיוטות…</p> : list.error ? <p className="text-sm text-slate-500">לא ניתן לטעון את הטיוטות כרגע.</p> : drafts.length === 0 ? <p className="rounded-xl bg-[#191265]/[0.03] p-4 text-sm text-slate-500">עדיין אין טיוטות. התחילי מהטופס.</p> : <div className="grid gap-2 md:grid-cols-2">{drafts.map((draft: any) => <button key={documentId(draft) || documentTitle(draft)} type="button" onClick={() => { setSelected(draft); setSlug(draft.slug || ""); setConfirmed(false); }} className={`rounded-xl border p-3 text-right transition ${documentId(selected) === documentId(draft) ? "border-[#191265] bg-[#191265]/[0.04]" : "border-[#191265]/10 hover:border-[#191265]/30"}`}><div className="flex items-start justify-between gap-2"><span className="line-clamp-1 font-bold text-[#191265]">{documentTitle(draft)}</span><Badge variant="outline" className="shrink-0 border-[#191265]/20 text-[#191265]">{documentTypes.find(item => item.value === documentType(draft))?.label || documentType(draft)}</Badge></div><span className="mt-2 block text-xs text-slate-500">{documentStatus(draft) === "published" ? "פורסם" : documentStatus(draft) === "archived" ? "בארכיון" : "טיוטה"}</span></button>)}</div>}</CardContent></Card>
      <ContentPreview selected={selected} onCopy={copy} copied={copied} onArchive={() => currentId && archive.mutate({ id: currentId })} archiving={archive.isPending} />
      {selected && isLanding && <Card className="border-[#ffe27c] bg-[#fffdf5] shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg text-[#191265]"><Globe2 className="size-5" />פרסום דף נחיתה</CardTitle><CardDescription>פרסום ייצור דף ציבורי בכתובת שתבחרי בלבד — ללא הפצה או פרסום ברשתות.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Label htmlFor="landing-slug">Slug לכתובת</Label><Input id="landing-slug" dir="ltr" value={slug} onChange={event => setSlug(event.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))} placeholder="summer-match-guide" className="border-[#191265]/20" /></div><label className="flex cursor-pointer items-start gap-2 text-sm leading-6 text-slate-700"><Checkbox checked={confirmed} onCheckedChange={checked => setConfirmed(checked === true)} className="mt-1 border-[#191265]/40 data-[state=checked]:bg-[#191265]" />אני מאשרת שהטיוטה נבדקה ומוכנה לפרסום ציבורי.</label><div className="flex flex-wrap gap-2"><Button type="button" onClick={doPublish} disabled={!slug.trim() || !confirmed || publish.isPending} className="bg-[#191265] text-white hover:bg-[#191265]/90">{publish.isPending ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Send className="ml-1 size-4" />}פרסמי דף נחיתה</Button>{documentStatus(selected) === "published" && <Button type="button" variant="outline" onClick={() => currentId && unpublish.mutate({ id: currentId })} disabled={unpublish.isPending} className="border-[#191265]/20 text-[#191265]"><X className="ml-1 size-4" />הסירי מפרסום</Button>}</div>{publish.error && <p className="text-sm text-red-700">{publish.error.message || "לא ניתן לפרסם כרגע."}</p>}{publicLink && <a href={publicLink} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-sm font-bold text-[#191265] underline underline-offset-4"><ExternalLink className="size-4" />לצפייה בדף שפורסם</a>}</CardContent></Card>}</div>
  </div>;
}

function ContentPreview({ selected, onCopy, copied, onArchive, archiving }: { selected: any; onCopy: () => void; copied: boolean; onArchive: () => void; archiving: boolean }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  if (!selected) return <Card className="border-dashed border-[#191265]/20"><CardContent className="flex min-h-56 flex-col items-center justify-center p-7 text-center text-slate-500"><FileText className="mb-3 size-8 text-[#191265]/40" /><p className="text-sm">בחרי טיוטה כדי לראות תצוגה מקדימה.</p></CardContent></Card>;
  const kind = documentType(selected); const content = documentContent(selected); const slides = Array.isArray(content.slides) ? content.slides : []; const slide = slides[Math.min(slideIndex, Math.max(0, slides.length - 1))];
  const storyTheme = selected?.templateKey === "warm_brown"
    ? { background: "bg-[#624633]", eyebrow: "text-[#ffe27c]", muted: "text-[#fff7e9]/85", border: "border-[#ffe27c]/25" }
    : selected?.templateKey === "editorial_cream"
      ? { background: "bg-[#fffaf0] text-[#191265]", eyebrow: "text-[#7a5a38]", muted: "text-[#191265]/75", border: "border-[#191265]/15" }
      : { background: "bg-[#191265] text-white", eyebrow: "text-[#ffe27c]", muted: "text-white/85", border: "border-white/20" };
  const downloadSlide = async () => { if (!storyRef.current || !slide || downloading) return; setDownloading(true); try { const dataUrl = await toPng(storyRef.current, { width: 1080, height: 1920, canvasWidth: 1080, canvasHeight: 1920, pixelRatio: 1, cacheBust: true, backgroundColor: "#191265" }); const link = document.createElement("a"); link.download = `${safeFilename(documentTitle(selected))}-${slideIndex + 1}.png`; link.href = dataUrl; link.click(); } finally { setDownloading(false); } };
  return <Card className="overflow-hidden border-[#191265]/10 shadow-sm"><div className="bg-[#191265] px-5 py-3 text-sm font-bold text-[#ffe27c]">תצוגה מקדימה ממותגת</div><CardContent className="p-0">{kind === "story" && slide ? <div className="p-4 sm:p-6"><div ref={storyRef} className={`mx-auto flex aspect-[9/16] w-full max-w-[360px] flex-col justify-between overflow-hidden rounded-[2rem] p-7 shadow-xl ${storyTheme.background}`}><div><p className={`text-xs font-bold tracking-[0.18em] ${storyTheme.eyebrow}`}>MATCH BY HILIT</p><p className={`mt-5 text-xs ${storyTheme.muted}`}>{slideIndex + 1} / {slides.length}</p><h2 className="mt-3 text-3xl font-bold leading-tight">{slide.title}</h2><p className={`mt-5 whitespace-pre-wrap text-base leading-7 ${storyTheme.muted}`}>{slide.body}</p></div><p className={`border-t pt-4 text-sm font-bold ${storyTheme.border} ${storyTheme.eyebrow}`}>{slide.cta || content.cta}</p></div>{slides.length > 1 && <div className="mt-4 flex flex-wrap justify-center gap-2">{slides.map((_: any, index: number) => <button key={index} type="button" onClick={() => setSlideIndex(index)} className={`size-8 rounded-full text-xs font-bold ${index === slideIndex ? "bg-[#191265] text-white" : "bg-[#191265]/10 text-[#191265]"}`} aria-label={`שקופית ${index + 1}`}>{index + 1}</button>)}</div>}</div> : <article className="mx-auto max-w-3xl bg-[#fffdf7] px-5 py-8 sm:px-9"><p className="text-xs font-bold tracking-[0.16em] text-[#191265]/60">MATCH BY HILIT</p><h2 className="mt-3 text-2xl font-bold text-[#191265]">{documentTitle(selected)}</h2><div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{contentAsText(content) || "התוכן נוצר במבנה שמור. אפשר לערוך אותו בטיוטה לפני השימוש."}</div></article>}<div className="flex flex-wrap gap-2 border-t border-[#191265]/10 p-4">{kind === "story" && <Button type="button" onClick={downloadSlide} disabled={downloading} className="bg-[#191265] text-white hover:bg-[#191265]/90">{downloading ? <Loader2 className="ml-1 size-4 animate-spin" /> : <Download className="ml-1 size-4" />}הורדת PNG לשקופית</Button>}{kind !== "landing_page" && <Button type="button" variant={kind === "story" ? "outline" : "default"} onClick={onCopy} className={kind === "story" ? "border-[#191265]/20 text-[#191265]" : "bg-[#191265] text-white hover:bg-[#191265]/90"}>{copied ? <Check className="ml-1 size-4" /> : <Clipboard className="ml-1 size-4" />}{copied ? "הועתק" : "העתקה"}</Button>}<Button type="button" variant="outline" onClick={onArchive} disabled={archiving} className="border-[#191265]/20 text-[#191265]"><Archive className="ml-1 size-4" />העברה לארכיון</Button></div></CardContent></Card>;
}

export { ContentStudioSection };
