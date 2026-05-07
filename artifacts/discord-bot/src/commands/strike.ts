import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import { issueStrike, getActiveStrikes, clearStrikes, getAuditLogChannel } from "../lib/db.js";
import { hasPresidentialTeamRole } from "../lib/permissions.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("strike")
  .setDescription("Strike management [Presidential Team only]")
  .addSubcommand((sub) =>
    sub
      .setName("issue")
      .setDescription("Issue a strike to a staff member")
      .addUserOption((opt) => opt.setName("user").setDescription("User to strike").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the strike").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("View strike history for a user")
      .addUserOption((opt) => opt.setName("user").setDescription("User to check (defaults to yourself)").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear all strikes for a user")
      .addUserOption((opt) => opt.setName("user").setDescription("User to clear strikes for").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub.setName("mine").setDescription("Receive a DM with your personal strike history")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const member = interaction.member as GuildMember;

  // /strike mine — available to everyone
  if (sub === "mine") {
    await interaction.deferReply({ ephemeral: true });
    const strikes = await getActiveStrikes(interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(strikes.length === 0 ? 0x2ecc71 : 0xe67e22)
      .setTitle("Your Strike History")
      .setDescription(
        strikes.length === 0
          ? "You have no strikes on record."
          : strikes.map((s, i) => `**${i + 1}.** ${s.reason}\n*<t:${Math.floor(s.createdAt.getTime() / 1000)}:R>*`).join("\n\n")
      );

    await interaction.user.send({ embeds: [embed] }).catch(() => undefined);
    await interaction.editReply({ content: "Your strike history has been sent to your DMs." });
    return;
  }

  // /strike view — available to everyone
  if (sub === "view") {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user") ?? interaction.user;
    const strikes = await getActiveStrikes(target.id);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(strikes.length === 0 ? 0x2ecc71 : 0xe67e22)
          .setTitle(`Strike History — ${target.username}`)
          .setDescription(
            strikes.length === 0
              ? "No strikes on record."
              : strikes.map((s, i) => `**${i + 1}.** ${s.reason}\n*Issued by <@${s.issuedBy}> — <t:${Math.floor(s.createdAt.getTime() / 1000)}:R>*`).join("\n\n")
          )
          .setFooter({ text: `${strikes.length} strike(s) total` }),
      ],
    });
    return;
  }

  // /strike issue and /strike clear — Presidential Team only
  if (!hasPresidentialTeamRole(member)) {
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Permission Denied").setDescription("You must have the **Presidential Team** role to use this command.")],
      ephemeral: true,
    });
    return;
  }

  if (sub === "issue") {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason", true);

    const strike = await issueStrike(target.id, interaction.user.id, reason);
    const allStrikes = await getActiveStrikes(target.id);

    logger.info({ admin: interaction.user.id, target: target.id, reason }, "Strike issued");

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("Strike Issued")
      .addFields(
        { name: "User", value: `<@${target.id}>`, inline: true },
        { name: "Strike #", value: String(allStrikes.length), inline: true },
        { name: "Reason", value: reason },
        { name: "Issued By", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // DM the target
    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("You have received a strike")
          .addFields(
            { name: "Reason", value: reason },
            { name: "Issued By", value: interaction.user.tag },
            { name: "Total Strikes", value: String(allStrikes.length) }
          )
          .setTimestamp(),
      ],
    }).catch(() => undefined);

    // Audit log
    if (interaction.guildId) {
      const auditChannelId = await getAuditLogChannel(interaction.guildId);
      if (auditChannelId) {
        const ch = await interaction.client.channels.fetch(auditChannelId).catch(() => null);
        if (ch instanceof TextChannel) {
          await ch.send({ embeds: [embed] }).catch(() => undefined);
        }
      }
    }
    return;
  }

  if (sub === "clear") {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user", true);
    const count = await clearStrikes(target.id);

    logger.info({ admin: interaction.user.id, target: target.id, count }, "Strikes cleared");

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Strikes Cleared")
          .setDescription(`Removed **${count}** strike(s) from <@${target.id}>.`)
          .setFooter({ text: `Cleared by ${interaction.user.tag}` })
          .setTimestamp(),
      ],
    });
  }
}
