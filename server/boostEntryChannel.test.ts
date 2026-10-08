import { describe, expect, it } from "vitest";
import { boostEntryChannelFromSearch } from "../shared/boostEntryChannel";
describe("Boost tagged action origin", () => {
  it("recognizes newsletters and lifecycle links without using personal identifiers", () => {
    expect(boostEntryChannelFromSearch("?utm_source=brevo&utm_medium=email")).toBe("email");
    expect(boostEntryChannelFromSearch("?utm_source=email&utm_medium=lifecycle")).toBe("email");
    expect(boostEntryChannelFromSearch("?utm_source=meta&utm_medium=cpc")).toBe("other");
    expect(boostEntryChannelFromSearch("?tab=boost")).toBe("personal_area");
  });
});
