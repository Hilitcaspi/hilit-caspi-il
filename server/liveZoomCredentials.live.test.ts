import { describe, expect, it } from "vitest";
import { verifyZoomLiveMeeting, zoomLiveConfig } from "./liveZoomApi";

// Explicit opt-in: this test never registers a participant or sends an email.
describe.skipIf(process.env.RUN_LIVE_ZOOM_PREFLIGHT !== "true")("Zoom live credentials and meeting preflight", () => {
  it("can read the selected meeting and confirms manual approval and the Israel start time", async () => {
    expect(zoomLiveConfig()).not.toBeNull();
    const result = await verifyZoomLiveMeeting();
    expect(result).toEqual({ configured: true, manualApproval: true, correctTime: true, canReadRegistrants: true });
  }, 25_000);
});
