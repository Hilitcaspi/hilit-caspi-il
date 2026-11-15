import { useEffect } from "react";
import { useLocation } from "wouter";
import { PUBLIC_ROUTE_META, PRIVATE_ROUTE_PREFIXES, SEO_ORIGIN } from "@shared/siteSeoMetadata";

export default function ClientSeoHead() {
  const [location] = useLocation();
  useEffect(() => {
    const path = location.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    // The article component owns its data-dependent head after loading.
    if (path.startsWith("/blog/")) return;
    const privatePage = PRIVATE_ROUTE_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
    const canonicalPath = path === "/dna" ? "/dna-quiz" : path;
    const metadata = PUBLIC_ROUTE_META[canonicalPath];
    const setMeta = (key: string, value: string, property = false) => {
      const attribute = property ? "property" : "name";
      const matches = Array.from(document.querySelectorAll<HTMLMetaElement>(`meta[${attribute}="${key}"]`));
      const tag = matches[0] ?? document.createElement("meta");
      tag.setAttribute(attribute, key); tag.content = value;
      if (!matches.length) document.head.appendChild(tag);
      matches.slice(1).forEach(node => node.remove());
    };
    if (metadata) {
      document.title = metadata.title;
      setMeta("description", metadata.description);
      setMeta("og:title", metadata.title, true); setMeta("og:description", metadata.description, true);
      setMeta("og:type", metadata.type || "website", true); setMeta("og:url", SEO_ORIGIN + canonicalPath, true);
      setMeta("twitter:title", metadata.title); setMeta("twitter:description", metadata.description);
    }
    const robots = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="robots"]'));
    if (privatePage) setMeta("robots", "noindex,nofollow");
    else robots.forEach(tag => tag.remove());
    const canonicalTags = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    if (privatePage) canonicalTags.forEach(tag => tag.remove());
    else {
      const canonical = canonicalTags[0] ?? document.createElement("link");
      canonical.rel = "canonical"; canonical.href = SEO_ORIGIN + canonicalPath;
      if (!canonicalTags.length) document.head.appendChild(canonical);
      canonicalTags.slice(1).forEach(tag => tag.remove());
    }
  }, [location]);
  return null;
}
