import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getGroupMembership } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Check a user's current Roblox group rank")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Discord user to check (defaults to yourself)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const target = interaction.options.getUser("user") ?? interaction.user;
  const dbUser = await getUserByDiscordId(target.id);

  if (!dbUser) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not Linked")
          .setDescription(
            target.id === interaction.user.id
              ? "You haven't linked your Roblox account yet. Use `/link` to get started."
              : `<@${target.id}> hasn't linked their Roblox account yet.`
          ),
      ],
    });
    return;
  }

  const membership = await getGroupMembership(dbUser.robloxId);

  if (!membership) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not in Group")
          .setDescription(
            `**${dbUser.robloxUsername}** is not a member of the group, or the rank could not be retrieved.`
          ),
      ],
    });
    return;
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Group Rank")
        .addFields(
          { name: "Roblox User", value: dbUser.robloxUsername, inline: true },
          { name: "Rank Name", value: membership.role.name, inline: true },
          { name: "Rank Number", value: String(membership.role.rank), inline: true }
        )
        .setFooter({ text: `Discord: ${target.tag}` }),
    ],
  });
}
