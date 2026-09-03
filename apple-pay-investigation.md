# Apple Pay Investigation Results (July 7, 2026)

## Key Finding: Our verification file is OUTDATED

- **Our file** (`production_domain_verification(5).txt`): `createdOn: 2021-06-02` (over 5 years old!)
- **pay.grow.link's file** (working): `createdOn: 2024-05-08` (1 year old)
- Both have the same `pspId` (same PSP = Meshulam)
- Our file is 9122 bytes, theirs is 9090 bytes
- The signature data is different (ours is from 2021, theirs from 2024)

## This is likely the problem!

Apple Pay certificates expire. The certificate in our file was created in June 2021 and has likely **expired**. 
The Apple Pay Merchant Identity Certificate is valid for approximately 25 months.
Our cert was created June 2, 2021 — that's over 5 years ago, well past any certificate validity period.

Meshulam needs to provide a **NEW/CURRENT** domain verification file, not the old 2021 one.

## What we verified works correctly:
1. File served at https://hilitcaspi.com/.well-known/apple-developer-merchantid-domain-association → 200 OK
2. No redirects
3. TLS 1.3, valid cert (CN=hilitcaspi.com, expires Sep 2026)
4. Cloudflare doesn't block any user agent
5. Works with bot UA, empty UA, normal UA
6. File format is correct (hex-encoded JSON, same as pay.grow.link)
7. Apple Pay SDK script in index.html head ✅
8. Grow SDK has built-in Apple Pay service (a.min.js) ✅

## Action needed:
Ask Meshulam/Grow for the **LATEST** production domain verification file (the one from 2024, not 2021).
The file they gave (production_domain_verification(5).txt) contains an expired 2021 certificate.
pay.grow.link uses a 2024 certificate that works.

---

# FULL RESOLUTION (July 8, 2026) — two stacked root causes, both fixed

## Root cause 1: expired certificate in the domain-association file ✅ FIXED
- The file at `client/public/.well-known/apple-developer-merchantid-domain-association`
  is a PSP-global signed attestation (JSON: pspId/version/createdOn/signature — no domain
  field; same pspId as pay.grow.link).
- Old file (createdOn 2021-06-02) was signed by Apple broker cert
  `ecc-smp-broker-sign_UC4-PROD` valid May 2019 → **May 16 2024 (EXPIRED)**.
- Replaced with pay.grow.link's current file (createdOn 2024-05-08, cert valid to Apr 2029).
- Proven working: Apple now issues merchant sessions with `domainName: hilitcaspi.com`.

## Root cause 2: proxy swallowed Incapsula's empty-500 block ✅ FIXED
- Reproduced the wallet flow (createPaymentProcess → drawWalletPageData → doPayment
  transaction_type_id=13) over every network path:
  - Direct + Cloudflare Worker: ✅ merchant session issued
  - Site proxy `/api/grow-proxy` (prod server): ❌ empty HTTP 500 on doPayment
- Incapsula soft-blocks the production server's egress IP on the sensitive /doPayment
  endpoint with an EMPTY HTTP 500 (not the classic 403+HTML).
- `looksBlocked()` in `server/_core/growProxy.ts` only matched 403/503+Incapsula-HTML,
  so the 500 passed through to the SDK → generic Hebrew error (קוד 0) in failure alerts.
- Fix: any 5xx from the direct attempt now triggers the Cloudflare Worker fallback.

## End-to-end verification (July 8, post-deploy)
Replicated the exact iPhone flow against production:
1. createProcess via real tRPC endpoint (server-side) → authCode ✓
2. drawWalletPageData via /api/grow-proxy → 200 ✓
3. doPayment (Apple Pay, type 13) via /api/grow-proxy → **200 in 1.0s, Apple merchant session issued for hilitcaspi.com** ✓

## Gotchas learned (for future debugging)
- Creating the process THROUGH the proxy poisons it: the proxy's SPOOF_HEADERS send
  `Origin: secure.meshulam.co.il` on createPaymentProcess, and Meshulam then rejects all
  subsequent doPayment calls on that process (from ANY network). The real flow creates via
  tRPC with `Origin: hilitcaspi.com` — clean. Don't "test" createPaymentProcess through
  /api/grow-proxy and conclude the flow is broken.
- Transaction type ids: 1=credit, 5=paybox, 6=bit, **13=Apple Pay**, 14=Google Pay, 15=bank transfer.
- Long-term option: ask Meshulam to whitelist the production server's egress IP in
  Incapsula, removing the Worker dependency.
