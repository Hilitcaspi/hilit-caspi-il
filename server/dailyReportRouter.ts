import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import {
  getDailyReportOverview,
  recordDailyReportDryRun,
  updateDailyReportSettings,
} from "./dailyReportService";

const optionalTarget = z.number().int().min(0).max(1_000_000).nullable().optional();

export const dailyReportRouter = router({
  overview: teamProcedure.query(async () => getDailyReportOverview()),
  updateSettings: teamProcedure.input(z.object({
    recipientPhone: z.string().trim().max(30).nullable().optional(),
    databaseMonthlyMinTarget: z.number().int().min(1).max(10_000),
    databaseMonthlyStretchTarget: z.number().int().min(1).max(10_000),
    databaseMonthlyBudgetAgorot: z.number().int().min(0).max(1_000_000_000),
    boostMonthlyTarget: optionalTarget,
    bundleMonthlyTarget: optionalTarget,
    leadMonthlyTarget: optionalTarget,
    revenueMonthlyTargetAgorot: optionalTarget,
  })).mutation(async ({ input }) => updateDailyReportSettings(input)),
  saveDryRun: teamProcedure.mutation(async () => recordDailyReportDryRun()),
});
