import { useEffect, useMemo } from "react";
import { Check, ChevronDown, Heart, Sparkles } from "lucide-react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";

const themes = {
  signature_dark: { page: "bg-[#191265] text-white", panel: "bg-white/10 border-white/15", muted: "text-white/75", accent: "bg-[#ffe27c] text-[#191265] hover:bg-[#ffe27c]/90", outline: "border-white/30 text-white hover:bg-white/10" },
  editorial_cream: { page: "bg-[#fffaf0] text-[#191265]", panel: "bg-white border-[#191265]/10", muted: "text-[#191265]/70", accent: "bg-[#191265] text-white hover:bg-[#191265]/90", outline: "border-[#191265]/25 text-[#191265] hover:bg-[#191265]/5" },
  warm_brown: { page: "bg-[#624633] text-white", panel: "bg-[#fff7e9]/10 border-[#ffe27c]/25", muted: "text-white/80", accent: "bg-[#ffe27c] text-[#3e2a1e] hover:bg-[#ffe27c]/90", outline: "border-[#ffe27c]/45 text-white hover:bg-white/10" },
} as const;
type ThemeName = keyof typeof themes;
type Block = { type?: string; heading?: string; title?: string; text?: string; body?: string; label?: string; href?: string; items?: unknown[]; imageUrl?: string; alt?: string; quote?: string; name?: string; question?: string; answer?: string; [key: string]: unknown };

function safeHref(href: unknown) { if (typeof href !== "string") return ""; const trimmed = href.trim(); return /^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed) ? trimmed : ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value : ""; }
function parseContent(record: any): any { const raw = record?.content ?? record?.contentJson ?? record?.json ?? record?.data ?? record?.landingPage ?? record; if (typeof raw !== "string") return raw || {}; try { return JSON.parse(raw); } catch { return {}; } }
function normalizeBlocks(content: any): Block[] { const candidates = content?.blocks ?? content?.sections ?? content?.components ?? content?.page?.blocks; return Array.isArray(candidates) ? candidates.filter(block => block && typeof block === "object") : []; }
function getTheme(content: any, record: any): ThemeName { const value = content?.template ?? content?.theme ?? record?.templateKey ?? record?.template ?? "signature_dark"; return value in themes ? value as ThemeName : "signature_dark"; }

export default function GeneratedLandingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const api = trpc as any;
  const query = api.contentStudio.publicBySlug.useQuery({ slug }, { enabled: Boolean(slug), retry: false });
  const record = query.data?.landingPage ?? query.data?.page ?? query.data;
  const content = useMemo(() => parseContent(record), [record]);
  const blocks = useMemo(() => normalizeBlocks(content), [content]);
  const sections = useMemo(() => Array.isArray(content?.sections) ? content.sections.filter((section: any) => section && typeof section === "object") : [], [content]);
  const theme = themes[getTheme(content, record)];
  const title = stringValue(content?.title ?? record?.title) || "Match by Hilit";
  useEffect(() => {
    if (!record) return;
    const previousTitle = document.title;
    document.title = `${title} | Match by Hilit`;
    return () => { document.title = previousTitle; };
  }, [record, title]);

  if (query.isLoading) return <div dir="rtl" className="grid min-h-screen place-items-center bg-[#191265] text-white"><div className="size-8 animate-spin rounded-full border-4 border-[#ffe27c] border-t-transparent" aria-label="טוען" /></div>;
  if (query.error || !record) return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#fffaf0] px-5 text-center text-[#191265]"><div><Heart className="mx-auto size-9 text-[#191265]" /><h1 className="mt-4 text-2xl font-bold">הדף אינו זמין</h1><p className="mt-2 text-sm text-[#191265]/70">ייתכן שהקישור אינו תקין או שהדף הוסר מפרסום.</p></div></main>;

  return <main dir="rtl" className={`min-h-screen ${theme.page}`}>
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"><a href="/" className="flex items-center gap-2 font-bold tracking-tight" aria-label="Match by Hilit - דף הבית"><span className="grid size-8 place-items-center rounded-full bg-[#ffe27c] text-[#191265]"><Heart className="size-4 fill-current" /></span><span>MATCH BY HILIT</span></a><span className="text-xs font-semibold opacity-70">להכיר. להתאים. להתחיל.</span></header>
    <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24">{sections.length ? <StudioLandingContent title={title} content={content} sections={sections} theme={theme} /> : blocks.length ? blocks.map((block, index) => <SafeBlock key={`${block.type || "block"}-${index}`} block={block} theme={theme} />) : <SafeFallback title={title} theme={theme} content={content} />}</div>
  </main>;
}

function SafeBlock({ block, theme }: { block: Block; theme: typeof themes[ThemeName] }) {
  const type = stringValue(block.type).toLowerCase();
  const heading = stringValue(block.heading ?? block.title);
  const text = stringValue(block.text ?? block.body);
  const href = safeHref(block.href ?? block.url);
  if (["hero", "header"].includes(type)) return <section className="grid items-center gap-8 py-10 sm:grid-cols-[1.1fr_.9fr] sm:py-16"><div><p className="mb-3 text-sm font-bold tracking-[0.16em] text-[#ffe27c]">{stringValue(block.eyebrow) || "MATCH BY HILIT"}</p><h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">{heading}</h1>{text && <p className={`mt-5 max-w-xl text-lg leading-8 ${theme.muted}`}>{text}</p>}{href && <a href={href} className={`mt-7 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>{stringValue(block.label) || "לפרטים נוספים"}</a>}</div>{stringValue(block.imageUrl) && <img src={stringValue(block.imageUrl)} alt={stringValue(block.alt) || ""} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-xl" loading="eager" />}</section>;
  if (["features", "benefits", "list"].includes(type)) { const items = Array.isArray(block.items) ? block.items : []; return <section className="py-8 sm:py-12"><SectionHeading heading={heading} text={text} muted={theme.muted} /><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, 12).map((item: any, index) => <div key={index} className={`rounded-2xl border p-5 ${theme.panel}`}><Check className="size-5 text-[#ffe27c]" /><h3 className="mt-3 font-bold">{stringValue(item?.title) || (typeof item === "string" ? item : "")}</h3>{stringValue(item?.text ?? item?.body) && <p className={`mt-2 text-sm leading-6 ${theme.muted}`}>{stringValue(item.text ?? item.body)}</p>}</div>)}</div></section>; }
  if (["testimonial", "testimonials", "quotes"].includes(type)) { const items = Array.isArray(block.items) ? block.items : [block]; return <section className="py-8 sm:py-12"><SectionHeading heading={heading} text={text} muted={theme.muted} /><div className="mt-6 grid gap-3 md:grid-cols-2">{items.slice(0, 8).map((item: any, index) => <figure key={index} className={`rounded-2xl border p-5 ${theme.panel}`}><blockquote className="text-base leading-7">״{stringValue(item?.quote ?? item?.text ?? item)}״</blockquote>{stringValue(item?.name) && <figcaption className={`mt-4 text-sm font-bold ${theme.muted}`}>{stringValue(item.name)}</figcaption>}</figure>)}</div></section>; }
  if (["faq", "faqs"].includes(type)) { const items = Array.isArray(block.items) ? block.items : []; return <section className="py-8 sm:py-12"><SectionHeading heading={heading} text={text} muted={theme.muted} /><div className="mt-5 space-y-2">{items.slice(0, 12).map((item: any, index) => <details key={index} className={`group rounded-xl border p-4 ${theme.panel}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">{stringValue(item?.question ?? item?.title)}<ChevronDown className="size-4 transition group-open:rotate-180" /></summary><p className={`mt-3 text-sm leading-7 ${theme.muted}`}>{stringValue(item?.answer ?? item?.text)}</p></details>)}</div></section>; }
  if (["cta", "call_to_action"].includes(type)) return <section className={`my-8 rounded-3xl border p-7 text-center sm:my-12 sm:p-10 ${theme.panel}`}><Sparkles className="mx-auto size-6 text-[#ffe27c]" /><h2 className="mt-3 text-2xl font-bold">{heading}</h2>{text && <p className={`mx-auto mt-3 max-w-2xl leading-7 ${theme.muted}`}>{text}</p>}{href && <a href={href} className={`mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>{stringValue(block.label) || "לפרטים"}</a>}</section>;
  if (["text", "paragraph", "content"].includes(type) || heading || text) return <section className="max-w-3xl py-7 sm:py-10"><SectionHeading heading={heading} text={text} muted={theme.muted} /></section>;
  return null;
}

function SectionHeading({ heading, text, muted }: { heading: string; text: string; muted: string }) { return <>{heading && <h2 className="text-2xl font-bold sm:text-3xl">{heading}</h2>}{text && <p className={`mt-3 whitespace-pre-wrap text-base leading-8 ${muted}`}>{text}</p>}</>; }
function StudioLandingContent({ title, content, sections, theme }: { title: string; content: any; sections: any[]; theme: typeof themes[ThemeName] }) { const subtitle = stringValue(content?.subtitle); const cta = stringValue(content?.cta); const ctaHref = safeHref(content?.ctaHref); return <><section className="py-14 text-center sm:py-24"><p className="text-sm font-bold tracking-[0.16em] text-[#ffe27c]">MATCH BY HILIT</p><h1 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>{subtitle && <p className={`mx-auto mt-5 max-w-2xl text-lg leading-8 ${theme.muted}`}>{subtitle}</p>}{cta && (ctaHref ? <a href={ctaHref} className={`mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>{cta}</a> : <span className={`mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>{cta}</span>)}</section><div className="grid gap-5 pb-10 md:grid-cols-2">{sections.slice(0, 12).map((section, index) => { const bullets = Array.isArray(section.bullets) ? section.bullets.filter((item: unknown) => typeof item === "string") : []; return <section key={`${stringValue(section.heading)}-${index}`} className={`rounded-3xl border p-6 sm:p-8 ${theme.panel}`}><span className="text-xs font-bold tracking-[0.14em] text-[#ffe27c]">{String(index + 1).padStart(2, "0")}</span><h2 className="mt-3 text-2xl font-bold">{stringValue(section.heading)}</h2><p className={`mt-3 whitespace-pre-wrap leading-8 ${theme.muted}`}>{stringValue(section.body)}</p>{bullets.length > 0 && <ul className="mt-5 space-y-3">{bullets.slice(0, 8).map((item: string) => <li key={item} className="flex gap-2 text-sm leading-6"><Check className="mt-1 size-4 shrink-0 text-[#ffe27c]" />{item}</li>)}</ul>}</section>; })}</div>{cta && <section className={`mb-8 rounded-3xl border p-8 text-center ${theme.panel}`}><Sparkles className="mx-auto size-6 text-[#ffe27c]" /><h2 className="mt-3 text-2xl font-bold">הצעד הבא מתחיל כאן</h2><p className={`mx-auto mt-3 max-w-xl leading-7 ${theme.muted}`}>{cta}</p>{ctaHref && <a href={ctaHref} className={`mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>{cta}</a>}</section>}</>; }
function SafeFallback({ title, theme, content }: { title: string; theme: typeof themes[ThemeName]; content: any }) { const description = stringValue(content?.description ?? content?.subtitle); const href = safeHref(content?.href); return <section className="py-14 text-center sm:py-24"><p className="text-sm font-bold tracking-[0.16em] text-[#ffe27c]">MATCH BY HILIT</p><h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">{title}</h1>{description && <p className={`mx-auto mt-5 max-w-2xl text-lg leading-8 ${theme.muted}`}>{description}</p>}{href && <a href={href} className={`mt-8 inline-flex rounded-xl px-5 py-3 text-sm font-bold ${theme.accent}`}>לפרטים נוספים</a>}</section>; }

export { GeneratedLandingPage };
