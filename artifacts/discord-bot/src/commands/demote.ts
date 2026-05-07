import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { demoteUser, isAdminRank, getRobloxUserByUsername } from "../lib/roblox.js";
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

  const admin = await isAdminRank(callerDb.robloxId);
  if (!admin) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Permission Denied")
          .setDescription("You must be Presidential Assistant or higher to use this command."),
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

  const result = await demoteUser(String(robloxUser.id));

  if (!result.success || !result.newRole) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Demotion Failed")
          .setDescription(
            `Could not demote **${robloxUser.name}**. They may already be at the lowest rank or are not in the group.`
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
