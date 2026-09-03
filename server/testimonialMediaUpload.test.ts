import { describe, expect, it } from "vitest";
import { classifyTestimonialMedia } from "./testimonialMediaUpload";

describe("testimonial media validation", () => {
  it("accepts supported images and videos within their limits", () => {
    expect(classifyTestimonialMedia("image/jpeg", 1024).mediaType).toBe("image");
    expect(classifyTestimonialMedia("video/mp4", 1024).mediaType).toBe("video");
  });

  it("rejects unsupported media types", () => {
    expect(() => classifyTestimonialMedia("application/pdf", 1024)).toThrow("UNSUPPORTED_MEDIA_TYPE");
  });

  it("enforces separate image and video size limits", () => {
    expect(() => classifyTestimonialMedia("image/png", 10 * 1024 * 1024 + 1)).toThrow("IMAGE_TOO_LARGE");
    expect(() => classifyTestimonialMedia("video/webm", 80 * 1024 * 1024 + 1)).toThrow("VIDEO_TOO_LARGE");
  });
});
