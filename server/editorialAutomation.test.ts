import { describe, expect, it, vi, afterEach } from "vitest";
import type { Request, Response } from "express";
import type { InvokeResult } from "./_core/llm";
import {
  EDITORIAL_AUTOMATION_POLICY as POLICY, EDITORIAL_TOPICS, getEditorialSlot, inspectEditorialCandidate,
  type EditorialArticle,
} from "../shared/editorialAutomationPolicy";
import { createEditorialArticleHandler, generateEditorialDraft, renderEditorialArticle, editorialAutomationRouter,
  editorialAutomationStore, type EditorialAutomationStore, type EditorialAutomationDependencies } from "./editorialAutomation";

vi.mock("./db", () => ({ getDb: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(() => { throw new Error("live LLM forbidden"); }), listLLMModels: vi.fn(() => { throw new Error("live catalogue forbidden"); }) }));
vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn(() => { throw new Error("live auth forbidden"); }) } }));
afterEach(() => vi.useRealTimers());

function candidate(): EditorialArticle {
  const sentence = "אפשר לעצור ולהקשיב לרצון שלך בתוך ההיכרות ולברר מה נעים לך בשיחה בלי למהר לבחור מתוך לחץ או לנחש את מחשבות האחר כאשר יש ספק כדאי לשאול באופן פתוח ולהישאר קשובים לגבולות";
  return { title: "איך להקשיב לרצון שלך בשיחה פתוחה ומכבדת", excerpt: "היכרות מאפשרת לבדוק מה חשוב לך בתוך שיחה פתוחה ולהקשיב לרצון האישי בלי למהר להסיק מסקנות.",
    metaDescription: "התבוננות ברצון האישי ובגבולות בהיכרות, עם שאלות פתוחות והקשבה לקצב שמתאים לך.",
    paragraphs: ["להקשיב לרצון", "לשמור על גבולות", "לברר בעדינות", "להישאר סקרנים", "לבחור בקצב שלך"].map(heading => ({ heading, text: Array(4).fill(sentence).join(" ") })) };
}
const completionResult = (value: unknown): InvokeResult => ({ id: "mock", created: 0, model: POLICY.model,
  choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(value) }, finish_reason: "stop" }] });
function harness(options: { article?: EditorialArticle; auth?: { isCron?: boolean; taskUid?: string }; review?: unknown } = {}) {
  const settings = { id: 1, scheduleCronTaskUid: "bound-task", enabled: true, timezone: POLICY.timezone, model: POLICY.model, updatedAt: 0 };
  const slots = new Set<string>();
  const articles: { id: number; published: boolean; article: EditorialArticle; codes: string[]; html: string }[] = [];
  const store: EditorialAutomationStore = {
    settingsForTask: vi.fn(async () => settings),
    claimSlot: vi.fn(async slot => { if (slots.has(slot)) return null; slots.add(slot); return slots.size; }),
    recentPublicPosts: vi.fn(async () => []), recentTopicKeys: vi.fn(async () => []),
    saveDraft: vi.fn(async (_runId, _slot, topic, article, codes) => {
      const id = articles.length + 1; articles.push({ id, article, codes, published: false, html: renderEditorialArticle(article, topic) }); return id;
    }),
    publishDraft: vi.fn(async (_runId, articleId) => { if (!settings.enabled) return false; articles[articleId - 1].published = true; return true; }),
    failRun: vi.fn(async () => {}),
  };
  const complete = vi.fn(async (params) => completionResult(params.response_format.json_schema.name === "evergreen_editorial"
    ? options.article ?? candidate() : options.review ?? { allowed: true, codes: [] }));
  const deps: EditorialAutomationDependencies = { store, complete,
    authenticate: vi.fn(async () => options.auth ?? { isCron: true, taskUid: "bound-task" }),
    listModels: vi.fn(async () => ({ data: [{ id: POLICY.model }] })), now: () => new Date("2026-11-16T08:00:00Z") };
  return { deps, store, articles, settings, complete, handler: createEditorialArticleHandler(deps) };
}
function response() {
  const result: { status: number; body: any; headers: Record<string, unknown> } = { status: 200, body: null, headers: {} };
  const res = { setHeader: vi.fn((key, value) => { result.headers[key] = value; }),
    status: vi.fn((status) => { result.status = status; return res; }), json: vi.fn((body) => { result.body = body; return res; }) } as unknown as Response;
  return { res, result };
}
const req = { body: { ownerId: 999, job: "another-job", taskUid: "bound-task", force: true, slotKey: "2026-11-16" } } as Request;

describe("editorial policy", () => {
  it.each([
    ["2026-11-16T08:00:00Z", "2026-11-16"], ["2026-11-19T08:59:59Z", "2026-11-19"],
    ["2026-07-06T07:00:00Z", "2026-07-06"], ["2026-07-09T07:59:59Z", "2026-07-09"],
    ["2026-03-26T08:00:00Z", "2026-03-26"], ["2026-03-30T07:00:00Z", "2026-03-30"],
    ["2026-10-22T07:00:00Z", "2026-10-22"], ["2026-10-26T08:00:00Z", "2026-10-26"],
  ])("uses Israel date across DST: %s", (at, slot) => expect(getEditorialSlot(new Date(at))?.slotKey).toBe(slot));
  it.each(["2026-11-15T08:00:00Z", "2026-11-16T07:59:59Z", "2026-11-16T09:00:00Z", "2026-07-06T08:00:00Z", "2026-11-16T22:30:00Z"])
    ("does not backfill or flood outside current window %s", at => expect(getEditorialSlot(new Date(at))).toBeNull());
  it("accepts bounded Hebrew editorial JSON and rejects extra fields", () => {
    expect(inspectEditorialCandidate(candidate()).codes).toEqual([]);
    expect(inspectEditorialCandidate({ ...candidate(), source: "imagined" }).codes).toEqual(["SCHEMA_INVALID"]);
  });
  it.each([
    ["NUMBER_OR_PRICE", "מחיר מיוחד של 349 ₪"], ["NUMBER_OR_PRICE", "תשעים אחוז מהלקוחות"],
    ["CLAIM", "המחקר מוכיח הצלחה מובטחת"], ["CLAIM", "אבחון קליני גנטי"],
    ["TESTIMONIAL", "נועה סיפרה לי שהכירה אצלנו"], ["PERSONAL_STORY", "בן זוגי שחר ואני הכרנו בטינדר"],
    ["PII", "כתבו אל person@example.com"], ["PII", "הטלפון הוא 050-1234567"],
    ["LINK_OR_MARKUP", "כנסו https://external.example/?utm_source=auto"],
    ["LINK_OR_MARKUP", '<img src="x" onerror="alert(1)">'],
    ["LINK_OR_MARKUP", "לפרטים /database?utm_source=blog"],
  ])("blocks %s", (code, text) => {
    const article = candidate(); article.paragraphs[0].text += ` ${text}`;
    expect(inspectEditorialCandidate(article).codes).toContain(code);
  });
  it("rejects exact normalised title and large textual overlap, with at most public lookback", () => {
    const article = candidate();
    const recent = [{ title: article.title, content: renderEditorialArticle(article, EDITORIAL_TOPICS[0]), slug: "old" }];
    expect(inspectEditorialCandidate(article, recent).codes).toEqual(expect.arrayContaining(["DUPLICATE_TITLE", "DUPLICATE_CONTENT"]));
    const filler = Array(100).fill({ title: "אחר", content: "טקסט שונה", slug: "other" });
    expect(inspectEditorialCandidate(article, [...filler, ...recent]).codes).toEqual([]);
  });
  it("escapes model HTML and assembles only code-owned internal CTA", () => {
    const article = candidate(); article.paragraphs[0].text = '<script>alert("x")</script><a href="javascript:x">test</a>';
    const html = renderEditorialArticle(article, EDITORIAL_TOPICS[0]);
    expect(html).not.toMatch(/<script|<h1|<img|<a[^>]*href="javascript:/);
    expect(html).toContain("&lt;script&gt;"); expect(html).toContain('<a href="/database">');
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(() => renderEditorialArticle(article, { ...EDITORIAL_TOPICS[0], primaryHref: "//evil" } as any)).toThrow("SANITIZER_FAILED");
  });
});

describe("scheduled callback", () => {
  it.each([{ isCron: false, taskUid: "bound-task" }, { isCron: true }, { isCron: true, taskUid: "other-task" }])("rejects unauthorized/unbound identity without LLM %j", async auth => {
    const h = harness({ auth }); const r = response(); await h.handler(req, r.res);
    expect(r.result.status).toBe(403); expect(r.result.headers["X-Editorial-Publisher-Version"]).toBe("1");
    expect(h.complete).not.toHaveBeenCalled(); expect(h.store.claimSlot).not.toHaveBeenCalled();
  });
  it("auth exception never becomes permissive fallback", async () => {
    const h = harness(); h.deps.authenticate = vi.fn(async () => { throw new Error("token secret"); });
    const r = response(); await h.handler(req, r.res); expect(r.result).toMatchObject({ status: 403, body: { error: "cron-only" } });
    expect(h.deps.listModels).not.toHaveBeenCalled();
  });
  it("skips paused and outside-window calls despite payload force/date", async () => {
    const h = harness(); h.settings.enabled = false;
    const r = response(); await h.handler(req, r.res); expect(r.result.body.skipped).toBe("paused");
    h.settings.enabled = true; h.deps.now = () => new Date("2026-11-15T08:00:00Z");
    await h.handler(req, r.res); expect(r.result.body.skipped).toBe("outside-window"); expect(h.complete).not.toHaveBeenCalled();
  });
  it("two concurrent callbacks and retries create only one article for a slot", async () => {
    const h = harness(); const a = response(); const b = response();
    await Promise.all([h.handler(req, a.res), h.handler(req, b.res)]);
    await h.handler(req, response().res);
    expect(h.articles).toHaveLength(1); expect(h.articles[0].published).toBe(true);
    expect([a.result.body, b.result.body]).toContainEqual({ ok: true, skipped: "existing-slot" });
    expect(h.complete).toHaveBeenCalledTimes(2); expect(h.store.publishDraft).toHaveBeenCalledTimes(1);
  });
  it("unavailable model fails safely with no fallback and no second attempt on retry", async () => {
    const h = harness(); h.deps.listModels = vi.fn(async () => ({ data: [{ id: "other" }] }));
    const r = response(); await h.handler(req, r.res); expect(r.result.body.error).toBe("MODEL_UNAVAILABLE");
    expect(h.complete).not.toHaveBeenCalled(); await h.handler(req, response().res); expect(h.deps.listModels).toHaveBeenCalledTimes(1);
  });
  it("unsafe deterministic output stays draft without reviewer and never leaks prose", async () => {
    const article = candidate(); article.paragraphs[0].text += " המחקר מוכיח הצלחה מובטחת";
    const h = harness({ article }); const r = response(); await h.handler(req, r.res);
    expect(h.complete).toHaveBeenCalledTimes(1); expect(h.articles[0].published).toBe(false);
    expect(r.result.body).toEqual({ ok: true, disposition: "draft", codes: ["CLAIM"] });
    expect(JSON.stringify(r.result)).not.toContain("המחקר"); expect(h.store.publishDraft).not.toHaveBeenCalled();
  });
  it.each([{ allowed: false, codes: ["CLAIM"] }, { allowed: true, codes: ["CLAIM"] }, { allowed: true, codes: [], explanation: "private story" }])
    ("review rejection or schema violation always remains draft %j", async review => {
      const h = harness({ review }); const r = response(); await h.handler(req, r.res);
      expect(h.articles[0].published).toBe(false); expect(r.result.body.disposition).toBe("draft");
      expect(h.store.publishDraft).not.toHaveBeenCalled(); expect(JSON.stringify(r.result)).not.toContain("private story");
    });
  it("pausing during generation prevents publication", async () => {
    const h = harness(); const complete = h.complete;
    h.deps.complete = vi.fn(async params => { h.settings.enabled = false; return complete(params); });
    const r = response(); await h.handler(req, r.res);
    expect(h.articles[0].published).toBe(false); expect(r.result.body.disposition).toBe("draft");
    expect(h.store.failRun).toHaveBeenCalledWith(1, ["PAUSED_BEFORE_PUBLISH"], expect.any(Number));
  });
  it("expired window after review saves draft and cannot publish", async () => {
    const h = harness(); let clock = "2026-11-16T08:59:30Z"; h.deps.now = () => new Date(clock);
    const complete = h.complete; h.deps.complete = async params => { const result = await complete(params); clock = "2026-11-16T09:00:00Z"; return result; };
    const r = response(); await h.handler(req, r.res);
    expect(h.articles[0].codes).toContain("WINDOW_EXPIRED"); expect(h.store.publishDraft).not.toHaveBeenCalled();
  });
  it("redacts model errors in failed run and callback response", async () => {
    const h = harness(); h.deps.complete = vi.fn(async () => { throw new Error("api-secret person@example.com"); });
    const r = response(); await h.handler(req, r.res);
    expect(r.result.status).toBe(500); expect(JSON.stringify(r.result)).not.toMatch(/api-secret|person@/);
    expect(h.store.failRun).toHaveBeenCalledWith(1, ["GENERATION_FAILED"], expect.any(Number));
  });
});

describe("generation-only draft pilot", () => {
  it("explicit model, low reasoning and strict JSON for both independent requests", async () => {
    const h = harness(); const result = await generateEditorialDraft({ model: POLICY.model, topic: EDITORIAL_TOPICS[0], recentPublicPosts: [], complete: h.complete });
    expect(result.allowed).toBe(true); expect(h.store.saveDraft).not.toHaveBeenCalled();
    for (const [params] of h.complete.mock.calls) {
      expect(params).toMatchObject({ model: POLICY.model, reasoning: { effort: "low" }, response_format: { type: "json_schema", json_schema: { strict: true } } });
      expect(params).not.toHaveProperty("temperature"); expect(params).not.toHaveProperty("top_p"); expect(params).not.toHaveProperty("maxTokens");
    }
  });
  it("writer timeout has no late writes or review", async () => {
    vi.useFakeTimers(); let resolve!: (result: InvokeResult) => void;
    const h = harness(); h.deps.complete = vi.fn(() => new Promise<InvokeResult>(r => { resolve = r; }));
    const r = response(); const pending = h.handler(req, r.res);
    await vi.advanceTimersByTimeAsync(POLICY.writerTimeoutMs + 1); await pending;
    expect(r.result.body.error).toBe("WRITER_TIMEOUT"); resolve(completionResult(candidate())); await Promise.resolve();
    expect(h.store.saveDraft).not.toHaveBeenCalled(); expect(h.deps.complete).toHaveBeenCalledTimes(1);
  });
  it("review timeout preserves a private draft, never late publication", async () => {
    vi.useFakeTimers(); const h = harness(); let resolve!: (result: InvokeResult) => void;
    h.deps.complete = vi.fn(async params => params.response_format?.type === "json_schema" && params.response_format.json_schema.name === "evergreen_editorial"
      ? completionResult(candidate()) : new Promise<InvokeResult>(r => { resolve = r; }));
    const r = response(); const pending = h.handler(req, r.res);
    await vi.advanceTimersByTimeAsync(POLICY.reviewerTimeoutMs + 1); await pending;
    expect(h.articles[0].codes).toEqual(["REVIEW_TIMEOUT"]); resolve(completionResult({ allowed: true, codes: [] })); await Promise.resolve();
    expect(h.store.publishDraft).not.toHaveBeenCalled();
  });
});

describe("admin status access", () => {
  it("rejects anonymous and nonadmin readers/mutations before DB access", async () => {
    const { getDb } = await import("./db"); vi.mocked(getDb).mockClear();
    for (const user of [null, { role: "user" }]) {
      const caller = editorialAutomationRouter.createCaller({ req: {}, res: {}, user, teamMember: null } as any);
      await expect(caller.status()).rejects.toThrow(); await expect(caller.setPaused({ paused: true })).rejects.toThrow();
    }
    expect(getDb).not.toHaveBeenCalled();
  });
  it("team status is sanitized and cannot report active without a bound UID", async () => {
    const { getDb } = await import("./db");
    const setting = { ...harness().settings, scheduleCronTaskUid: null, enabled: true };
    const chain: any = { from: () => chain, where: () => chain, limit: vi.fn().mockResolvedValueOnce([setting]).mockResolvedValueOnce([]), orderBy: () => chain };
    vi.mocked(getDb).mockResolvedValue({ select: () => chain } as any);
    const caller = editorialAutomationRouter.createCaller({ req: {}, res: {}, user: null, teamMember: { id: 1, role: "team" } } as any);
    const result = await caller.status();
    expect(result).toMatchObject({ state: "pending-deployment", enabled: false, configured: false });
    expect(result).not.toHaveProperty("model"); expect(result).not.toHaveProperty("scheduleCronTaskUid");
    chain.limit.mockResolvedValue([setting]);
    await expect(caller.setPaused({ paused: false })).rejects.toThrow("לא הופעל");
  });
});

describe("atomic native slot insert", () => {
  it.each([
    [{ affectedRows: 1, insertId: 17 }, 17],
    [{ affectedRows: 0, insertId: 0 }, null],
    [{ affectedRows: 1, insertId: 0 }, null],
    [{ affectedRows: 2, insertId: 17 }, null],
  ])("only freshly inserted row can operate %j", async (result, expected) => {
    const { getDb } = await import("./db");
    const onDuplicateKeyUpdate = vi.fn(async () => [result]);
    vi.mocked(getDb).mockResolvedValue({ insert: () => ({ values: () => ({ onDuplicateKeyUpdate }) }) } as any);
    await expect(editorialAutomationStore.claimSlot("2026-11-16", "profile-clarity", 1)).resolves.toBe(expected);
    const noOp = onDuplicateKeyUpdate.mock.calls[0][0] as any;
    expect(noOp.set.id.queryChunks.filter((c: any) => Array.isArray(c.value)).map((c: any) => c.value.join("")).join("")).toContain("LAST_INSERT_ID(0)");
  });
});

describe("editorial quantity and month word boundaries", () => {
  it("allows ordinary words containing month fragments", () => {
    const article = candidate();
    article.paragraphs[0].text += " עיסוקים עצמאיים יכולים להיות חיוניים לשגרה ולתחושת עצמאות.";
    expect(inspectEditorialCandidate(article).codes).not.toContain("NUMBER_OR_PRICE");
  });
  it.each(["בנובמבר", "ביוני", "למאי", "אלפים", "במאות"])("still rejects time-limited or quantity words: %s", word => {
    const article = candidate();
    article.paragraphs[0].text += ` ${word}`;
    expect(inspectEditorialCandidate(article).codes).toContain("NUMBER_OR_PRICE");
  });
});
