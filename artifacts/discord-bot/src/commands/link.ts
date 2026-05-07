import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getRobloxUserByUsername } from "../lib/roblox.js";
import { linkUser, getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Discord account to your Roblox account")
  .addStringOption((opt) =>
    opt
      .setName("username")
      .setDescription("Your Roblox username")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const username = interaction.options.getString("username", true);

  const robloxUser = await getRobloxUserByUsername(username);
  if (!robloxUser) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("User Not Found")
          .setDescription(`Could not find a Roblox user named **${username}**.`),
      ],
    });
    return;
  }

  try {
    await linkUser(
      interaction.user.id,
      String(robloxUser.id),
      robloxUser.name
    );

    logger.info({ discordId: interaction.user.id, robloxId: robloxUser.id }, "User linked account");

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Account Linked!")
          .setDescription(
            `Successfully linked your Discord to Roblox account **${robloxUser.name}** (ID: ${robloxUser.id}).`
          ),
      ],
    });
  } catch (err) {
    logger.error({ err }, "Failed to link user");
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Error")
          .setDescription("Failed to link your account. The Roblox account may already be linked to another Discord user."),
      ],
    });
  }
}
