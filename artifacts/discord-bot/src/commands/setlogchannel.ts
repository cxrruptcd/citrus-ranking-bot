import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { setLogChannel } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("setlogchannel")
  .setDescription("Set the channel where credit add/remove actions are logged [Admin only]")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("The text channel to post logs in")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Error")
          .setDescription("This command can only be used in a server."),
      ],
    });
    return;
  }

  const channel = interaction.options.getChannel("channel", true);

  try {
    await setLogChannel(interaction.guildId, channel.id);

    logger.info(
      { guildId: interaction.guildId, channelId: channel.id, admin: interaction.user.id },
      "Log channel updated"
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Log Channel Set")
          .setDescription(`Credit actions will now be logged in <#${channel.id}>.`)
          .setFooter({ text: `Set by ${interaction.user.tag}` }),
      ],
    });
  } catch (err) {
    logger.error({ err }, "Failed to set log channel");
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Error")
          .setDescription("Failed to save the log channel. Please try again."),
      ],
    });
  }
}
