import { describe, expect, it } from "vitest";
import { isSafeBlogCoverImage, sanitizeBlogContent } from "./blogContent";

describe("blog HTML allowlist", () => {
  it("preserves semantic article HTML, Hebrew, links, lists, images and tables", () => {
    const html = '<h2 id="faq">שאלות נפוצות</h2><p dir="rtl">שלום <strong>עולם</strong></p><ul><li>אהבה</li></ul><a href="/blog/next">המשך</a><figure><img src="https://cdn.example.test/image.webp" alt="תיאור" loading="lazy" /><figcaption>תיאור</figcaption></figure><table><tbody><tr><th scope="row">בדיקה</th><td>כן</td></tr></tbody></table>';
    expect(sanitizeBlogContent(html)).toBe(html);
  });

  it("removes scripts, styles, embedded documents, event handlers and unsafe attributes", () => {
    const html = '<script>evil()</script><style>evil</style><iframe src="https://evil.test"></iframe><object data="evil"></object><embed src="evil"><form><input autofocus onfocus="evil()"></form><p onclick="evil()" style="background:url(evil)" class="hidden">safe</p><img src="/image.webp" onerror="evil()" srcset="evil 2x">';
    const safe = sanitizeBlogContent(html);
    expect(safe).toContain("<p>safe</p>");
    expect(safe).toContain('<img src="/image.webp" />');
    expect(safe).not.toMatch(/script|style|iframe|object|embed|form|input|onclick|onerror|srcset|class=/i);
  });

  it.each([
    "javascript:alert(1)", "java&#x73;cript:alert(1)", "java&#10;script:alert(1)",
    "data:text/html,evil", "vbscript:evil()", "//evil.example.test",
  ])("strips an active or protocol-relative link URL: %s", href => {
    const result = sanitizeBlogContent(`<a href="${href}">safe</a>`);
    expect(result).toBe("<a>safe</a>");
  });

  it("blocks SVG, data images, unsafe image schemes and structural injection", () => {
    const result = sanitizeBlogContent('<svg><a xlink:href="javascript:evil()">bad</a></svg><math><mi href="evil">bad</mi></math><img src="data:image/svg+xml,evil"><img src="mailto:evil@example.test"><p>safe</p>');
    expect(result).not.toMatch(/svg|math|xlink|javascript|data:|mailto:/i);
    expect(result).toContain("<p>safe</p>");
  });

  it("secures links opened in a new tab and preserves contact/internal links", () => {
    expect(sanitizeBlogContent('<a href="https://example.test" target="_blank" rel="opener">safe</a>'))
      .toBe('<a href="https://example.test" target="_blank" rel="noopener noreferrer">safe</a>');
    expect(sanitizeBlogContent('<a href="tel:0500000000" target="unsafe">call</a><a href="mailto:test@example.test">email</a><a href="#faq">FAQ</a>'))
      .toBe('<a href="tel:0500000000">call</a><a href="mailto:test@example.test">email</a><a href="#faq">FAQ</a>');
  });

  it("is idempotent for malformed and normal legacy HTML", () => {
    const input = '<p><strong>שלום</p><a target="_blank" href="https://example.test">קישור</a><script>evil()</script>';
    expect(sanitizeBlogContent(sanitizeBlogContent(input))).toBe(sanitizeBlogContent(input));
  });
});

describe("blog cover image URLs", () => {
  it.each(["", "/manus-storage/cover.webp", "https://cdn.example.test/cover.webp", "http://cdn.example.test/cover.webp"])("permits safe URL %s", url => {
    expect(isSafeBlogCoverImage(url)).toBe(true);
  });
  it.each(["javascript:evil()", "data:image/svg+xml,evil", "//evil.example.test", "/\\evil.test", "https://user:password@example.test/a", "https://example.test/\ncover.webp"])("rejects unsafe URL %s", url => {
    expect(isSafeBlogCoverImage(url)).toBe(false);
  });
});
