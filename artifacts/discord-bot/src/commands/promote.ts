import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { promoteUser, isAdminRank, getRobloxUserByUsername } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("promote")
  .setDescription("Promote a Roblox user one rank up in the group")
  .addStringOption((opt) =>
    opt.setName("username").setDescription("Roblox username to promote").setRequired(true)
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

  const result = await promoteUser(String(robloxUser.id));

  if (!result.success || !result.newRole) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Promotion Failed")
          .setDescription(
            `Could not promote **${robloxUser.name}**. They may already be at the highest rank or are not in the group.`
          ),
      ],
    });
    return;
  }

  logger.info(
    { admin: interaction.user.id, robloxUser: robloxUser.name, newRank: result.newRole.rank },
    "User promoted"
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("User Promoted!")
        .setDescription(
          `**${robloxUser.name}** has been promoted to **${result.newRole.name}** (Rank ${result.newRole.rank}).`
        )
        .setFooter({ text: `Promoted by ${interaction.user.tag}` }),
    ],
  });
}
