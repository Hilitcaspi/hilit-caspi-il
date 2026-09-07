# New Year Love Offer QA — 2026-09-07

The live page previously led with an abstract three-tools message and displayed `1,245 ₪` as original value, although the currently available standalone prices total `697 ₪` (`299 + 149 + 249`). This made the commercial offer difficult to understand.

The final revision leads with one message only: the singles database is the heart of the offer, while the guide and course help customers arrive better prepared. It compares the original combined product value of `1,245 ₪` (`499 + 249 + 497`) with one holiday price of `399 ₪`, a saving of `846 ₪` or approximately 68%. Intermediate product prices and the earlier `697 ₪` comparison were removed from the page.

Desktop and mobile full-page checks confirmed that the hero, price comparison, simple three-part offer explanation, detailed product cards, payment section and final CTA are readable and preserve the existing visual identity. The payment flow still uses `bundle_new_year`, the price remains `399 ₪`, and no payment was initiated during QA.

A close mobile check confirmed that the first viewport states the offer directly, places the countdown before the price comparison, and shows only the original combined value and the `399 ₪` offer price. Desktop verification confirmed the same hierarchy. The payment section still lists the database, guide and course and repeats the same `399 ₪` CTA. No form fields were completed and no payment process was created.
