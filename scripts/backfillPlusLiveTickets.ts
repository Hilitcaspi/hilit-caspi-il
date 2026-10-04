import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { hasActivePlusCouponEntitlement } from "../server/couponPolicy";
import { ensurePaidPlusLiveTicket, existingLiveTicket } from "../server/liveOctober";
import { plusPilotMembers, singles } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({
    email: singles.email, isPaid: singles.isPaid, status: plusPilotMembers.status,
    billingStatus: plusPilotMembers.billingStatus, billingCycleEndsAt: plusPilotMembers.billingCycleEndsAt,
  }).from(plusPilotMembers).innerJoin(singles, eq(plusPilotMembers.singleId, singles.id));
  const eligible = rows.filter(row => row.email && row.isPaid && hasActivePlusCouponEntitlement(row));
  if (!process.argv.includes("--apply")) {
    console.log(JSON.stringify({ mode: "dry-run", activePaidPlus: eligible.length }));
    return;
  }
  let issued = 0, alreadyHeld = 0, failed = 0;
  for (const row of eligible) {
    try {
      if (await existingLiveTicket(row.email!)) { alreadyHeld++; continue; }
      if (await ensurePaidPlusLiveTicket(row.email!)) issued++;
      else failed++;
    } catch { failed++; }
  }
  console.log(JSON.stringify({ mode: "applied", activePaidPlus: eligible.length, issued, alreadyHeld, failed }));
  if (failed) process.exitCode = 1;
}
main().catch(error => { console.error("Plus live backfill failed:", error instanceof Error ? error.name : "unknown"); process.exitCode = 1; }).finally(() => setTimeout(() => process.exit(process.exitCode ?? 0), 100));
