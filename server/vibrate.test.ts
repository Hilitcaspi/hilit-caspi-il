import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env before importing
process.env.VIBRATE_API_KEY = "a007ef8e65d9d0324636344d5014cf6604baa6b70edfba888230e8806e6c5867c";

describe("Vibrate SMS Service", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("should normalize Israeli phone numbers correctly", async () => {
    const { sendSMS } = await import("./vibrate");
    
    // Valid phone - should attempt to send
    mockFetch.mockResolvedValueOnce({
      status: 202,
      json: () => Promise.resolve({ runId: "test-123" }),
    });
    
    const result = await sendSMS("0559348719", "Test message");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.vibrate.co.il/v1/sms/send",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": process.env.VIBRATE_API_KEY,
        },
        body: JSON.stringify({
          recipients: ["0559348719"],
          message: "Test message",
          sender: "HilitCaspi",
        }),
      })
    );
  });

  it("should convert international format to local", async () => {
    const { sendSMS } = await import("./vibrate");
    
    mockFetch.mockResolvedValueOnce({
      status: 202,
      json: () => Promise.resolve({ runId: "test-456" }),
    });
    
    await sendSMS("+972559348719", "Test");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"0559348719"'),
      })
    );
  });

  it("should reject invalid phone numbers", async () => {
    const { sendSMS } = await import("./vibrate");
    
    const result = await sendSMS("123", "Test");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should handle API errors gracefully", async () => {
    const { sendSMS } = await import("./vibrate");
    
    mockFetch.mockResolvedValueOnce({
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });
    
    const result = await sendSMS("0541234567", "Test");
    expect(result).toBe(false);
  });

  it("should handle network errors gracefully", async () => {
    const { sendSMS } = await import("./vibrate");
    
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    
    const result = await sendSMS("0541234567", "Test");
    expect(result).toBe(false);
  });

  it("should build correct match SMS message", async () => {
    const { buildMatchSmsMessage } = await import("./vibrate");
    
    const msg = buildMatchSmsMessage("דנה", "עידו", 85);
    expect(msg).toContain("היי דנה");
    expect(msg).toContain("85%");
    expect(msg).toContain("עידו");
    expect(msg).toContain("הילית 💛");
    expect(msg).toContain("ספאם");
  });

  it("should skip sending when API key is not set", async () => {
    // Temporarily remove the key
    const originalKey = process.env.VIBRATE_API_KEY;
    process.env.VIBRATE_API_KEY = "";
    
    // Need to re-import to pick up the empty key
    vi.resetModules();
    const { sendSMS } = await import("./vibrate");
    
    const result = await sendSMS("0541234567", "Test");
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
    
    // Restore
    process.env.VIBRATE_API_KEY = originalKey;
  });
});
