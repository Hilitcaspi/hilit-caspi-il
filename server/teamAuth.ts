/**
 * Team member authentication module.
 * Handles email/password login for staff members (e.g., Sivan)
 * who need CRM/matchmaking access without Manus OAuth.
 */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db";
import { sql } from "drizzle-orm";
import type { TeamMember } from "./_core/context";

const JWT_SECRET = process.env.JWT_SECRET || "";
const TEAM_TOKEN_EXPIRY = "365d"; // 1 year (effectively permanent)

export interface TeamTokenPayload {
  type: "team";
  teamMemberId: number;
  email: string;
  name: string;
  role: "team" | "admin";
}

/**
 * Authenticate a team member by email and password.
 * Returns a signed JWT on success, or null on failure.
 */
export async function authenticateTeamMember(
  email: string,
  password: string
): Promise<{ token: string; member: TeamMember } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [rows] = await (db as any).execute(
      sql`SELECT id, email, password_hash, name, role, is_active FROM team_members WHERE LOWER(email) = LOWER(${email}) LIMIT 1`
    );

    const members = rows as Array<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      role: "team" | "admin";
      is_active: number;
    }>;

    if (!members || members.length === 0) return null;
    const member = members[0];

    if (!member.is_active) return null;

    const passwordValid = await bcrypt.compare(password, member.password_hash);
    if (!passwordValid) return null;

    // Update last_login_at
    await (db as any).execute(
      sql`UPDATE team_members SET last_login_at = NOW() WHERE id = ${member.id}`
    );

    const payload: TeamTokenPayload = {
      type: "team",
      teamMemberId: member.id,
      email: member.email,
      name: member.name,
      role: member.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TEAM_TOKEN_EXPIRY });

    return {
      token,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role,
      },
    };
  } catch (error) {
    console.error("[TeamAuth] Login error:", error);
    return null;
  }
}

/**
 * Verify a team JWT token and return the team member info.
 * Returns null if the token is invalid or expired.
 */
export function verifyTeamToken(token: string): TeamMember | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TeamTokenPayload;
    if (payload.type !== "team") return null;

    return {
      id: payload.teamMemberId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}
