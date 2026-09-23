import { z } from "zod";

/** Supported internal content formats. Content remains structured text only. */
export const contentStudioKindSchema = z.enum([
  "landing_page",
  "story",
  "ad_copy",
  "email",
  "course",
]);

export type ContentStudioKind = z.infer<typeof contentStudioKindSchema>;

const UNSAFE_TEXT_PATTERN = /<\s*\/?\s*(?:script|style|iframe|object|embed|svg|math)\b|<\s*\/?\s*[a-z][^>]*>|(?:java|vb)script\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const SCRIPT_OR_STYLE_BLOCK = /<\s*(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const HTML_TAG = /<\/?[^>]+>/g;

export class ContentStudioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentStudioValidationError";
  }
}

/**
 * Converts untrusted rich text into plain text. It intentionally removes markup,
 * executable URL schemes and control characters; the studio never stores HTML.
 */
export function sanitizeContentText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, "")
    .replace(SCRIPT_OR_STYLE_BLOCK, "")
    .replace(HTML_TAG, "")
    .replace(/(?:java|vb)script\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function safeText(max: number) {
  return z.string().trim().min(1).max(max).superRefine((value, ctx) => {
    if (UNSAFE_TEXT_PATTERN.test(value)) {
      ctx.addIssue({ code: "custom", message: "תוכן הסטודיו חייב להיות טקסט נקי ללא HTML או סקריפטים" });
    }
  });
}

const commonContentSchema = z.object({
  title: safeText(220),
  subtitle: safeText(700),
  tone: safeText(120),
  cta: safeText(180),
}).strict();

const safeHrefSchema = z.string().trim().min(1).max(500).refine(value => /^(https?:\/\/|mailto:|tel:|\/)/i.test(value), {
  message: "קישור הקריאה לפעולה אינו בטוח",
});

const landingSectionSchema = z.object({
  heading: safeText(220),
  body: safeText(3500),
  bullets: z.array(safeText(500)).min(1).max(8),
}).strict();

export const landingPageContentSchema = commonContentSchema.safeExtend({
  ctaHref: safeHrefSchema.optional(),
  sections: z.array(landingSectionSchema).min(2).max(12),
}).strict();

const storySlideSchema = z.object({
  title: safeText(180),
  body: safeText(900),
  cta: safeText(180),
}).strict();

export const storyContentSchema = commonContentSchema.safeExtend({
  slides: z.array(storySlideSchema).min(3).max(12),
}).strict();

const adVariantSchema = z.object({
  headline: safeText(180),
  primaryText: safeText(1200),
  description: safeText(500),
  cta: safeText(180),
}).strict();

export const adCopyContentSchema = commonContentSchema.safeExtend({
  variants: z.array(adVariantSchema).min(2).max(8),
}).strict();

export const emailContentSchema = commonContentSchema.safeExtend({
  subject: safeText(220),
  preheader: safeText(400),
  body: safeText(7000),
}).strict();

const courseModuleSchema = z.object({
  title: safeText(220),
  summary: safeText(1600),
}).strict();

const courseLessonSchema = z.object({
  moduleTitle: safeText(220),
  title: safeText(220),
  summary: safeText(1800),
  exercise: safeText(1800),
}).strict();

const courseWorkbookSchema = z.object({
  title: safeText(220),
  exercises: z.array(safeText(1800)).min(1).max(20),
}).strict();

export const courseContentSchema = commonContentSchema.safeExtend({
  promise: safeText(1000),
  modules: z.array(courseModuleSchema).min(2).max(16),
  lessons: z.array(courseLessonSchema).min(2).max(40),
  workbook: courseWorkbookSchema,
}).strict();

export const contentStudioContentSchema = z.union([
  landingPageContentSchema,
  storyContentSchema,
  adCopyContentSchema,
  emailContentSchema,
  courseContentSchema,
]);

export type LandingPageContent = z.infer<typeof landingPageContentSchema>;
export type StoryContent = z.infer<typeof storyContentSchema>;
export type AdCopyContent = z.infer<typeof adCopyContentSchema>;
export type EmailContent = z.infer<typeof emailContentSchema>;
export type CourseContent = z.infer<typeof courseContentSchema>;
export type ContentStudioContent = z.infer<typeof contentStudioContentSchema>;

const schemasByKind: Record<ContentStudioKind, z.ZodType> = {
  landing_page: landingPageContentSchema,
  story: storyContentSchema,
  ad_copy: adCopyContentSchema,
  email: emailContentSchema,
  course: courseContentSchema,
};

export function contentSchemaForKind(kind: ContentStudioKind): z.ZodType {
  return schemasByKind[kind];
}

function sanitizeUnknown(value: unknown): unknown {
  if (typeof value === "string") return sanitizeContentText(value);
  if (Array.isArray(value)) return value.map(sanitizeUnknown);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizeUnknown(item)]),
    );
  }
  return value;
}

function containsUnsafeText(value: unknown): boolean {
  if (typeof value === "string") return UNSAFE_TEXT_PATTERN.test(value);
  if (Array.isArray(value)) return value.some(containsUnsafeText);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsUnsafeText);
  }
  return false;
}

/** Rejects rich text, scripts and cross-kind shapes without modifying input. */
export function validateStructuredContent(kind: ContentStudioKind, value: unknown): ContentStudioContent {
  const result = contentSchemaForKind(kind).safeParse(value);
  if (!result.success) {
    throw new ContentStudioValidationError(`מבנה התוכן אינו תקין: ${result.error.issues[0]?.message || "שגיאת אימות"}`);
  }
  return result.data as ContentStudioContent;
}

/** Sanitizes every text leaf and then strictly validates the requested content kind. */
export function sanitizeStructuredContent(kind: ContentStudioKind, value: unknown): ContentStudioContent {
  if (containsUnsafeText(value)) {
    throw new ContentStudioValidationError("תוכן הסטודיו חייב להיות טקסט נקי ללא HTML או סקריפטים");
  }
  return validateStructuredContent(kind, sanitizeUnknown(value));
}

/** Parses stored JSON through the same sanitizer and strict per-kind validation gate. */
export function parseStructuredContent(kind: ContentStudioKind, contentJson: string): ContentStudioContent {
  try {
    return sanitizeStructuredContent(kind, JSON.parse(contentJson) as unknown);
  } catch (error) {
    if (error instanceof ContentStudioValidationError) throw error;
    throw new ContentStudioValidationError("לא ניתן לקרוא את תוכן הסטודיו השמור");
  }
}

const jsonString = (maxLength: number): Record<string, unknown> => ({
  type: "string",
  minLength: 1,
  maxLength,
});

const commonJsonProperties: Record<string, unknown> = {
  title: jsonString(220),
  subtitle: jsonString(700),
  tone: jsonString(120),
  cta: jsonString(180),
};

const strictJsonObject = (
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const outputSchemasByKind: Record<ContentStudioKind, Record<string, unknown>> = {
  landing_page: strictJsonObject({
    ...commonJsonProperties,
    ctaHref: jsonString(500),
    sections: {
      type: "array",
      minItems: 2,
      maxItems: 12,
      items: strictJsonObject({
        heading: jsonString(220),
        body: jsonString(3500),
        bullets: { type: "array", minItems: 1, maxItems: 8, items: jsonString(500) },
      }, ["heading", "body", "bullets"]),
    },
  }, ["title", "subtitle", "tone", "cta", "ctaHref", "sections"]),
  story: strictJsonObject({
    ...commonJsonProperties,
    slides: {
      type: "array",
      minItems: 3,
      maxItems: 12,
      items: strictJsonObject({
        title: jsonString(180),
        body: jsonString(900),
        cta: jsonString(180),
      }, ["title", "body", "cta"]),
    },
  }, ["title", "subtitle", "tone", "cta", "slides"]),
  ad_copy: strictJsonObject({
    ...commonJsonProperties,
    variants: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: strictJsonObject({
        headline: jsonString(180),
        primaryText: jsonString(1200),
        description: jsonString(500),
        cta: jsonString(180),
      }, ["headline", "primaryText", "description", "cta"]),
    },
  }, ["title", "subtitle", "tone", "cta", "variants"]),
  email: strictJsonObject({
    ...commonJsonProperties,
    subject: jsonString(220),
    preheader: jsonString(400),
    body: jsonString(7000),
  }, ["title", "subtitle", "tone", "cta", "subject", "preheader", "body"]),
  course: strictJsonObject({
    ...commonJsonProperties,
    promise: jsonString(1000),
    modules: {
      type: "array",
      minItems: 2,
      maxItems: 16,
      items: strictJsonObject({
        title: jsonString(220),
        summary: jsonString(1600),
      }, ["title", "summary"]),
    },
    lessons: {
      type: "array",
      minItems: 2,
      maxItems: 40,
      items: strictJsonObject({
        moduleTitle: jsonString(220),
        title: jsonString(220),
        summary: jsonString(1800),
        exercise: jsonString(1800),
      }, ["moduleTitle", "title", "summary", "exercise"]),
    },
    workbook: strictJsonObject({
      title: jsonString(220),
      exercises: { type: "array", minItems: 1, maxItems: 20, items: jsonString(1800) },
    }, ["title", "exercises"]),
  }, ["title", "subtitle", "tone", "cta", "promise", "modules", "lessons", "workbook"]),
};

/** JSON Schema sent to the LLM proxy. Every object is closed for strict output. */
export function structuredOutputSchemaForKind(kind: ContentStudioKind) {
  return {
    name: `hilit_content_studio_${kind}`,
    strict: true,
    schema: outputSchemasByKind[kind],
  };
}

export const safeSlugSchema = z.string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9\u0590-\u05ff]+(?:-[a-z0-9\u0590-\u05ff]+)*$/i, "הסלאג חייב לכלול אותיות עבריות או אנגליות, ספרות ומקפים בלבד");

/** Converts Hebrew or English titles to a conservative URL-safe slug. */
export function slugifyHebrewEnglish(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f\u0591-\u05c7]/g, "")
    .replace(/[^a-z0-9\u0590-\u05ff]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function isSafeSlug(value: string): boolean {
  return safeSlugSchema.safeParse(value).success;
}

export function contentToJson(kind: ContentStudioKind, value: unknown): string {
  return JSON.stringify(sanitizeStructuredContent(kind, value));
}

export function kindLabel(kind: ContentStudioKind): string {
  return {
    landing_page: "דף נחיתה",
    story: "סטורי",
    ad_copy: "קופי למודעה",
    email: "מייל",
    course: "קורס",
  }[kind];
}
