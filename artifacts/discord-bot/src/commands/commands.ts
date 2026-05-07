import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("commands")
  .setDescription("Show all available bot commands");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("📋 Bot Commands")
        .setDescription("All available slash commands and who can use them.")
        .addFields(
          {
            name: "⭐ Ranking — Roblox Rank ≥ 13 required",
            value: [
              "`/promote <username>` — Promote a member one rank up",
              "`/demote <username>` — Demote a member one rank down",
              "`/setrank <username> <rank>` — Set a member to a specific role",
            ].join("\n"),
          },
          {
            name: "📢 Shout — Roblox Rank ≥ 13 required",
            value: "`/shout <message>` — Post a shout to the Roblox group",
          },
          {
            name: "⚠️ Strikes — Presidential Team (Discord role) required",
            value: [
              "`/strike issue <user> <reason>` — Issue a strike to a staff member",
              "`/strike view [user]` — View strike history for a user",
              "`/strike clear <user>` — Clear all strikes for a user",
            ].join("\n"),
          },
          {
            name: "💰 Credits — Presidential Assistant or above (Roblox rank) required",
            value: [
              "`/addcredit <user> <amount>` — Add credits to a staff member",
              "`/removecredit <user> <amount>` — Remove credits from a staff member",
              "`/setcreditchannel <channel>` — Set the credit alert channel",
            ].join("\n"),
          },
          {
            name: "🏢 Departments — Lead roles required",
            value: [
              "`/assign-department <user> <department>` — Assign a user to a department",
              "`/info [user]` — View a user's full profile",
            ].join("\n"),
          },
          {
            name: "⚙️ Setup — Manage Server permission required",
            value: [
              "`/setlogchannel credits` — Set the credits log channel",
              "`/setlogchannel audit` — Set the audit log channel",
            ].join("\n"),
          },
          {
            name: "👤 Personal — Available to everyone",
            value: [
              "`/credits check [user]` — Check your (or another user's) credit balance",
              "`/redeemcredits` — Redeem all your credits for Robux",
              "`/strike mine` — Receive a DM with your personal strike history",
              "`/rankcheck [username]` — Check a Roblox member's current rank",
              "`/roles` — List all available roles in the Roblox group",
              "`/creditboard` — View the top credit holders in the server",
              "`/link start <username>` — Link your Roblox account",
              "`/link verify` — Confirm your Roblox account link",
              "`/commands` — Show this help message",
            ].join("\n"),
          }
        )
        .setFooter({ text: "Citrus Ranking Bot • 25 Robux per credit" })
        .setTimestamp(),
    ],
    ephemeral: false,
  });
}
