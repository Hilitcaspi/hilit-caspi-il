import { describe, it, expect } from "vitest";

describe("Brevo API connection", () => {
  it("should connect to Brevo API and return account info", async () => {
    const apiKey = process.env.BREVO_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        "api-key": apiKey!,
        "Content-Type": "application/json",
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("email");
    console.log("Brevo account:", data.email, "Plan:", data.plan?.[0]?.type);
  });
});
