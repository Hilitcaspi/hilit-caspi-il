import sanitizeHtml from "sanitize-html";

/** The same allowlist is used when saving articles and serving legacy content. */
export function sanitizeBlogContent(content: string): string {
  return sanitizeHtml(content, {
    allowedTags: [
      "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "div", "span",
      "strong", "b", "em", "i", "u", "s", "blockquote", "ul", "ol", "li",
      "a", "img", "figure", "figcaption", "pre", "code", "table", "caption",
      "thead", "tbody", "tfoot", "tr", "th", "td", "sup", "sub", "details", "summary",
    ],
    allowedAttributes: {
      "*": ["id", "dir", "lang"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      ol: ["start", "reversed"],
      li: ["value"],
      th: ["scope", "colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      details: ["open"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const safeAttributes = { ...attribs };
        if (safeAttributes.target === "_blank") {
          safeAttributes.rel = "noopener noreferrer";
        } else {
          delete safeAttributes.target;
        }
        return { tagName, attribs: safeAttributes };
      },
    },
  });
}

/** Cover images may be HTTP(S) URLs or local absolute paths, never active URLs. */
export function isSafeBlogCoverImage(value: string): boolean {
  if (!value) return true; // An empty value intentionally clears the image.
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}
