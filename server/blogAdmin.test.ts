import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute only this scoped page with synthetic hooks; no client transport or providers.
const source = ts.createSourceFile("BlogAdmin.tsx", readFileSync(new URL("../client/src/pages/BlogAdmin.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const normalizeSource = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "normalizeTags")!.getText(source);
const formSource = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "BlogPostForm")!.getText(source);
const pageSource = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "BlogAdmin")!.getText(source).replace("export default ", "");
function compile(code: string) {
  return ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
}
function getForm(states?: unknown[]) {
  let index = 0;
  const useState = (initial: unknown) => [states?.[index++] ?? initial, vi.fn()];
  const Button = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement("button", props);
  const error = vi.fn();
  return new Function("useState", "React", "Button", "toast", `${compile(`${normalizeSource}\n${formSource}`)}\nreturn BlogPostForm;`)(useState, React, Button, { error });
}
const fixture = (overrides: Record<string, unknown> = {}) => ({
  id: 41, title: "מאמר מלא", slug: "complete", excerpt: "תקציר מלא", content: "<h2>תוכן מלא</h2>",
  coverImage: "/manus-storage/original.webp", metaDescription: "תיאור מקורי", tags: '[" אהבה ","זוגיות","אהבה"]',
  isPublished: false, publishedAt: 0, createdAt: 1000, updatedAt: 2000, ...overrides,
});
function flatten(tree: any): any[] {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(flatten)];
}
function page(options: { role?: "admin" | "user" | null; editing?: number | "new" | null; full?: ReturnType<typeof fixture>; loading?: boolean; error?: Error } = {}) {
  const role = options.role === undefined ? "admin" : options.role;
  const auth = vi.fn(() => ({ user: role ? { role } : null, loading: false }));
  const listQuery = vi.fn(() => ({ data: [fixture()], isLoading: false, refetch: vi.fn() }));
  const editQuery = vi.fn(() => ({ data: options.full, isLoading: !!options.loading, error: options.error }));
  const mutate = vi.fn();
  const setEditing = vi.fn();
  let stateIndex = 0;
  const useState = (initial: unknown) => stateIndex++ === 0 ? [options.editing ?? null, setEditing] : [initial, vi.fn()];
  const ui = ({ children, ...props }: any) => React.createElement("div", props, children);
  const icon = () => null;
  const mockTrpc = { useUtils: () => ({ blog: Object.fromEntries(["getForEdit", "list", "getBySlug"].map(key => [key, { invalidate: vi.fn() }])) }), blog: {
    listAdmin: { useQuery: listQuery }, getForEdit: { useQuery: editQuery },
    upsert: { useMutation: () => ({ mutate }) }, delete: { useMutation: () => ({ mutate: vi.fn() }) },
  } };
  const Component = new Function("React", "useState", "trpc", "useAuth", "getLoginUrl", "Button", "Card", "CardContent", "CardHeader", "CardTitle", "toast", "format", "he", "Plus", "Edit2", "Trash2", "Eye", "ArrowRight", `${compile(`${normalizeSource}\n${formSource}\n${pageSource}`)}\nreturn BlogAdmin;`)(
    React, useState, mockTrpc, auth, vi.fn(() => "/login"), ui, ui, ui, ui, ui, { error: vi.fn(), success: vi.fn() }, vi.fn(() => "01/01/2026"), {}, icon, icon, icon, icon, icon,
  );
  const tree = Component();
  return { tree, markup: () => renderToStaticMarkup(tree), listQuery, editQuery, mutate, setEditing };
}

describe("blog admin isolated rendering and submission", () => {
  it("defaults new articles to unpublished and labels the action save draft", () => {
    const Form = getForm();
    const tree = Form({ onSave: vi.fn(), onCancel: vi.fn() });
    const checkbox = flatten(tree).find(node => node.type === "input" && node.props.type === "checkbox");
    expect(checkbox.props.checked).toBe(false);
    expect(renderToStaticMarkup(tree)).toContain("שמור טיוטה");
  });

  it("loads original body, cover, metadata and normalized legacy JSON tags into an edit form", () => {
    const Form = getForm();
    const markup = renderToStaticMarkup(Form({ post: fixture(), onSave: vi.fn(), onCancel: vi.fn() }));
    expect(markup).toContain("&lt;h2&gt;תוכן מלא&lt;/h2&gt;");
    expect(markup).toContain('/manus-storage/original.webp');
    expect(markup).toContain('value="תיאור מקורי"');
    expect(markup).toContain('value="אהבה,זוגיות"');
  });

  it("submits the cover field, normalized tags, and an explicit false publication flag", () => {
    const Form = getForm(); const onSave = vi.fn();
    const tree = Form({ post: fixture(), onSave, onCancel: vi.fn() });
    const preventDefault = vi.fn(); tree.props.onSubmit({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 41, content: "<h2>תוכן מלא</h2>", coverImage: "/manus-storage/original.webp", metaDescription: "תיאור מקורי", tags: "אהבה,זוגיות", isPublished: false }));
  });

  it.each([null, "user"] as const)("disables protected data loading for %s", role => {
    const { listQuery, editQuery, markup, mutate } = page({ role, editing: 41 });
    expect(listQuery.mock.calls[0][1]).toMatchObject({ enabled: false });
    expect(editQuery.mock.calls[0][1]).toMatchObject({ enabled: false });
    expect(markup()).toContain("נדרשת הרשאת ניהול"); expect(mutate).not.toHaveBeenCalled();
  });

  it("uses protected listAdmin and blocks editing until getForEdit loads the correct full record", () => {
    const { listQuery, editQuery, tree, markup } = page({ editing: 41, loading: true });
    expect(listQuery.mock.calls[0]).toEqual([{ limit: 50 }, { enabled: true }]);
    expect(editQuery.mock.calls[0]).toEqual([{ id: 41 }, { enabled: true }]);
    expect(markup()).toContain("טוען את תוכן המאמר המלא");
    expect(flatten(tree).some(node => node.type?.name === "BlogPostForm")).toBe(false);
    const stale = page({ editing: 41, full: fixture({ id: 42 }) });
    expect(stale.markup()).toContain("טוען את תוכן המאמר המלא");
  });

  it("keys each loaded edit form by ID and passes the complete protected record to saving", () => {
    const full = fixture(); const { tree, mutate } = page({ editing: 41, full });
    const form = flatten(tree).find(node => node.type?.name === "BlogPostForm");
    expect(form.key).toBe(".$41"); expect(form.props.post).toEqual(full);
    form.props.onSave(full);
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ id: 41, content: full.content, coverImage: full.coverImage, metaDescription: full.metaDescription, tags: full.tags, isPublished: false }));
  });

  it("opens editing by ID and does not show a public preview for a draft", () => {
    const { tree, setEditing } = page();
    const elements = flatten(tree);
    const edit = elements.find(node => node.props.className?.includes("text-blue-700"));
    edit.props.onClick(); expect(setEditing).toHaveBeenCalledWith(41);
    expect(elements.some(node => node.type === "a" && node.props.href === "/blog/complete")).toBe(false);
  });

  it("renders a protected edit loading error rather than an empty overwriting form", () => {
    const { tree, markup } = page({ editing: 41, error: new Error("Synthetic failure") });
    expect(markup()).toContain("Synthetic failure");
    expect(flatten(tree).some(node => node.type?.name === "BlogPostForm")).toBe(false);
  });
});
