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
    const teamTokenCookie = opts.req.cookies?.team_token;
    const teamTokenHeader = opts.req.headers["x-team-token"] as string | undefined;
    const teamToken = teamTokenCookie || teamTokenHeader;
    if (teamToken) {
      console.log(`[TeamAuth] Token found via ${teamTokenCookie ? 'cookie' : 'header'}, length: ${teamToken.length}`);
      teamMember = verifyTeamToken(teamToken);
      if (teamMember) {
        console.log(`[TeamAuth] ✓ Verified: ${teamMember.name} (${teamMember.email})`);
      } else {
        console.log(`[TeamAuth] ✗ Token verification failed`);
      }
    } else {
      // Only log for tRPC requests (not static assets)
      const url = opts.req.url || '';
      if (url.includes('/api/trpc')) {
        console.log(`[TeamAuth] No team token found. Cookie: ${!!teamTokenCookie}, Header: ${!!teamTokenHeader}, URL: ${url.substring(0, 80)}`);
      }
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    teamMember,
  };
}
