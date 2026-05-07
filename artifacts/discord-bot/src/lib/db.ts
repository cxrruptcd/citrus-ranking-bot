import { db, usersTable, creditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { User } from "@workspace/db";

export async function getUserByDiscordId(discordId: string): Promise<User | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.discordId, discordId));
  return user ?? null;
}

export async function getUserByRobloxId(robloxId: string): Promise<User | null> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.robloxId, robloxId));
  return user ?? null;
}

export async function linkUser(
  discordId: string,
  robloxId: string,
  robloxUsername: string
): Promise<User> {
  const [user] = await db
    .insert(usersTable)
    .values({ discordId, robloxId, robloxUsername, credits: 0 })
    .onConflictDoUpdate({
      target: usersTable.discordId,
      set: { robloxId, robloxUsername },
    })
    .returning();
  return user;
}

export async function adjustCredits(
  discordId: string,
  amount: number,
  adminDiscordId: string,
  reason?: string
): Promise<{ user: User; newBalance: number } | null> {
  const user = await getUserByDiscordId(discordId);
  if (!user) return null;

  const newBalance = Math.max(0, user.credits + amount);

  const [updated] = await db
    .update(usersTable)
    .set({ credits: newBalance })
    .where(eq(usersTable.discordId, discordId))
    .returning();

  await db.insert(creditLogsTable).values({
    discordId,
    adminDiscordId,
    amount,
    reason: reason ?? null,
  });

  return { user: updated, newBalance };
}

export async function getCredits(discordId: string): Promise<number | null> {
  const user = await getUserByDiscordId(discordId);
  return user?.credits ?? null;
}

export { db, usersTable, creditLogsTable };
