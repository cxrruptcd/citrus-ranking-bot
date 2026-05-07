import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { promoteUser, isAdminRank } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("promote")
  .setDescription("Promote a user one rank up in the Roblox group")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Discord user to promote").setRequired(true)
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
          .setDescription("You must be Presidential Assistant or higher in the group to use this command."),
      ],
    });
    return;
  }

  const target = interaction.options.getUser("user", true);
  const targetDb = await getUserByDiscordId(target.id);

  if (!targetDb) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not Linked")
          .setDescription(`<@${target.id}> hasn't linked their Roblox account yet.`),
      ],
    });
    return;
  }

  const result = await promoteUser(targetDb.robloxId);

  if (!result.success || !result.newRole) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Promotion Failed")
          .setDescription(
            `Could not promote **${targetDb.robloxUsername}**. They may already be at the highest rank.`
          ),
      ],
    });
    return;
  }

  logger.info(
    { admin: interaction.user.id, target: target.id, newRank: result.newRole.rank },
    "User promoted"
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("User Promoted!")
        .setDescription(
          `**${targetDb.robloxUsername}** has been promoted to **${result.newRole.name}** (Rank ${result.newRole.rank}).`
        )
        .setFooter({ text: `Promoted by ${interaction.user.tag}` }),
    ],
  });
}
