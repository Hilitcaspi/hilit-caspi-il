import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/components/PlusPilotAdminSection.tsx", import.meta.url), "utf8");

function section(start: string, end: string) {
  return source.slice(source.indexOf(start), source.indexOf(end));
}

describe("Plus service-departure admin UI contract", () => {
  it("adds a presentational service-departure shape and the three focused views", () => {
    expect(source).toContain('state?: "not_requested" | "finishing_cycle" | "archived" | "needs_review"');
    expect(source).toContain("requested?: boolean;");
    expect(source).toContain("endsAt?: number | null;");
    expect(source).toContain("remaining?: number;");
    expect(source).toContain('reason?: "target_met" | "cycle_elapsed" | null;');
    expect(source).toContain('useState<"active" | "finishing" | "archived">("active")');
    expect(source).toContain('["active", "שירות פעיל"]');
    expect(source).toContain('["finishing", "מסיימים שירות עם יתרת התאמות"]');
    expect(source).toContain('["archived", "שירות שהסתיים"]');
    expect(source).toContain('role="tablist"');
  });

  it("keeps requested departures out of ordinary active rows and isolates finishing and archive rows", () => {
    const filters = section("const rows = useMemo", "const archivedRows = useMemo");

    expect(filters).toContain('serviceDepartureView !== "active" || row.serviceDeparture?.state === "needs_review"');
    expect(filters).toContain('!row.archived && (!row.serviceDeparture?.requested || row.serviceDeparture?.state === "needs_review")');
    expect(filters).toContain('!row.archived && row.serviceDeparture?.state === "finishing_cycle"');

    const archive = section('{serviceDepartureView === "archived"', "<Dialog open=");
    expect(archive).toContain('serviceDepartureView === "archived"');
    expect(archive).toContain("archivedRows.map");
    expect(archive).toContain('<ServiceDepartureNotice serviceDeparture={row.serviceDeparture}');
    expect(archive).toContain('cancellationPending={row.cancellationPending && cancellationByMemberId.get(row.pilot.id)?.providerStopEvidence !== "staff_confirmation" && cancellationByMemberId.get(row.pilot.id)?.providerStopEvidence !== "legacy_staff_confirmation"}');
    expect(archive).toContain('archived endedAt={row.pilot.endedAt}');
  });

  it("explains timed completion without confusing a service cycle with a payment", () => {
    const notice = section("function ServiceDepartureNotice", "export default function PlusPilotAdminSection");

    expect(notice).toContain("נותרו {serviceDeparture.remaining || 0} הצעות להשלמה במחזור הנוכחי.");
    expect(notice).toContain("מועד העברה אוטומטית לארכיון:");
    expect(notice).toContain("שירות Plus הסתיים ·");
    expect(notice).toContain("עצירת Grow טרם אושרה");
    expect(notice).toContain("נותרו {serviceDeparture?.remaining} הצעות במחזור שהסתיים");
    expect(notice).toContain("בקשת סיום שירות דורשת בירור");
    expect(notice).toContain("נדרשים פרטי המחזור כדי לקבוע את מועד סיום השירות.");
    expect(notice).not.toMatch(/שולם עד|תשלום עד/);
  });

  it("remains display-only and leaves the existing confirmed local-end flow and refresh cadence intact", () => {
    const notice = section("function ServiceDepartureNotice", "export default function PlusPilotAdminSection");
    expect(notice).not.toMatch(/mutate|updateStatus|endMembership|setInterval|setTimeout|fetch\(|sendEmail|sendSms/i);
    expect(source).toContain("refetchInterval: 30000");
    expect(source).toContain("providerStoppedConfirmed: true");
    expect(source).toContain("disabled={!providerStopped || !endMember || endMembership.isPending}");
    expect(source).toContain("<PlusCancellationQueue");
    expect(source.indexOf("<PlusCancellationQueue")).toBeLessThan(source.indexOf("grid grid-cols-2 md:grid-cols-5"));
  });
});
