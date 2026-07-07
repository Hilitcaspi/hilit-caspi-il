import { describe, it, expect } from "vitest";

describe("Profile Complete API", () => {
  it("getMissingFields returns null for invalid token", async () => {
    const res = await fetch(
      `http://localhost:3000/api/trpc/singles.getMissingFields?input=${encodeURIComponent(JSON.stringify({ json: { token: "invalid_token_xyz" } }))}`
    );
    const data = await res.json();
    expect(data.result.data.json).toBeNull();
  });

  it("getMissingFields returns firstName and missingFields for valid token", async () => {
    // Use a known real token from the DB (שקד קיינן)
    const token = "c3cdba2693e50ae6c67ba4de4265744366fad8bfb4cedaf52b749f6f5b6f990f";
    const res = await fetch(
      `http://localhost:3000/api/trpc/singles.getMissingFields?input=${encodeURIComponent(JSON.stringify({ json: { token } }))}`
    );
    const data = await res.json();
    const result = data.result?.data?.json;
    expect(result).not.toBeNull();
    expect(result.firstName).toBe("שקד");
    expect(Array.isArray(result.missingFields)).toBe(true);
    expect(result.missingFields).toContain("photoUrl");
  });

  it("updateMissingFields rejects invalid token", async () => {
    const res = await fetch("http://localhost:3000/api/trpc/singles.updateMissingFields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        json: {
          token: "invalid_token_xyz",
          city: "תל אביב",
        },
      }),
    });
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(data.error.json.data.code).toBe("NOT_FOUND");
  });
});
