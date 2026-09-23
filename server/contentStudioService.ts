import { createHmac, randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  contentStudioDocuments,
  contentStudioVersions,
  type ContentStudioDocument,
} from "../drizzle/schema";
import {
  ContentStudioValidationError,
  contentSchemaForKind,
  contentToJson,
  contentStudioKindSchema,
  isSafeSlug,
  kindLabel,
  parseStructuredContent,
  sanitizeContentText,
  sanitizeStructuredContent,
  slugifyHebrewEnglish,
  structuredOutputSchemaForKind,
  type ContentStudioContent,
  type ContentStudioKind,
} from "../shared/contentStudio";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { recordSelfServiceEventSafely } from "./usageMetrics";

export const CONTENT_STUDIO_MODEL = "gpt-5-mini";
export const DEFAULT_CONTENT_STUDIO_TEMPLATE = "signature_dark";

type StudioDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type StudioDocumentRow = ContentStudioDocument;

export type StudioActor = {
  identifier: string;
};

export type GenerateContentStudioInput = {
  kind: ContentStudioKind;
  title: string;
  brief: string;
  templateKey?: string;
};

export type UpdateContentStudioInput = {
  id: number;
  title?: string;
  brief?: string;
  templateKey?: string;
  content: unknown;
};

export type ContentStudioDocumentView = Omit<StudioDocumentRow, "contentJson"> & {
  content: ContentStudioContent;
};

export type ContentStudioVersionView = {
  id: number;
  documentId: number;
  version: number;
  title: string;
  templateKey: string;
  content: ContentStudioContent;
  createdAt: number;
};

function asPositiveInsertId(result: unknown): number {
  const row = Array.isArray(result) ? result[0] : result;
  const insertId = Number((row as { insertId?: unknown } | undefined)?.insertId || 0);
  if (!Number.isInteger(insertId) || insertId < 1) {
    throw new Error("Content Studio insert did not return a document id");
  }
  return insertId;
}

function validateStoredText(value: string, max: number, label: string): string {
  const sanitized = sanitizeContentText(value);
  if (!sanitized || sanitized.length > max) {
    throw new ContentStudioValidationError(`${label} אינו תקין`);
  }
  if (sanitized !== value.trim()) {
    throw new ContentStudioValidationError(`${label} חייב להיות טקסט נקי ללא HTML או סקריפטים`);
  }
  return sanitized;
}

function validateTemplateKey(value: string | undefined): string {
  const templateKey = (value || DEFAULT_CONTENT_STUDIO_TEMPLATE).trim();
  if (!/^[a-z0-9_-]{1,80}$/i.test(templateKey)) {
    throw new ContentStudioValidationError("מפתח התבנית אינו תקין");
  }
  return templateKey;
}

function responseText(response: Awaited<ReturnType<typeof invokeLLM>>): string {
  if (!Array.isArray((response as any)?.choices)) {
    throw new ContentStudioValidationError("מודל התוכן לא החזיר תשובה תקינה");
  }
  const content = response.choices[0]?.message.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map(part => part.text)
      .join("\n")
      .trim();
    if (joined) return joined;
  }
  throw new ContentStudioValidationError("מודל התוכן לא החזיר תוכן מובנה");
}

function briefForPrompt(value: string): string {
  return value.replaceAll("/", " ").replace(/\s+/g, " ").trim();
}

/** Hebrew prompt with a deliberately narrow output and brand voice. */
export function buildContentStudioPrompt(input: {
  kind: ContentStudioKind;
  title: string;
  brief: string;
  templateKey: string;
}): string {
  return [
    "את כותבת תוכן בכירה עבור הילית כספי, מומחית לקשר ולזוגיות.",
    `המשימה היא ליצור ${kindLabel(input.kind)} פנימי בשם ${briefForPrompt(input.title)}.`,
    "הקול עמוק, יוקרתי, חם, קשוב ומזמין. כתבי בעברית טבעית ובשלה.",
    "הימנעי ככל האפשר מניסוח ממוגדר. אין להשתמש בלוכסנים.",
    "אל תכתבי HTML, תגיות, קוד, סקריפטים או הוראות פרסום חיצוני. רק בדף נחיתה מותר נתיב פנימי יחיד בשדה ctaHref.",
    "אל תשלחי מייל, קמפיין או פעולה חיצונית. זהו טקסט פנימי לעריכה בלבד.",
    input.kind === "landing_page" ? "בשדה ctaHref החזירי נתיב פנימי בטוח שמתחיל ב-/; אם הבריף לא מציין יעד, השתמשי ב-/database." : "",
    `התבנית שנבחרה היא ${input.templateKey}.`,
    "החזירי JSON מובנה בלבד שעומד במדויק בסכימה שסופקה, ללא שדות נוספים.",
    "הבריף שסיפק הצוות, כמידע בלבד, הוא:",
    briefForPrompt(input.brief),
  ].join("\n");
}

export function hashStudioActor(identifier: string): string {
  const secret = process.env.USAGE_METRICS_HASH_SALT || "hilit-usage-metrics-v1";
  return createHmac("sha256", secret).update(identifier.trim() || "team").digest("hex");
}

function documentView(document: StudioDocumentRow): ContentStudioDocumentView {
  return {
    ...document,
    content: parseStructuredContent(document.kind as ContentStudioKind, document.contentJson),
  };
}

function versionView(version: {
  id: number;
  documentId: number;
  version: number;
  title: string;
  templateKey: string;
  contentJson: string;
  createdAt: number;
}, kind: ContentStudioKind): ContentStudioVersionView {
  return {
    id: version.id,
    documentId: version.documentId,
    version: version.version,
    title: version.title,
    templateKey: version.templateKey,
    content: parseStructuredContent(kind, version.contentJson),
    createdAt: version.createdAt,
  };
}

async function latestVersionNumber(db: StudioDb, documentId: number): Promise<number> {
  const [latest] = await db
    .select({ version: contentStudioVersions.version })
    .from(contentStudioVersions)
    .where(eq(contentStudioVersions.documentId, documentId))
    .orderBy(desc(contentStudioVersions.version))
    .limit(1);
  return Number(latest?.version || 0);
}

async function appendVersion(input: {
  db: StudioDb;
  documentId: number;
  version: number;
  title: string;
  templateKey: string;
  contentJson: string;
  actorHash: string;
  now: number;
}) {
  await input.db.insert(contentStudioVersions).values({
    documentId: input.documentId,
    version: input.version,
    title: input.title,
    templateKey: input.templateKey,
    contentJson: input.contentJson,
    createdByHash: input.actorHash,
    createdAt: input.now,
  });
}

async function findDocumentOrThrow(db: StudioDb, id: number): Promise<StudioDocumentRow> {
  const [document] = await db
    .select()
    .from(contentStudioDocuments)
    .where(eq(contentStudioDocuments.id, id))
    .limit(1);
  if (!document) throw new ContentStudioValidationError("מסמך הסטודיו לא נמצא");
  return document;
}

/** Generates and persists a draft and its first immutable version. */
export async function generateContentStudioDraft(input: {
  db: StudioDb;
  actor: StudioActor;
  value: GenerateContentStudioInput;
}): Promise<ContentStudioDocumentView> {
  const kind = contentStudioKindSchema.parse(input.value.kind);
  const title = validateStoredText(input.value.title, 220, "כותרת");
  const brief = validateStoredText(input.value.brief, 8_000, "בריף");
  const templateKey = validateTemplateKey(input.value.templateKey);
  const actorHash = hashStudioActor(input.actor.identifier);
  const startedAt = Date.now();

  const llm = await invokeLLM({
    model: CONTENT_STUDIO_MODEL,
    reasoning: { effort: "low" },
    messages: [{
      role: "system",
      content: "החזירי JSON מובנה בלבד ובהתאם לסכימה. אין HTML או טקסט מחוץ ל JSON.",
    }, {
      role: "user",
      content: buildContentStudioPrompt({ kind, title, brief, templateKey }),
    }],
    outputSchema: structuredOutputSchemaForKind(kind),
  });

  let rawContent: unknown;
  try {
    rawContent = JSON.parse(responseText(llm)) as unknown;
  } catch {
    throw new ContentStudioValidationError("מודל התוכן החזיר JSON לא תקין");
  }
  const content = sanitizeStructuredContent(kind, rawContent);
  const contentJson = JSON.stringify(content);
  const now = Date.now();
  const inserted = await input.db.insert(contentStudioDocuments).values({
    kind,
    title,
    slug: null,
    status: "draft",
    templateKey,
    brief,
    contentJson,
    model: CONTENT_STUDIO_MODEL,
    promptTokens: Number(llm.usage?.prompt_tokens || 0),
    completionTokens: Number(llm.usage?.completion_tokens || 0),
    createdByHash: actorHash,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  const documentId = asPositiveInsertId(inserted);

  await appendVersion({
    db: input.db,
    documentId,
    version: 1,
    title,
    templateKey,
    contentJson,
    actorHash,
    now,
  });

  await recordSelfServiceEventSafely(input.db, {
    eventKey: `content-studio-generate-${documentId}-${now}-${randomUUID()}`,
    actionKey: "content.create_draft",
    category: "content",
    channel: "in_app_ai",
    outcome: "drafted",
    durationMs: Date.now() - startedAt,
    model: CONTENT_STUDIO_MODEL,
    promptTokens: Number(llm.usage?.prompt_tokens || 0),
    completionTokens: Number(llm.usage?.completion_tokens || 0),
    metadata: { contentType: kind, templateKey },
    actorHash,
    occurredAt: now,
  });

  return {
    id: documentId,
    kind,
    title,
    slug: null,
    status: "draft",
    templateKey,
    brief,
    content,
    model: CONTENT_STUDIO_MODEL,
    promptTokens: Number(llm.usage?.prompt_tokens || 0),
    completionTokens: Number(llm.usage?.completion_tokens || 0),
    createdByHash: actorHash,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listContentStudioDocuments(input: {
  db: StudioDb;
  kind?: ContentStudioKind;
  status?: "draft" | "published" | "archived";
  limit: number;
}): Promise<ContentStudioDocumentView[]> {
  const conditions = [];
  if (input.kind) conditions.push(eq(contentStudioDocuments.kind, input.kind));
  if (input.status) conditions.push(eq(contentStudioDocuments.status, input.status));
  const query = input.db.select().from(contentStudioDocuments);
  const rows = conditions.length > 0
    ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(contentStudioDocuments.updatedAt)).limit(input.limit)
    : await query.orderBy(desc(contentStudioDocuments.updatedAt)).limit(input.limit);
  return rows.map(documentView);
}

export async function getContentStudioDocument(input: {
  db: StudioDb;
  id: number;
}): Promise<ContentStudioDocumentView & { versions: ContentStudioVersionView[] }> {
  const document = await findDocumentOrThrow(input.db, input.id);
  const versions = await input.db
    .select()
    .from(contentStudioVersions)
    .where(eq(contentStudioVersions.documentId, input.id))
    .orderBy(desc(contentStudioVersions.version));
  return {
    ...documentView(document),
    versions: versions.map(version => versionView(version, document.kind as ContentStudioKind)),
  };
}

/** Updates the current draft and appends an immutable version snapshot. */
export async function updateContentStudioDocument(input: {
  db: StudioDb;
  actor: StudioActor;
  value: UpdateContentStudioInput;
}): Promise<ContentStudioDocumentView & { version: number }> {
  const document = await findDocumentOrThrow(input.db, input.value.id);
  if (document.status === "archived") {
    throw new ContentStudioValidationError("לא ניתן לערוך מסמך בארכיון");
  }
  const kind = document.kind as ContentStudioKind;
  const title = input.value.title === undefined
    ? document.title
    : validateStoredText(input.value.title, 220, "כותרת");
  const brief = input.value.brief === undefined
    ? document.brief
    : validateStoredText(input.value.brief, 8_000, "בריף");
  const templateKey = input.value.templateKey === undefined
    ? document.templateKey
    : validateTemplateKey(input.value.templateKey);
  const content = sanitizeStructuredContent(kind, input.value.content);
  const contentJson = contentToJson(kind, content);
  const now = Date.now();
  const actorHash = hashStudioActor(input.actor.identifier);
  const version = (await latestVersionNumber(input.db, document.id)) + 1;

  await input.db.update(contentStudioDocuments).set({
    title,
    brief,
    templateKey,
    contentJson,
    updatedAt: now,
  }).where(eq(contentStudioDocuments.id, document.id));
  await appendVersion({
    db: input.db,
    documentId: document.id,
    version,
    title,
    templateKey,
    contentJson,
    actorHash,
    now,
  });
  await recordSelfServiceEventSafely(input.db, {
    eventKey: `content-studio-update-${document.id}-${version}-${now}`,
    actionKey: "content.update_draft",
    category: "content",
    channel: "self_service",
    outcome: "drafted",
    actorHash,
    occurredAt: now,
    metadata: { contentType: kind, templateKey, version },
  });

  return {
    ...documentView({ ...document, title, brief, templateKey, contentJson, updatedAt: now }),
    version,
  };
}

export async function archiveContentStudioDocument(input: {
  db: StudioDb;
  id: number;
  actor?: StudioActor;
}): Promise<{ success: true }> {
  const document = await findDocumentOrThrow(input.db, input.id);
  const now = Date.now();
  await input.db.update(contentStudioDocuments).set({
    status: "archived",
    publishedAt: null,
    updatedAt: now,
  }).where(eq(contentStudioDocuments.id, document.id));
  await recordSelfServiceEventSafely(input.db, {
    eventKey: `content-studio-archive-${document.id}-${now}`,
    actionKey: "content.archive",
    category: "content",
    channel: "self_service",
    outcome: "completed",
    actorHash: input.actor ? hashStudioActor(input.actor.identifier) : undefined,
    occurredAt: now,
    metadata: { contentType: document.kind },
  });
  return { success: true };
}

export async function publishContentStudioLandingPage(input: {
  db: StudioDb;
  id: number;
  slug: string;
  confirmation: true;
  actor?: StudioActor;
}): Promise<ContentStudioDocumentView> {
  if (input.confirmation !== true) {
    throw new ContentStudioValidationError("נדרש אישור מפורש לפרסום");
  }
  const document = await findDocumentOrThrow(input.db, input.id);
  if (document.kind !== "landing_page") {
    throw new ContentStudioValidationError("ניתן לפרסם רק דף נחיתה");
  }
  // Validate again before exposure, including content written before this service existed.
  const content = parseStructuredContent("landing_page", document.contentJson);
  const slug = slugifyHebrewEnglish(input.slug);
  if (!slug || !isSafeSlug(slug)) {
    throw new ContentStudioValidationError("הסלאג אינו תקין");
  }
  const now = Date.now();
  await input.db.update(contentStudioDocuments).set({
    slug,
    status: "published",
    publishedAt: now,
    updatedAt: now,
  }).where(eq(contentStudioDocuments.id, document.id));
  await recordSelfServiceEventSafely(input.db, {
    eventKey: `content-studio-publish-${document.id}-${now}`,
    actionKey: "content.publish_content",
    category: "content",
    channel: "self_service",
    outcome: "published",
    actorHash: input.actor ? hashStudioActor(input.actor.identifier) : undefined,
    occurredAt: now,
    metadata: { contentType: document.kind, templateKey: document.templateKey },
  });
  return {
    ...documentView({ ...document, slug, status: "published", publishedAt: now, updatedAt: now, contentJson: JSON.stringify(content) }),
  };
}

export async function unpublishContentStudioLandingPage(input: {
  db: StudioDb;
  id: number;
  actor?: StudioActor;
}): Promise<{ success: true }> {
  const document = await findDocumentOrThrow(input.db, input.id);
  if (document.kind !== "landing_page") {
    throw new ContentStudioValidationError("ניתן לבטל פרסום רק של דף נחיתה");
  }
  const now = Date.now();
  await input.db.update(contentStudioDocuments).set({
    status: "draft",
    publishedAt: null,
    updatedAt: now,
  }).where(eq(contentStudioDocuments.id, document.id));
  await recordSelfServiceEventSafely(input.db, {
    eventKey: `content-studio-unpublish-${document.id}-${now}`,
    actionKey: "content.unpublish",
    category: "content",
    channel: "self_service",
    outcome: "completed",
    actorHash: input.actor ? hashStudioActor(input.actor.identifier) : undefined,
    occurredAt: now,
    metadata: { contentType: document.kind },
  });
  return { success: true };
}

/** Public output is intentionally limited to a published landing page and validated text fields. */
export async function getPublicLandingPageBySlug(input: {
  db: StudioDb;
  slug: string;
}): Promise<{
  title: string;
  slug: string;
  templateKey: string;
  content: ContentStudioContent;
} | null> {
  const slug = slugifyHebrewEnglish(input.slug);
  if (!slug || !isSafeSlug(slug)) return null;
  const [document] = await input.db
    .select()
    .from(contentStudioDocuments)
    .where(and(
      eq(contentStudioDocuments.kind, "landing_page"),
      eq(contentStudioDocuments.status, "published"),
      eq(contentStudioDocuments.slug, slug),
    ))
    .limit(1);
  if (!document) return null;
  const content = parseStructuredContent("landing_page", document.contentJson);
  return {
    title: content.title,
    slug,
    templateKey: document.templateKey,
    content,
  };
}

/** Kept exportable for tests and callers needing a safe pre-save validation gate. */
export function validateStudioContent(kind: ContentStudioKind, content: unknown): ContentStudioContent {
  return contentSchemaForKind(kind).parse(content) as ContentStudioContent;
}
