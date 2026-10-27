import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

export const DEFAULT_PROGRESSIVE_INITIAL_COUNT = 50;
export const DEFAULT_PROGRESSIVE_CHUNK_SIZE = 50;

/**
 * Computes the rendered prefix without dropping an explicitly selected item.
 * Keeping this pure also makes the list's bounded behavior easy to verify
 * without a browser or customer data.
 */
export function getProgressiveWindow<T>(
  items: readonly T[],
  visibleCount: number,
  forcedItemIds: readonly string[],
  getItemId: (item: T) => string,
): number {
  const furthestForcedIndex = items.reduce((furthest, item, index) => (
    forcedItemIds.includes(getItemId(item)) ? Math.max(furthest, index) : furthest
  ), -1);

  return Math.min(items.length, Math.max(visibleCount, furthestForcedIndex + 1));
}

type ProgressiveListProps<T> = {
  items: readonly T[];
  /** Reset only for real source/filter/tab changes, never for expansion state. */
  resetKey: string;
  getItemId: (item: T) => string | number;
  /** Makes a selected or deep-linked item render even when it is past the prefix. */
  forceVisibleIds?: readonly (string | number | null | undefined)[];
  initialCount?: number;
  chunkSize?: number;
  children: (item: T, index: number) => ReactNode;
  className?: string;
  moreLabel?: (shown: number, total: number) => ReactNode;
};

/**
 * Renders a bounded prefix while retaining all data in memory for exact local
 * filtering/counts. The bottom sentinel advances automatically when supported;
 * the accessible button is always available as a keyboard/no-observer fallback.
 */
export function ProgressiveList<T>({
  items,
  resetKey,
  getItemId,
  forceVisibleIds = [],
  initialCount = DEFAULT_PROGRESSIVE_INITIAL_COUNT,
  chunkSize = DEFAULT_PROGRESSIVE_CHUNK_SIZE,
  children,
  className,
  moreLabel,
}: ProgressiveListProps<T>) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const normalizedForcedIds = useMemo(
    () => forceVisibleIds.filter((id): id is string | number => id !== null && id !== undefined).map(String),
    [forceVisibleIds],
  );
  const renderCount = getProgressiveWindow(items, visibleCount, normalizedForcedIds, item => String(getItemId(item)));
  const hasMore = renderCount < items.length;

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [initialCount, resetKey]);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisibleCount(current => Math.min(items.length, Math.max(current, renderCount) + chunkSize));
      }
    }, { rootMargin: "320px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [chunkSize, hasMore, items.length, renderCount]);

  return (
    <div className={className} data-progressive-total={items.length} data-progressive-rendered={renderCount}>
      {items.slice(0, renderCount).map((item, index) => (
        <div id={`progressive-item-${getItemId(item)}`} className="contents" key={getItemId(item)}>
          {children(item, index)}
        </div>
      ))}
      {hasMore && (
        <div ref={loadMoreRef} className="flex flex-col items-center gap-2 py-3" aria-live="polite">
          <button
            type="button"
            onClick={() => setVisibleCount(current => Math.min(items.length, Math.max(current, renderCount) + chunkSize))}
            className="rounded-lg border border-[#191265]/20 bg-white px-4 py-2 text-sm font-bold text-[#191265] hover:bg-[#f8f6f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191265]"
          >
            {moreLabel?.(renderCount, items.length) ?? `הצג עוד (${renderCount} מתוך ${items.length})`}
          </button>
          <span className="text-xs text-[#727272]">נטען אוטומטית בהגעה לסוף הרשימה</span>
        </div>
      )}
    </div>
  );
}
