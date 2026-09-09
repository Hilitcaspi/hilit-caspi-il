export type GrowSdkHost = {
  growPayment?: {
    renderPaymentOptions?: unknown;
  };
  growRuntime?: unknown;
};

/**
 * Grow exposes `growRuntime` before all wallet services are necessarily ready.
 * The checkout may proceed only when the public renderer used by this app is
 * available as a callable function.
 */
export function isGrowPaymentRendererReady(host: GrowSdkHost): boolean {
  return Boolean(
    host.growRuntime
      && host.growPayment
      && typeof host.growPayment.renderPaymentOptions === "function",
  );
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
