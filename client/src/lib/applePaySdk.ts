// Keep this URL in sync with Grow's Apple Pay integration. Loading the script,
// not the presence of a browser-native ApplePaySession, is the readiness signal.
const APPLE_PAY_SDK_URL = "https://meshulam.co.il/_media/js/apple_pay_sdk/sdk.min.js";
const APPLE_PAY_SDK_TIMEOUT_MS = 5_000;
let scriptLoadPromise: Promise<void> | null = null;

/** Wallet-only optional dependency: all callers share one bounded script load. */
export function preloadApplePaySDKScript(): Promise<void> {
  if (scriptLoadPromise) return scriptLoadPromise;

  const loading = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${APPLE_PAY_SDK_URL}"]`
    );
    if (script?.getAttribute("data-apple-pay-sdk-state") === "loaded") {
      resolve();
      return;
    }

    const isNew = !script;
    script ??= document.createElement("script");
    const tag = script;
    tag.type = "text/javascript";
    tag.async = true;
    tag.src = APPLE_PAY_SDK_URL;
    tag.setAttribute("data-apple-pay-sdk", "true");

    const cleanup = () => {
      clearTimeout(timeout);
      tag.removeEventListener("load", onLoad);
      tag.removeEventListener("error", onError);
    };
    const onLoad = () => {
      cleanup();
      tag.setAttribute("data-apple-pay-sdk-state", "loaded");
      resolve();
    };
    const fail = (message: string) => {
      cleanup();
      // A failed or hung tag must not poison retries or leave duplicate tags.
      tag.remove();
      reject(new Error(message));
    };
    const onError = () => fail("Failed to load Apple Pay SDK script");
    const timeout = setTimeout(
      () => fail("Apple Pay SDK script load timeout"),
      APPLE_PAY_SDK_TIMEOUT_MS
    );
    tag.addEventListener("load", onLoad);
    tag.addEventListener("error", onError);
    if (isNew) {
      try {
        document.head.appendChild(tag);
      } catch {
        fail("Failed to append Apple Pay SDK script");
      }
    }
  });

  scriptLoadPromise = loading;
  void loading.catch(() => {
    if (scriptLoadPromise === loading) scriptLoadPromise = null;
  });
  return loading;
}
