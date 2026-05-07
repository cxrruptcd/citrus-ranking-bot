import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { demoteUser, getRobloxUserByUsername, getGroupMembership } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("demote")
  .setDescription("Demote a Roblox user one rank down in the group")
  .addStringOption((opt) =>
    opt.setName("username").setDescription("Roblox username to demote").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const callerDb = await getUserByDiscordId(interaction.user.id);
  if (!callerDb) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not Linked")
          .setDescription("You need to link your Roblox account first with `/link`."),
      ],
    });
    return;
  }

  const callerMembership = await getGroupMembership(callerDb.robloxId);
  if (!callerMembership || callerMembership.role.rank < 13) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Permission Denied")
          .setDescription("You must be rank 13 or higher in the group to use this command."),
      ],
    });
    return;
  }

  const usernameInput = interaction.options.getString("username", true);
  const robloxUser = await getRobloxUserByUsername(usernameInput);
  if (!robloxUser) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("User Not Found")
          .setDescription(`Could not find a Roblox user named **${usernameInput}**.`),
      ],
    });
    return;
  }

  const targetMembership = await getGroupMembership(String(robloxUser.id));
  if (!targetMembership) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not in Group")
          .setDescription(`**${robloxUser.name}** is not a member of the group.`),
      ],
    });
    return;
  }

  if (targetMembership.role.rank >= callerMembership.role.rank) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Permission Denied")
          .setDescription(
            `You cannot demote **${robloxUser.name}** — they hold the rank **${targetMembership.role.name}** (${targetMembership.role.rank}), which is equal to or higher than your rank (${callerMembership.role.rank}).`
          ),
      ],
    });
    return;
  }

  const result = await demoteUser(String(robloxUser.id));

  if (!result.success || !result.newRole) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Demotion Failed")
          .setDescription(
            `Could not demote **${robloxUser.name}**. They may already be at the lowest rank.`
          ),
      ],
    });
    return;
  }

  logger.info(
    { admin: interaction.user.id, robloxUser: robloxUser.name, newRank: result.newRole.rank },
    "User demoted"
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xe67e22)
        .setTitle("User Demoted")
        .setDescription(
          `**${robloxUser.name}** has been demoted to **${result.newRole.name}** (Rank ${result.newRole.rank}).`
        )
        .setFooter({ text: `Demoted by ${interaction.user.tag}` }),
    ],
  });
}
