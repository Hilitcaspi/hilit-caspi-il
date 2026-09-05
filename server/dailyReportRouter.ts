import { z } from "zod";
import { router, teamProcedure } from "./_core/trpc";
import {
  getDailyReportOverview,
  recordDailyReportDryRun,
  updateDailyReportSettings,
} from "./dailyReportService";

export const dailyReportOptionalCountTargetSchema = z.number().int().min(0).max(1_000_000).nullable().optional();
export const dailyReportOptionalRevenueTargetAgorotSchema = z.number().int().min(0).max(100_000_000).nullable().optional();

export const dailyReportRouter = router({
  overview: teamProcedure.query(async () => getDailyReportOverview()),
  updateSettings: teamProcedure.input(z.object({
    recipientPhone: z.string().trim().max(30).nullable().optional(),
    databaseMonthlyMinTarget: z.number().int().min(1).max(10_000),
    databaseMonthlyStretchTarget: z.number().int().min(1).max(10_000),
    databaseMonthlyBudgetAgorot: z.number().int().min(0).max(1_000_000_000),
    boostMonthlyTarget: dailyReportOptionalCountTargetSchema,
    bundleMonthlyTarget: dailyReportOptionalCountTargetSchema,
    leadMonthlyTarget: dailyReportOptionalCountTargetSchema,
    revenueMonthlyTargetAgorot: dailyReportOptionalRevenueTargetAgorotSchema,
  })).mutation(async ({ input }) => updateDailyReportSettings(input)),
  saveDryRun: teamProcedure.mutation(async () => recordDailyReportDryRun()),
});
