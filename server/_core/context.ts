import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyTeamToken } from "../teamAuth";

export type TeamMember = {
  id: number;
  email: string;
  name: string;
  role: "team" | "admin";
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  teamMember: TeamMember | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let teamMember: TeamMember | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // If no Manus OAuth user, check for team JWT token
  if (!user) {
    const teamToken =
      opts.req.cookies?.team_token ||
      opts.req.headers["x-team-token"] as string | undefined;
    if (teamToken) {
      teamMember = verifyTeamToken(teamToken);
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    teamMember,
  };
}
