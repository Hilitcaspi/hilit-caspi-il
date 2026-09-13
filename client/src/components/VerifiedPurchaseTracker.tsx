import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { gaPurchase, GA_PRODUCTS, type ProductKey } from "@/lib/ga";
import { trackPurchase } from "@/lib/metaPixel";
import { track } from "@/lib/track";
import {
  clearPurchaseTrackingToken,
  readPurchaseTrackingToken,
} from "@/lib/purchaseTracking";

const MAX_ATTEMPTS = 90;
const POLL_INTERVAL_MS = 2_000;

export default function VerifiedPurchaseTracker() {
  const [location] = useLocation();
  const confirmPurchase = trpc.payment.confirmPurchaseTracking.useMutation();

  useEffect(() => {
    if (!location.startsWith("/thank-you/")) return;
    const trackingToken = readPurchaseTrackingToken();
    if (!trackingToken) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const result = await confirmPurchase.mutateAsync({ trackingToken });
        if (cancelled) return;

        if (result.status === "confirmed") {
          const product = result.product as ProductKey;
          const catalogProduct = GA_PRODUCTS[product];
          if (catalogProduct) {
            trackPurchase({
              value: result.value,
              currency: result.currency,
              content_name: catalogProduct.item_name,
              eventID: result.eventId,
            });
            gaPurchase(product, result.transactionId);
            track({
              eventType: "purchase",
              page: location,
              metadata: { product, value: result.value, verified: true },
            });
          }
          clearPurchaseTrackingToken();
          return;
        }

        if (result.status === "invalid" || result.status === "already_tracked") {
          clearPurchaseTrackingToken();
          return;
        }
      } catch {
        // Keep polling briefly; CAPI remains the authoritative fallback.
      }

      if (attempts < MAX_ATTEMPTS) {
        timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [location]);

  return null;
}

