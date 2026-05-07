import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import { setCreditChannel } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("setcreditchannel")
  .setDescription("Set the channel where credit alerts are posted [Manage Server required]")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((opt) =>
    opt.setName("channel").setDescription("The text channel for credit alerts").addChannelTypes(ChannelType.GuildText).setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guildId) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Error").setDescription("Server only.")] });
    return;
  }

  const channel = interaction.options.getChannel("channel", true);
  await setCreditChannel(interaction.guildId, channel.id);

  logger.info({ guildId: interaction.guildId, channelId: channel.id }, "Credit channel set");

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Credit Channel Set")
        .setDescription(`Credit alerts will now be posted in <#${channel.id}>.`)
        .setFooter({ text: `Set by ${interaction.user.tag}` }),
    ],
  });
}
