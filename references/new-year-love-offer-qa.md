# New Year Love Offer QA — 2026-09-07

The live page previously led with an abstract three-tools message and displayed `1,245 ₪` as original value, although the currently available standalone prices total `697 ₪` (`299 + 149 + 249`). This made the commercial offer difficult to understand.

The revised page now leads with the singles database as the main product and explains that adding `100 ₪` to its `299 ₪` price includes the guide and course, whose current combined standalone value is `398 ₪`. The bundle comparison is `399 ₪` instead of `697 ₪`, a saving of `298 ₪` or 43%.

Desktop and mobile full-page checks confirmed that the hero, price comparison, simple three-part offer explanation, detailed product cards, payment section and final CTA are readable and preserve the existing visual identity. The payment flow still uses `bundle_new_year`, the price remains `399 ₪`, and no payment was initiated during QA.

A close mobile check confirmed that the first viewport now states the offer directly, shows the real `697 ₪` separate-purchase comparison and the `399 ₪` bundle price, and uses a sticky CTA that says the offer includes three products. Browser extraction confirmed that the payment section lists the database, guide and course and repeats the same `399 ₪` CTA. No form fields were completed and no payment process was created.
