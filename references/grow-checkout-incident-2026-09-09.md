# Grow checkout incident — 2026-09-09

## Verified external behavior

The official Grow Wallet documentation states that a wallet-specific `pageCode` returns an `authCode`, not a hosted redirect URL. The browser SDK then uses that code to open the wallet. Source: https://grow-il.readme.io/reference/implement-code-on-client-side

The official `createPaymentProcess` documentation states that the create call itself must be sent from the backend. Source: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess

On 2026-09-09, the public Grow version map resolved production SDK major version `1` to runtime `1.3.6`: https://cdn.meshulam.co.il/sdk/api-versions.json

Runtime `1.3.6` sends `drawWalletPageData` to `https://sdk.meshulam.co.il/api/light/web/1.0/drawWalletPageData`. Full UI reproduction on `hilitcaspi.com` showed successful profile save and successful `createPaymentProcess`, followed by repeated `drawWalletPageData` failures and a hidden wallet shell. A direct server diagnostic to that endpoint returned an Incapsula block page.

The project already contains a local Grow SDK `1.3.5`. Its local `params.json` points wallet API calls to `https://secure.meshulam.co.il/api/light/web/1.0`, and its loader rewrites secure Meshulam calls to the same-origin `/api/grow-proxy` route. The existing proxy retries blocked direct calls through the established Cloudflare Worker fallback. A focused live proxy test on 2026-09-09 received an Incapsula `403` directly and then received a valid Grow JSON response through the fallback.

## Apple Pay failure at 19:16–19:17

Two real attempts reached the open Grow wallet and selected Apple Pay. `doPayment` succeeded and Grow returned a valid Apple merchant session for `hilitcaspi.com`. The following `chargePaymentToken` calls both returned provider status `0`, error ID `103`, and the generic service-error message shown in the user screenshots. The failed attempts belonged to a different identity from the earlier invalid-phone attempts.

The operational database contained zero confirmed payments and zero successful webhook records in the 30-minute incident window. The related profile and payment lead existed, but the profile remained unpaid and inactive. No refund, approval, or financial action was performed.

The official create-process documentation also states that backend request parameters must not contain special characters. Source: https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess

## Release constraint

No card details are entered during QA. Verification stops once the Grow wallet is visibly open; no transaction is approved or charged.
