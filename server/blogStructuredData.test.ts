import { describe, expect, it } from "vitest";
import { blogStructuredData, serializeStructuredData } from "../shared/blogStructuredData";

const post = { title: "סיפור ההיכרות", slug: "story", excerpt: "תקציר", publishedAt: Date.parse("2026-11-15T12:00:00Z"), updatedAt: Date.parse("2026-11-15T12:00:00Z") };
describe("public article structured data", () => {
  it("uses the real published date and the same canonical origin", () => {
    const data = blogStructuredData(post);
    expect(data.url).toBe("https://hilitcaspi.com/blog/story");
    expect(data.datePublished).toBe("2026-11-15T12:00:00.000Z");
    expect(data.author.name).toBe("הילית כספי");
  });
  it("does not invent draft publication dates or unsafe images", () => {
    const data = blogStructuredData({ ...post, publishedAt: 0, updatedAt: 0, coverImage: "javascript:alert(1)" });
    expect(data.datePublished).toBeUndefined();
    expect(data).not.toHaveProperty("image");
  });
  it("omits malformed legacy images without failing the article", () => {
    expect(blogStructuredData({ ...post, coverImage: "https://[invalid" })).not.toHaveProperty("image");
  });
  it("cannot close its JSON script via article text", () => {
    const serialized = serializeStructuredData(blogStructuredData({ ...post, title: "</script><script>alert(1)</script>" }));
    expect(serialized).not.toContain("</script>");
    expect(JSON.parse(serialized).headline).toContain("</script>");
  });
});
