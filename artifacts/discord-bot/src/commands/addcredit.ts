import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember, TextChannel } from "discord.js";
import { getGroupMembership } from "../lib/roblox.js";
import { getUserByDiscordId, adjustCredits, getCreditChannel } from "../lib/db.js";
import { passesRankCheck } from "../lib/permissions.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("addcredit")
  .setDescription("Add credits to a staff member [Presidential Assistant+ required]")
  .addUserOption((opt) => opt.setName("user").setDescription("Discord user to give credits to").setRequired(true))
  .addIntegerOption((opt) => opt.setName("amount").setDescription("Number of credits to add").setRequired(true).setMinValue(1))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for adding credits").setRequired(false));

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const callerDb = await getUserByDiscordId(interaction.user.id);
  if (!callerDb) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Not Linked").setDescription("Link your account first with `/link start`.")]});
    return;
  }

  const member = interaction.member as GuildMember;
  const callerMembership = await getGroupMembership(callerDb.robloxId);

  if (!passesRankCheck(member, callerMembership?.role.rank ?? 0, 20)) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Permission Denied").setDescription("You must be **Presidential Assistant or higher** (Rank 20+) to add credits.")]});
    return;
  }

  const target = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason") ?? undefined;

  const result = await adjustCredits(target.id, amount, interaction.user.id, reason);
  if (!result) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Failed").setDescription(`<@${target.id}> doesn't have a linked account.`)]});
    return;
  }

  logger.info({ admin: interaction.user.id, target: target.id, amount, reason }, "Credits added");

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Credits Added")
    .addFields(
      { name: "User", value: `<@${target.id}>`, inline: true },
      { name: "Credits Added", value: String(amount), inline: true },
      { name: "New Balance", value: String(result.newBalance), inline: true },
      ...(reason ? [{ name: "Reason", value: reason }] : [])
    )
    .setFooter({ text: `By ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  if (interaction.guildId) {
    const creditChannelId = await getCreditChannel(interaction.guildId);
    if (creditChannelId) {
      const ch = await interaction.client.channels.fetch(creditChannelId).catch(() => null);
      if (ch instanceof TextChannel) await ch.send({ embeds: [embed] }).catch(() => undefined);
    }
  }
}
