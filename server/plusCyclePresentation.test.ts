import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { presentPlusCycle } from "../shared/plusCyclePresentation";
import { calculatePlusCycleProgress } from "./plusSubscription";
const start = Date.parse("2026-09-09T12:00:00+03:00");
const end = Date.parse("2026-10-09T12:00:00+03:00");
const now = Date.parse("2026-10-13T23:00:00+03:00");
const progress = {cycleStart:start,cycleEnd:end,target:2,delivered:4,daysRemaining:0,progressPercent:100};
describe("Plus cycle presentation without changing entitlements", () => {
  it("marks a closed recorded period as last, preserves its count and does not advance it", () => {
    const view = presentPlusCycle(progress, now);
    expect(view.phase).toBe("ended");expect(view.title).toContain("האחרון");
    expect(view.count).toBe("4 מתוך 2");expect(view.timing).toContain("הסתיים");
    expect(view.notice).toContain("חידוש המחזור עדיין לא מתועד באתר");
    expect(view.period).toContain("9.10.2026");expect(progress.cycleEnd).toBe(end);
  });
  it("treats exact cycle end as closed and just before it as current", () => {
    expect(presentPlusCycle(progress,end).phase).toBe("ended");
    expect(presentPlusCycle(progress,end-1).phase).toBe("current");
    expect(presentPlusCycle(progress,end-1).notice).toBeNull();
  });
  it("updates to a new cycle only when the backend supplied a new period", () => {
    const newProgress = calculatePlusCycleProgress({singleId:1,billingCycleStartedAt:end,billingCycleEndsAt:Date.parse("2026-11-09T12:00:00+02:00")},[{id:1,singleAId:1,singleBId:2,proposedAt:start+1000}],now);
    const view = presentPlusCycle(newProgress,now);
    expect(view.phase).toBe("current");expect(view.count).toBe("0 מתוך 2");expect(view.notice).toBeNull();
  });
  it("reports invalid dates honestly and handles future periods without claiming current", () => {
    expect(presentPlusCycle({...progress,cycleEnd:0},now).phase).toBe("unknown");
    expect(presentPlusCycle({...progress,cycleEnd:NaN},now).phase).toBe("unknown");
    expect(presentPlusCycle(progress,start-1).phase).toBe("upcoming");
  });
  it("shows dates in Israel timezone and dynamic remaining days, not a stale cached value", () => {
    expect(presentPlusCycle({...progress,daysRemaining:99},end-1000).timing).toBe("נותרו 1 ימים");
    expect(presentPlusCycle({...progress,cycleStart:Date.parse('2026-09-08T21:30:00Z')},now).period).toContain('9.9.2026');
  });
  it("has no writes, payments or reset action in the new component", () => {
    const component=readFileSync(new URL('../client/src/components/PlusCycleProgressCard.tsx',import.meta.url),'utf8');
    expect(component).toContain('ולא מכסה מרבית');expect(component).toContain('view.count');
    expect(component).not.toMatch(/useMutation|fetch\(|mutate\(|billingCycleStartedAt\s*:/);
    const page=readFileSync(new URL('../client/src/pages/UserDashboard.tsx',import.meta.url),'utf8');
    expect(page).toContain('<PlusCycleProgressCard progress={cycleProgress}');
    expect(page).toContain('refetchOnWindowFocus: true');expect(page).not.toContain('{cycleProgress.delivered}/{cycleProgress.target}');
  });
});
