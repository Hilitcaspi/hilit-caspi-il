# Diagnosis: why Alma Daniel (id 6150001) shows only 4-6 matches at 69-71%

## Alma's DB record
- id 6150001, female, 33, Tel Aviv, secular, education=vocational
- seekingGender = "any" (defaults to male)
- minAgePreference = NULL, maxAgePreference = NULL
- height = 164, no height prefs
- wantsKids = NULL, hasKids = 0
- dnaType = NULL, birthDate = NULL (no DNA quiz, no astrology)
- smokingStatus = no, smokingPreference = occasionally_ok
- Has 25 questionnaire answers (matchmaking_answers len 1313)

## Her stored matches (matches table)
6 rows, all status=pending, all generated in one batch 2026-06-23 08:40 (tri-daily auto-run):
- scores: 71,71,71,69,69,69 (candidates: יצחק/עדן/אדם/יוני/רונן/אור)
- CRM card (getTopMatchesForSingle) paginates these 6 -> shows "1-3 מתוך 4" etc.

## Why only 6 exist (root cause #1 - generator cap)
generateMatchesForSingle (routers.ts ~382-400):
- scores all eligible candidates, sorts desc
- takes TOP 6 only (`.slice(0, 6)`)
- inserts match rows only for those 6
- skips any pair that already exists (never re-proposes)
So the stored pool per person is hard-capped at ~6. The CRM reads stored rows, not a live search. It only offers the "run algorithm" button when allTop.length < 3.

## Why scores cap at ~71 (root cause #2 - missing DNA + weighting)
computeFullScore weighting (per 100):
- questionnaire 40%, lifeStage 20%, DNA 13%, religiosity 10%, interaction 7%, education 5%, practical 5%
- +astrology/text/smoking bonuses, capped at 97
Alma's top match breakdown (id 9270003, total 71):
  questionnaire:51, lifeStage:89, dna:55, practical:59, religiosity:100, education:90, interactionBonus:12, astrologyBonus:0, textBonus:2, cityIntelligence:65
Key drags:
- DNA = 55 default because Alma has NO dnaType (getDnaSynergy returns 55 when either side missing). This alone costs ~5-6 pts vs a strong DNA synergy (95-100).
- astrologyBonus = 0 because birthDate is NULL (no +5).
- questionnaire only 51: she rated most answers low importance (18 of 25 at importance=1, only 2 at importance=2) and confidence factor (questionsScored/12) plus middling matrix fit pulls it to ~mid.
- interactionBonus low (12) partly because wantsKids is NULL so the "both want kids, right age" +25 bonus never triggers.
System-wide score buckets confirm this is normal: 631 of 1011 matches sit in the 70s, only 7 reach 90s. 71 is a *typical top* score, not a weak one.

## Why the pool is smaller than it feels (root cause #3 - hard filters)
Of 246 active males, 222 have questionnaire answers. Simulating Alma's hard filters:
- ~86 males excluded because THEIR OWN maxAgePreference < 33 (many young men set max 27-32). This is the single biggest reducer.
- 6 excluded on religiosity, 5 on height (shorter than 164).
- Net eligible ~127-128 males, 122 of them NOT yet in her stored matches.
So there ARE ~120 more eligible candidates; the generator simply capped at 6 and never surfaced them.

## Summary for user
1. The "4" is a display artifact + generator cap of 6 stored matches, not a shortage of candidates (there are ~120 eligible men).
2. 69-71% is a normal top-tier score in this system; scores are dragged down mainly because Alma never did the DNA quiz (DNA defaults to 55, astrology 0) and left kids preference blank.
3. To surface more/higher matches we could: raise the generator cap (e.g. 6 -> 12/15), fill her DNA type + birthDate + kids preference, or add a "show all eligible candidates" live-search view in the CRM instead of only the stored top-6.
