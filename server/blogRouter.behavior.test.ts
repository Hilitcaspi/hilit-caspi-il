import { readFileSync } from "node:fs";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
import { blogPosts, type BlogPost } from "../drizzle/schema";
import { publicProcedure, router, teamProcedure } from "./_core/trpc";
import type { TrpcContext } from "./_core/context";
import { isSafeBlogCoverImage, sanitizeBlogContent } from "./blogContent";

// Compile the actual blog block, without loading unrelated payment/provider routers.
const source = ts.createSourceFile("routers.ts", readFileSync(new URL("./routers.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
let blogBlock = "";
function findBlog(node: ts.Node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(source) === "blog") blogBlock = node.initializer.getText(source);
  ts.forEachChild(node, findBlog);
}
findBlog(source);
if (!blogBlock) throw new Error("Blog router block not found");
const getDb = vi.fn();
const compiled = ts.transpileModule(`const blogRouter = ${blogBlock};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const blogRouter = new Function("router", "publicProcedure", "teamProcedure", "z", "getDb", "blogPosts", "eq", "and", "desc", "TRPCError", "sanitizeBlogContent", "isSafeBlogCoverImage", `${compiled}\nreturn blogRouter;`)(
  router, publicProcedure, teamProcedure, z, getDb, blogPosts, eq, and, desc, TRPCError, sanitizeBlogContent, isSafeBlogCoverImage,
);
const now = 1_800_000_000_000;
const dialect = new MySqlDialect();
const fixture = (overrides: Partial<BlogPost> = {}): BlogPost => ({
  id: 41, title: "מאמר בדיקה", slug: "synthetic-article", excerpt: "תקציר בדיקה",
  content: "<h2>כותרת</h2><p>תוכן בדיקה</p>", coverImage: "/manus-storage/cover.webp",
  metaDescription: "תיאור בדיקה", tags: "זוגיות,אהבה", isPublished: false,
  publishedAt: 0, createdAt: now - 100_000, updatedAt: now - 50_000, ...overrides,
});
function context(role: "admin" | "user" | "team" | null = "admin"): TrpcContext {
  return {
    user: role === "admin" || role === "user" ? {
      id: 1, openId: "synthetic-blog-admin", name: "Synthetic Admin", email: "test@example.test",
      loginMethod: "manus", role, createdAt: new Date(0), updatedAt: new Date(0), lastSignedIn: new Date(0),
    } : null,
    teamMember: role === "team" ? { id: 5, name: "Synthetic staff", role: "admin" } as TrpcContext["teamMember"] : null,
    req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"],
  };
}
function harness(initial: BlogPost[] = []) {
  const rows = initial.map(row => ({ ...row }));
  const writes: Record<string, unknown>[] = [];
  const predicates: { sql: string; params: unknown[] }[] = [];
  function matches(row: BlogPost, predicate?: SQL) {
    if (!predicate) return true;
    const query = dialect.sqlToQuery(predicate);
    const keys = Array.from(query.sql.matchAll(/`blog_posts`\.`(id|slug|isPublished)` = \?/g), match => match[1]);
    return keys.every((key, index) => row[key as keyof BlogPost] === query.params[index]);
  }
  const db = {
    select: vi.fn((projection?: Record<string, unknown>) => {
      let predicate: SQL | undefined;
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn((where: SQL) => { predicate = where; predicates.push(dialect.sqlToQuery(where)); return chain; }),
        orderBy: vi.fn(() => chain),
        limit: vi.fn(async (limit: number) => rows.filter(row => matches(row, predicate)).slice(0, limit).map(row =>
          projection ? Object.fromEntries(Object.keys(projection).map(key => [key, row[key as keyof BlogPost]])) : { ...row })),
      };
      return chain;
    }),
    update: vi.fn(() => ({ set: vi.fn((patch: Record<string, unknown>) => ({
      where: vi.fn(async (predicate: SQL) => {
        writes.push(patch);
        rows.filter(row => matches(row, predicate)).forEach(row => Object.assign(row, patch));
        return [{ affectedRows: 1 }];
      }),
    })) })),
    insert: vi.fn(() => ({ values: vi.fn(async (values: Record<string, unknown>) => {
      writes.push(values); rows.push({ id: 901, ...values } as BlogPost);
      return [{ insertId: 901 }, []];
    }) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => [{ affectedRows: 1 }]) })),
  };
  getDb.mockResolvedValue(db);
  return { db, rows, writes, predicates };
}
const input = (overrides: Record<string, unknown> = {}) => ({
  title: "מאמר בדיקה", slug: "synthetic-article", excerpt: "תקציר בדיקה",
  content: "<h2>כותרת</h2><p>תוכן בדיקה</p>", ...overrides,
});

describe("blog router publishing and protected editing (mock DB only)", () => {
  beforeEach(() => { vi.restoreAllMocks(); getDb.mockReset(); vi.spyOn(Date, "now").mockReturnValue(now); });

  it.each([null, "user"] as const)("denies admin reads and writes for role %s", async role => {
    const { db } = harness([fixture()]);
    const caller = blogRouter.createCaller(context(role));
    for (const operation of [() => caller.listAdmin(), () => caller.getForEdit({ id: 41 }), () => caller.upsert(input()), () => caller.delete({ id: 41 })]) {
      await expect(operation()).rejects.toMatchObject({ code: role ? "FORBIDDEN" : "UNAUTHORIZED" });
    }
    expect(getDb).not.toHaveBeenCalled(); expect(db.insert).not.toHaveBeenCalled();
  });

  it.each(["admin", "team"] as const)("loads full drafts and published records for %s", async role => {
    harness([fixture(), fixture({ id: 42, isPublished: true, publishedAt: now - 5000 })]);
    const caller = blogRouter.createCaller(context(role));
    const list = await caller.listAdmin();
    expect(list).toHaveLength(2); expect(list[0]).toMatchObject(fixture());
    expect(await caller.getForEdit({ id: 41 })).toEqual(fixture());
  });

  it("never leaks drafts from either public query, even to a logged-in admin", async () => {
    const { predicates } = harness([fixture(), fixture({ id: 42, slug: "public", isPublished: true, publishedAt: now - 100 })]);
    const caller = blogRouter.createCaller(context());
    const list = await caller.list();
    expect(list.map((post: BlogPost) => post.id)).toEqual([42]);
    expect(list[0]).toMatchObject({ createdAt: now - 100_000, updatedAt: now - 50_000 });
    await expect(caller.getBySlug({ slug: "synthetic-article" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(predicates.every(query => query.sql.includes("`isPublished` = ?"))).toBe(true);
  });

  it("sanitizes legacy public HTML on read without mutating stored content", async () => {
    const { rows, writes } = harness([fixture({ isPublished: true, content: '<p onclick="evil()">שלום</p><script>evil()</script>' })]);
    const result = await blogRouter.createCaller(context(null)).getBySlug({ slug: "synthetic-article" });
    expect(result.content).toBe("<p>שלום</p>"); expect(rows[0].content).toContain("<script>"); expect(writes).toEqual([]);
  });

  it("creates a draft by default with the NOT NULL zero publication sentinel", async () => {
    const { writes } = harness();
    expect(await blogRouter.createCaller(context()).upsert(input({ publishedAt: now - 20_000 }))).toEqual({ id: 901 });
    expect(writes[0]).toMatchObject({ isPublished: false, publishedAt: 0, createdAt: now, updatedAt: now });
  });

  it("allows an explicit publication date only for a newly published article", async () => {
    const { writes } = harness();
    await blogRouter.createCaller(context()).upsert(input({ isPublished: true, publishedAt: now - 20_000 }));
    expect(writes[0]).toMatchObject({ isPublished: true, publishedAt: now - 20_000 });
  });

  it("uses the real first-publication time for an unpublished record with a zero timestamp", async () => {
    const { rows, writes } = harness([fixture()]);
    await blogRouter.createCaller(context()).upsert(input({ id: 41, isPublished: true, publishedAt: now - 900_000 }));
    expect(rows[0]).toMatchObject({ isPublished: true, publishedAt: now, updatedAt: now });
    expect(writes[0]).not.toHaveProperty("id");
  });

  it("preserves publication dates across edits, unpublishing, and republication", async () => {
    const originalDate = now - 700_000;
    const { rows } = harness([fixture({ isPublished: true, publishedAt: originalDate })]);
    const caller = blogRouter.createCaller(context());
    await caller.upsert(input({ id: 41, title: "כותרת מעודכנת", publishedAt: now }));
    expect(rows[0]).toMatchObject({ isPublished: true, publishedAt: originalDate });
    await caller.upsert(input({ id: 41, isPublished: false }));
    await caller.upsert(input({ id: 41, isPublished: true }));
    expect(rows[0].publishedAt).toBe(originalDate);
  });

  it("preserves legacy nonzero dates on drafts rather than silently rewriting history", async () => {
    const { rows } = harness([fixture({ publishedAt: now - 100_000 })]);
    await blogRouter.createCaller(context()).upsert(input({ id: 41, isPublished: true }));
    expect(rows[0].publishedAt).toBe(now - 100_000);
  });

  it("does not bump updatedAt on no-op saves and preserves omitted optional fields", async () => {
    const { db, rows } = harness([fixture({ isPublished: true, publishedAt: now - 100_000 })]);
    await blogRouter.createCaller(context()).upsert(input({ id: 41 }));
    expect(db.update).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ updatedAt: now - 50_000, coverImage: "/manus-storage/cover.webp", tags: "זוגיות,אהבה", isPublished: true });
  });

  it("sanitizes submitted HTML, normalizes tags, and intentionally clears empty optional fields", async () => {
    const { rows } = harness([fixture()]);
    await blogRouter.createCaller(context()).upsert(input({ id: 41, content: '<p onmouseover="evil()">שלום</p><script>evil()</script>', tags: " אהבה, זוגיות,אהבה, ,", coverImage: "", metaDescription: "" }));
    expect(rows[0]).toMatchObject({ content: "<p>שלום</p>", tags: "אהבה,זוגיות", coverImage: null, metaDescription: null, updatedAt: now });
  });

  it("rejects an unknown edit ID and HTML that becomes empty after sanitization", async () => {
    const { writes } = harness();
    const caller = blogRouter.createCaller(context());
    await expect(caller.getForEdit({ id: 41 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.upsert(input({ id: 41 }))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.upsert(input({ content: "<script>evil()</script>" }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(writes).toEqual([]);
  });

  it.each(["javascript:evil()", "data:image/svg+xml,evil", "//evil.example/cover", "/\\evil.example/cover"])("rejects unsafe cover URL %s", async coverImage => {
    const { writes } = harness();
    await expect(blogRouter.createCaller(context()).upsert(input({ coverImage }))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(writes).toEqual([]);
  });
});
