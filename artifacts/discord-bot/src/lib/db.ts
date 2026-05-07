import { db, usersTable, creditLogsTable, guildSettingsTable, pendingVerificationsTable, strikesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import type { User, PendingVerification, Strike } from "@workspace/db";

// ── Users ──────────────────────────────────────────────────────────────────

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

export async function setUserDepartment(
  discordId: string,
  department: string | null
): Promise<User | null> {
  const [updated] = await db
    .update(usersTable)
    .set({ department })
    .where(eq(usersTable.discordId, discordId))
    .returning();
  return updated ?? null;
}

export async function getTopCreditHolders(limit = 10): Promise<User[]> {
  return db.select().from(usersTable).orderBy(desc(usersTable.credits)).limit(limit);
}

// ── Pending verifications ──────────────────────────────────────────────────

export async function createPendingVerification(
  discordId: string,
  robloxId: string,
  robloxUsername: string,
  code: string
): Promise<PendingVerification> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
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

export async function redeemAllCredits(discordId: string): Promise<{ amount: number } | null> {
  const user = await getUserByDiscordId(discordId);
  if (!user || user.credits === 0) return null;
  const amount = user.credits;
  await db.update(usersTable).set({ credits: 0 }).where(eq(usersTable.discordId, discordId));
  await db.insert(creditLogsTable).values({
    discordId,
    adminDiscordId: discordId,
    amount: -amount,
    reason: "Redeemed for Robux",
  });
  return { amount };
}

// ── Strikes ────────────────────────────────────────────────────────────────

export async function issueStrike(
  discordId: string,
  issuedBy: string,
  reason: string
): Promise<Strike> {
  const [row] = await db
    .insert(strikesTable)
    .values({ discordId, issuedBy, reason })
    .returning();
  return row;
}

export async function getActiveStrikes(discordId: string): Promise<Strike[]> {
  return db
    .select()
    .from(strikesTable)
    .where(eq(strikesTable.discordId, discordId))
    .orderBy(desc(strikesTable.createdAt));
}

export async function clearStrikes(discordId: string): Promise<number> {
  const rows = await db
    .delete(strikesTable)
    .where(eq(strikesTable.discordId, discordId))
    .returning();
  return rows.length;
}

// ── Guild settings ─────────────────────────────────────────────────────────

export async function getLogChannel(guildId: string): Promise<string | null> {
  const [row] = await db.select().from(guildSettingsTable).where(eq(guildSettingsTable.guildId, guildId));
  return row?.logChannelId ?? null;
}

export async function getAuditLogChannel(guildId: string): Promise<string | null> {
  const [row] = await db.select().from(guildSettingsTable).where(eq(guildSettingsTable.guildId, guildId));
  return row?.auditLogChannelId ?? row?.logChannelId ?? null;
}

export async function getCreditChannel(guildId: string): Promise<string | null> {
  const [row] = await db.select().from(guildSettingsTable).where(eq(guildSettingsTable.guildId, guildId));
  return row?.creditChannelId ?? row?.logChannelId ?? null;
}

export async function setLogChannel(guildId: string, channelId: string): Promise<void> {
  await db
    .insert(guildSettingsTable)
    .values({ guildId, logChannelId: channelId })
    .onConflictDoUpdate({ target: guildSettingsTable.guildId, set: { logChannelId: channelId } });
}

export async function setAuditLogChannel(guildId: string, channelId: string): Promise<void> {
  await db
    .insert(guildSettingsTable)
    .values({ guildId, logChannelId: channelId, auditLogChannelId: channelId })
    .onConflictDoUpdate({ target: guildSettingsTable.guildId, set: { auditLogChannelId: channelId } });
}

export async function setCreditChannel(guildId: string, channelId: string): Promise<void> {
  await db
    .insert(guildSettingsTable)
    .values({ guildId, logChannelId: channelId, creditChannelId: channelId })
    .onConflictDoUpdate({ target: guildSettingsTable.guildId, set: { creditChannelId: channelId } });
}

export { db, usersTable, creditLogsTable, guildSettingsTable, pendingVerificationsTable, strikesTable };
