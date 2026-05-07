import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const creditLogsTable = pgTable("credit_logs", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  adminDiscordId: text("admin_discord_id").notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreditLogSchema = createInsertSchema(creditLogsTable).omit({ id: true, createdAt: true });
export type InsertCreditLog = z.infer<typeof insertCreditLogSchema>;
export type CreditLog = typeof creditLogsTable.$inferSelect;
