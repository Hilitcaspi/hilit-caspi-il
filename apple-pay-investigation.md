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
