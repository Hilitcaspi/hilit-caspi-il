# CRM Matchmaking Fix Notes

## Bugs Found

### Bug 1: "נשלחה" (Proposed/Sent) tab shows only 1 match
**Root cause:** The filter `isWaitingProposed` checks `m.status === "proposed"` which only shows matches CURRENTLY waiting for response. After 48h they expire. Only 1 match is currently in "proposed" status.
**Fix:** Change the "proposed" tab to show ALL matches that were ever sent (have `proposedAt` set), regardless of current status. This means: `m.proposedAt != null && m.status !== "pending"` (exclude pending which haven't been sent yet).

### Bug 2: "יש התאמה" (Matched) tab shows too few
**Root cause:** The matched tab splits into two: "matched" shows only last 14 days (10 matches), and "followup" shows older ones (33 matches). User expects to see all 43 in one place.
**Fix:** Remove the 14-day split. Show ALL matched in the "יש התאמה" tab. Remove or repurpose the "followup" tab.

### Bug 3: New algorithm matches not showing
**Root cause:** Actually they ARE showing in the "pending" tab (820 matches). The user may be confused because she expects them in a different view. Need to verify this is actually working.

## Data Summary (from LEGACY_DATABASE_URL)
- Total matches: 1198 rows, all unique pairs
- Status: pending=820, rejected=202, expired=132, matched=43, proposed=1
- Matches ever sent (proposedAt not null): 1204 (some were re-sent after being reset)
- Matched in last 14 days: 10
- Matched older than 14 days: 33
- At least one approval: 215

## Files to Edit
- `client/src/pages/CRMMatchmaking.tsx` lines 354-392 (filtering logic)
  - `isWaitingProposed` function (line 362-364)
  - `filteredMatchesBySubTab` object (line 385-392)
  - `matchSubCounts` object (line 366-373)
  - Tab definitions (line 874-880)
