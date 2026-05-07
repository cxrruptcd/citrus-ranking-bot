import { db, usersTable, creditLogsTable, guildSettingsTable, pendingVerificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { User, PendingVerification } from "@workspace/db";

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

// ── Pending verifications ──────────────────────────────────────────────────

export async function createPendingVerification(
  discordId: string,
  robloxId: string,
  robloxUsername: string,
  code: string
): Promise<PendingVerification> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const [row] = await db
    .insert(pendingVerificationsTable)
    .values({ discordId, robloxId, robloxUsername, code, expiresAt })
    .onConflictDoUpdate({
      target: pendingVerificationsTable.discordId,
      set: { robloxId, robloxUsername, code, expiresAt },
    })
    .returning();
  return row;
}

export async function getPendingVerification(discordId: string): Promise<PendingVerification | null> {
  const [row] = await db
    .select()
    .from(pendingVerificationsTable)
    .where(eq(pendingVerificationsTable.discordId, discordId));
  if (!row) return null;
  if (new Date() > row.expiresAt) {
    await db.delete(pendingVerificationsTable).where(eq(pendingVerificationsTable.discordId, discordId));
    return null;
  }
  return row;
}

export async function deletePendingVerification(discordId: string): Promise<void> {
  await db.delete(pendingVerificationsTable).where(eq(pendingVerificationsTable.discordId, discordId));
}

// ── Credits ────────────────────────────────────────────────────────────────

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

// ── Guild settings ─────────────────────────────────────────────────────────

export async function getLogChannel(guildId: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(guildSettingsTable)
    .where(eq(guildSettingsTable.guildId, guildId));
  return row?.logChannelId ?? null;
}

export async function setLogChannel(guildId: string, channelId: string): Promise<void> {
  await db
    .insert(guildSettingsTable)
    .values({ guildId, logChannelId: channelId })
    .onConflictDoUpdate({
      target: guildSettingsTable.guildId,
      set: { logChannelId: channelId },
    });
}

export { db, usersTable, creditLogsTable, guildSettingsTable, pendingVerificationsTable };
