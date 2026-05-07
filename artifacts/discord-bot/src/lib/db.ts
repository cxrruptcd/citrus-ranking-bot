import { db, usersTable, creditLogsTable, guildSettingsTable } from "@workspace/db";
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

export { db, usersTable, creditLogsTable, guildSettingsTable };
