# Grow checkout incident — 2026-09-09

## Verified external behavior

The official Grow Wallet documentation states that a wallet-specific `pageCode` returns an `authCode`, not a hosted redirect URL. The browser SDK then uses that code to open the wallet. Source: https://grow-il.readme.io/reference/implement-code-on-client-side

The official `createPaymentProcess` documentation states that the create call itself must be sent from the backend. Source: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess

On 2026-09-09, the public Grow version map resolved production SDK major version `1` to runtime `1.3.6`: https://cdn.meshulam.co.il/sdk/api-versions.json

Runtime `1.3.6` sends `drawWalletPageData` to `https://sdk.meshulam.co.il/api/light/web/1.0/drawWalletPageData`. Full UI reproduction on `hilitcaspi.com` showed successful profile save and successful `createPaymentProcess`, followed by repeated `drawWalletPageData` failures and a hidden wallet shell. A direct server diagnostic to that endpoint returned an Incapsula block page.

The project already contains a local Grow SDK `1.3.5`. Its local `params.json` points wallet API calls to `https://secure.meshulam.co.il/api/light/web/1.0`, and its loader rewrites secure Meshulam calls to the same-origin `/api/grow-proxy` route. The existing proxy retries blocked direct calls through the established Cloudflare Worker fallback. A focused live proxy test on 2026-09-09 received an Incapsula `403` directly and then received a valid Grow JSON response through the fallback.

## Release constraint

No card details are entered during QA. Verification stops once the Grow wallet is visibly open; no transaction is approved or charged.
