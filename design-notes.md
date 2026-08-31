# Direction: Hilit Caspi — Single of the Week

The revised public page will replace the prior blush editorial theme with the visual language visible in the supplied Hilit Caspi materials: a deep indigo foundation, clean white content surfaces, warm soft-gold focal elements, and restrained plum accents. The result should feel decisive, personal, professional, and aligned with relationship expertise rather than like a generic form.

The supplied portrait will appear in a small gold-rimmed circular brand portrait within the public hero. The hero will introduce Hilit Caspi as a relationship expert and matchmaker, balancing the personal presence seen in the supplied emails with a direct call to submit for the weekly feature. The existing form, image-upload security, consent copy, and private owner-only review behavior will remain unchanged.

Typography will use a prominent Hebrew display hierarchy for titles and a highly legible Hebrew sans-serif for form content. The layout will remain RTL and mobile-first, with a high-contrast gold submission action and privacy cues that match the brand palette.

## Verification

The redesigned form was reviewed in desktop and 390px mobile view. The brand portrait, dark indigo and plum backdrop, warm gold accents, white submission card, RTL order, form controls, consent areas, and mobile spacing render clearly. TypeScript validation, unit tests, and the production build all succeeded after the visual redesign.

## Refinement verification

The revised desktop and mobile pages show the requested participation-confirmation title in high-contrast white and gold, with the previous low-contrast hero copy removed. The form introduction now addresses the applicant in Hilit's first-person voice. The optional DNA field, the Instagram-tagging explanation, and the aligned client-side validation for both longer text fields all render clearly.

The reported submission failure was traced to a too-short answer in the required "מי מתאים לי להכיר?" field. The browser now catches this beside the field before contacting the server. The complete validated server flow, including an optional DNA answer, returns a successful application identifier in regression testing.
