import { clerkClient, getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";

export type AppProfile = typeof profilesTable.$inferSelect;

export function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export const requireAuthenticated: RequestHandler = (req, res, next) => {
  if (!authenticatedUserId(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};

export async function getProfileForUser(userId: string): Promise<AppProfile | null> {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId))
    .limit(1);

  if (!profile) return null;
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && profile.email.toLowerCase() === ownerEmail && profile.role !== "owner") {
    const [promoted] = await db
      .update(profilesTable)
      .set({ role: "owner", tutorStatus: "not_applicable" })
      .where(eq(profilesTable.userId, userId))
      .returning();
    return promoted ?? profile;
  }
  return profile;
}

export async function getClerkIdentity(userId: string): Promise<{
  email: string;
  name: string;
}> {
  const user = await clerkClient.users.getUser(userId);
  const primary = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  );
  const email = primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) throw new Error("The signed-in account has no verified email address.");
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    email.split("@")[0] ||
    "Student";
  return { email, name };
}

export async function requireProfile(
  userId: string,
): Promise<{ profile: AppProfile | null; error?: "missing" | "suspended" }> {
  const profile = await getProfileForUser(userId);
  if (!profile) return { profile: null, error: "missing" };
  if (profile.accountStatus !== "active") {
    return { profile, error: "suspended" };
  }
  return { profile };
}
