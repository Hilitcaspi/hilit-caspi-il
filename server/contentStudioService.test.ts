import { describe, expect, it, vi } from "vitest";
import {
  ContentStudioValidationError,
  parseStructuredContent,
  sanitizeStructuredContent,
  slugifyHebrewEnglish,
} from "../shared/contentStudio";

const mocks = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import {
  generateContentStudioDraft,
  updateContentStudioDocument,
} from "./contentStudioService";

const landingContent = {
  title: "קשר שמתחיל בעומק",
  subtitle: "למצוא מקום מדויק לקשר משמעותי",
  tone: "חם ומדויק",
  cta: "לשיחה שקטה",
  sections: [
    { heading: "להתחיל", body: "מקום לקשר שנבנה בקצב הנכון.", bullets: ["הקשבה", "בחירה"] },
    { heading: "להעמיק", body: "תהליך אישי ונעים.", bullets: ["בהירות", "נוכחות"] },
  ],
};

function createDbHarness(existing?: Record<string, unknown>) {
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<Record<string, unknown>> = [];
  const document = existing || {
    id: 44,
    kind: "landing_page",
    title: "דף קיים",
    slug: null,
    status: "draft",
    templateKey: "signature_dark",
    brief: "בריף קיים ומספיק מפורט",
    contentJson: JSON.stringify(landingContent),
    model: "gpt-5-mini",
    promptTokens: 3,
    completionTokens: 4,
    createdByHash: null,
    publishedAt: null,
    createdAt: 1,
    updatedAt: 1,
  };
  let selectCall = 0;
  const db = {
    insert: vi.fn(() => ({
      values: vi.fn((value: Record<string, unknown>) => {
        inserts.push(value);
        const result = Promise.resolve([{ insertId: inserts.length === 1 ? 91 : inserts.length }]) as Promise<Array<{ insertId: number }>> & {
          onDuplicateKeyUpdate: (input: unknown) => Promise<void>;
        };
        result.onDuplicateKeyUpdate = vi.fn(async () => undefined);
        return result;
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((value: Record<string, unknown>) => {
        updates.push(value);
        return { where: vi.fn(async () => undefined) };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => {
            selectCall += 1;
            // First select is the current document; second is latest version.
            return selectCall === 1 ? [document] : [{ version: 1 }];
          }),
          orderBy: vi.fn(() => ({
            limit: vi.fn(async () => [{ version: 1 }]),
          })),
        })),
      })),
    })),
  } as any;
  return { db, inserts, updates };
}

describe("Content Studio validation", () => {
  it("rejects HTML and executable text in structured content", () => {
    expect(() => sanitizeStructuredContent("landing_page", {
      ...landingContent,
      title: "<script>alert(1)</script>",
    })).toThrow(ContentStudioValidationError);

    expect(() => sanitizeStructuredContent("landing_page", {
      ...landingContent,
      sections: [{
        ...landingContent.sections[0],
        body: "javascript:alert(1)",
      }, landingContent.sections[1]],
    })).toThrow(ContentStudioValidationError);
  });

  it("parses only the exact shape required for its kind", () => {
    expect(() => parseStructuredContent("landing_page", JSON.stringify({
      ...landingContent,
      unexpected: "field",
    }))).toThrow(ContentStudioValidationError);

    expect(() => parseStructuredContent("email", JSON.stringify(landingContent))).toThrow(ContentStudioValidationError);
  });

  it("accepts an internal CTA path and rejects executable CTA links", () => {
    expect(parseStructuredContent("landing_page", JSON.stringify({
      ...landingContent,
      ctaHref: "/database",
    }))).toMatchObject({ ctaHref: "/database" });

    expect(() => parseStructuredContent("landing_page", JSON.stringify({
      ...landingContent,
      ctaHref: "javascript:alert(1)",
    }))).toThrow(ContentStudioValidationError);
  });

  it("creates safe Hebrew and English slugs", () => {
    expect(slugifyHebrewEnglish("  קשר עמוק עם Hilit 2026! ")).toBe("קשר-עמוק-עם-hilit-2026");
    expect(slugifyHebrewEnglish("/// <script>x</script> ")).toBe("script-x-script");
    expect(slugifyHebrewEnglish("   ")).toBe("");
  });
});

describe("Content Studio generation and version shape", () => {
  it("mocks the LLM, persists a draft, version 1, and an in-app AI usage event", async () => {
    mocks.invokeLLM.mockResolvedValueOnce({
      choices: [{ message: { content: JSON.stringify(landingContent) } }],
      usage: { prompt_tokens: 123, completion_tokens: 45, total_tokens: 168 },
    });
    const { db, inserts } = createDbHarness();

    const result = await generateContentStudioDraft({
      db,
      actor: { identifier: "team@example.com" },
      value: {
        kind: "landing_page",
        title: "דף עומק",
        brief: "בריף איכותי לדף נחיתה עדין ומזמין",
      },
    });

    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
    expect(mocks.invokeLLM.mock.calls[0][0]).toMatchObject({ model: "gpt-5-mini" });
    expect(result.status).toBe("draft");
    expect(result.content).toEqual(landingContent);
    expect(inserts).toHaveLength(3);
    expect(inserts[0]).toMatchObject({ status: "draft", contentJson: JSON.stringify(landingContent) });
    expect(inserts[1]).toMatchObject({ documentId: 91, version: 1, contentJson: JSON.stringify(landingContent) });
    expect(inserts[2]).toMatchObject({
      channel: "in_app_ai",
      model: "gpt-5-mini",
      promptTokens: 123,
      completionTokens: 45,
    });
  });

  it("validates the updated version shape and appends version 2", async () => {
    const { db, inserts, updates } = createDbHarness();
    const revised = {
      ...landingContent,
      title: "כותרת חדשה",
    };

    const result = await updateContentStudioDocument({
      db,
      actor: { identifier: "team@example.com" },
      value: { id: 44, content: revised, title: "דף מעודכן" },
    });

    expect(result.version).toBe(2);
    expect(result.content).toEqual(revised);
    expect(updates[0]).toMatchObject({ title: "דף מעודכן", contentJson: JSON.stringify(revised) });
    expect(inserts[0]).toMatchObject({ documentId: 44, version: 2, contentJson: JSON.stringify(revised) });
  });
});
