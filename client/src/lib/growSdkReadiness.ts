export type GrowSdkHost = {
  growPayment?: {
    renderPaymentOptions?: unknown;
  };
  growRuntime?: unknown;
  __growServicesLoaded?: () => boolean;
};

/**
 * The local 1.3.5 loader exposes its public wrapper before services finish
 * loading. Use the same window-level predicate as the native renderer, not
 * just the existence of growRuntime or its wrapper.
 */
export function isGrowPaymentRendererReady(host: GrowSdkHost): boolean {
  try {
    return Boolean(
      host.growRuntime
        && typeof host.growPayment?.renderPaymentOptions === "function"
        && typeof host.__growServicesLoaded === "function"
        && host.__growServicesLoaded() === true,
    );
  } catch {
    // An absent/broken readiness signal must never authorize createProcess.
    return false;
  }
}

/** Expiry/transport errors are not authoritative proof that no charge occurred. */
export function isGrowPaymentOutcomeUnknown(response: unknown): boolean {
  try {
    return /outcome_unknown|timeout|network|fetch failed|Failed to fetch|מצב התשלום|נגמר\s+הזמן\s+לתשלום|פג\s+תוקף\s+התשלום/i.test(
      JSON.stringify(response) || "",
    );
  } catch {
    return true;
  }
}

export type GrowWalletComputedStyle = {
  display?: string;
  visibility?: string;
  opacity?: string;
};

/** Grow may create the wallet DOM shell while keeping it fully hidden. */
export function isGrowWalletVisible(style: GrowWalletComputedStyle | null): boolean {
  if (!style) return false;
  return style.display !== "none"
    && style.visibility !== "hidden"
    && style.opacity !== "0";
}
