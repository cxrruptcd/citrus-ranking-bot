import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import { setLogChannel, setAuditLogChannel } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("setlogchannel")
  .setDescription("Configure log channels for this server [Admin only]")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("credits")
      .setDescription("Set the channel where credit add/remove actions are logged")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The text channel to post credit logs in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("audit")
      .setDescription("Set the channel where department assignments and other admin actions are logged")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The text channel to post audit logs in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
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

  const sub = interaction.options.getSubcommand();
  const channel = interaction.options.getChannel("channel", true);

  try {
    if (sub === "credits") {
      await setLogChannel(interaction.guildId, channel.id);
      logger.info(
        { guildId: interaction.guildId, channelId: channel.id, admin: interaction.user.id },
        "Credits log channel updated"
      );
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("Credits Log Channel Set")
            .setDescription(`Credit actions will now be logged in <#${channel.id}>.`)
            .setFooter({ text: `Set by ${interaction.user.tag}` }),
        ],
      });
    } else {
      await setAuditLogChannel(interaction.guildId, channel.id);
      logger.info(
        { guildId: interaction.guildId, channelId: channel.id, admin: interaction.user.id },
        "Audit log channel updated"
      );
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("Audit Log Channel Set")
            .setDescription(`Department assignments and admin actions will now be logged in <#${channel.id}>.`)
            .setFooter({ text: `Set by ${interaction.user.tag}` }),
        ],
      });
    }
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
