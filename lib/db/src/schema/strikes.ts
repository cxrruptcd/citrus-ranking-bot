import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const strikesTable = pgTable("strikes", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull(),
  issuedBy: text("issued_by").notNull(),
  reason: text("reason").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Strike = typeof strikesTable.$inferSelect;
