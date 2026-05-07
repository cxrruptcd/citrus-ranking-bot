import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const guildSettingsTable = pgTable("guild_settings", {
  guildId: text("guild_id").primaryKey(),
  logChannelId: text("log_channel_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type GuildSettings = typeof guildSettingsTable.$inferSelect;
