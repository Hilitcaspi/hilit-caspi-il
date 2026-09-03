/**
 * Enhanced Behavior Tracking (Hotjar-style)
 * Auto-tracks: button clicks, scroll depth, time on page, rage clicks, form interactions
 * All data flows to /api/track and appears in the CRM analytics dashboard
 */
import { track } from "./track";

let initialized = false;
let scrollDepthMax = 0;
let pageStartTime = 0;
let currentPage = "";
let clickTimestamps: number[] = [];

function getButtonLabel(el: HTMLElement): string {
  // Try to get meaningful label from element
  const text = el.textContent?.trim().slice(0, 50) || "";
  const ariaLabel = el.getAttribute("aria-label") || "";
  const title = el.getAttribute("title") || "";
  const id = el.id || "";
  const className = el.className?.toString().slice(0, 40) || "";
  return text || ariaLabel || title || id || className || el.tagName;
}

function getElementPath(el: HTMLElement): string {
  const parts: string[] = [];
  let current: HTMLElement | null = el;
  let depth = 0;
  while (current && depth < 4) {
    let desc = current.tagName.toLowerCase();
    if (current.id) desc += `#${current.id}`;
    else if (current.className && typeof current.className === 'string') {
      const cls = current.className.split(' ').filter(c => c && !c.startsWith('_')).slice(0, 2).join('.');
      if (cls) desc += `.${cls}`;
    }
    parts.unshift(desc);
    current = current.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

function handleClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target) return;

  // Find the nearest clickable element
  const clickable = target.closest("button, a, [role='button'], [onclick], input[type='submit'], input[type='button']") as HTMLElement;
  
  if (clickable) {
    const label = getButtonLabel(clickable);
    const path = getElementPath(clickable);
    track({
      eventType: "button_click",
      page: currentPage,
      metadata: { label, path, tag: clickable.tagName },
    });
  }

  // Rage click detection (3+ clicks within 1 second)
  const now = Date.now();
  clickTimestamps.push(now);
  clickTimestamps = clickTimestamps.filter(t => now - t < 1000);
  if (clickTimestamps.length >= 3) {
    const label = getButtonLabel(target);
    track({
      eventType: "button_click",
      page: currentPage,
      metadata: { label: `RAGE_CLICK: ${label}`, path: getElementPath(target), rageClick: "true" },
    });
    clickTimestamps = []; // Reset after reporting
  }
}

function handleScroll() {
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollHeight <= 0) return;
  const currentDepth = Math.round((window.scrollY / scrollHeight) * 100);
  
  // Track at 25%, 50%, 75%, 90%, 100% thresholds
  const thresholds = [25, 50, 75, 90, 100];
  for (const threshold of thresholds) {
    if (currentDepth >= threshold && scrollDepthMax < threshold) {
      track({
        eventType: "scroll_depth",
        page: currentPage,
        metadata: { depth: String(threshold), percent: String(threshold) },
      });
    }
  }
  scrollDepthMax = Math.max(scrollDepthMax, currentDepth);
}

function handleFormFocus(e: FocusEvent) {
  const target = e.target as HTMLElement;
  if (!target) return;
  const form = target.closest("form");
  if (form && !form.dataset.trackStarted) {
    form.dataset.trackStarted = "1";
    const formId = form.id || form.getAttribute("name") || form.action || "unknown";
    track({
      eventType: "form_start",
      page: currentPage,
      metadata: { form: formId },
    });
  }
}

function handleFormSubmit(e: Event) {
  const form = e.target as HTMLFormElement;
  if (!form) return;
  const formId = form.id || form.getAttribute("name") || form.action || "unknown";
  track({
    eventType: "form_submit",
    page: currentPage,
    metadata: { form: formId },
  });
}

function trackTimeOnPage() {
  if (!pageStartTime) return;
  const timeSpent = Math.round((Date.now() - pageStartTime) / 1000);
  if (timeSpent >= 5) { // Only track if > 5 seconds
    track({
      eventType: "page_view",
      page: currentPage,
      metadata: { timeOnPage: String(timeSpent), maxScroll: String(scrollDepthMax) },
    });
  }
}

// Intersection Observer for section visibility
let sectionObserver: IntersectionObserver | null = null;
const observedSections = new Set<string>();

function setupSectionObserver() {
  if (sectionObserver) sectionObserver.disconnect();
  observedSections.clear();

  sectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const id = entry.target.id || entry.target.getAttribute("data-section") || "";
          if (id && !observedSections.has(id)) {
            observedSections.add(id);
            track({
              eventType: "section_view",
              page: currentPage,
              metadata: { section: id },
            });
          }
        }
      }
    },
    { threshold: 0.3 }
  );

  // Observe all sections with id or data-section attribute
  document.querySelectorAll("section[id], [data-section]").forEach(el => {
    sectionObserver!.observe(el);
  });
}

let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

export function initBehaviorTracker() {
  if (initialized) return;
  initialized = true;

  currentPage = window.location.pathname;
  pageStartTime = Date.now();
  scrollDepthMax = 0;

  // Click tracking
  document.addEventListener("click", handleClick, { capture: true, passive: true });

  // Scroll tracking (debounced)
  window.addEventListener("scroll", () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(handleScroll, 200);
  }, { passive: true });

  // Form interaction tracking
  document.addEventListener("focusin", handleFormFocus, { passive: true });
  document.addEventListener("submit", handleFormSubmit, { capture: true });

  // Track time on page when leaving
  window.addEventListener("beforeunload", trackTimeOnPage);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") trackTimeOnPage();
  });

  // Section observer (delay to let DOM render)
  setTimeout(setupSectionObserver, 1000);
}

export function resetBehaviorTracker(newPage: string) {
  // Track time on previous page
  trackTimeOnPage();
  
  // Reset for new page
  currentPage = newPage;
  pageStartTime = Date.now();
  scrollDepthMax = 0;
  clickTimestamps = [];

  // Re-observe sections after route change
  setTimeout(setupSectionObserver, 500);
}
