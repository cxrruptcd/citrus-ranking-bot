import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel } from "discord.js";
import { getUserByDiscordId, redeemAllCredits, getCreditChannel } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const ROBUX_PER_CREDIT = 25;

export const data = new SlashCommandBuilder()
  .setName("redeemcredits")
  .setDescription("Redeem all your credits for Robux (25 Robux per credit)");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const dbUser = await getUserByDiscordId(interaction.user.id);
  if (!dbUser) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Not Linked").setDescription("Link your account first with `/link start`.")]});
    return;
  }

  if (dbUser.credits === 0) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("No Credits").setDescription("You don't have any credits to redeem.")]});
    return;
  }

  const result = await redeemAllCredits(interaction.user.id);
  if (!result) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Failed").setDescription("Could not process your redemption. Please try again.")]});
    return;
  }

  const robuxValue = result.amount * ROBUX_PER_CREDIT;
  logger.info({ discordId: interaction.user.id, credits: result.amount, robux: robuxValue }, "Credits redeemed");

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Credits Redeemed!")
    .setDescription(
      `Your redemption request has been submitted.\n\n` +
      `**${result.amount}** credits → **${robuxValue} Robux**\n\n` +
      `A staff member will process your payout shortly. Make sure your Roblox account is linked and your group payouts are enabled.`
    )
    .addFields(
      { name: "Credits Redeemed", value: String(result.amount), inline: true },
      { name: "Robux Value", value: `${robuxValue} R$`, inline: true },
      { name: "Rate", value: `${ROBUX_PER_CREDIT} R$ per credit`, inline: true }
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  // Notify credit channel so staff can process it
  if (interaction.guildId) {
    const creditChannelId = await getCreditChannel(interaction.guildId);
    if (creditChannelId) {
      const ch = await interaction.client.channels.fetch(creditChannelId).catch(() => null);
      if (ch instanceof TextChannel) {
        await ch.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xf1c40f)
              .setTitle("⚡ Credit Redemption Request")
              .addFields(
                { name: "User", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: "Roblox", value: dbUser.robloxUsername, inline: true },
                { name: "Credits", value: String(result.amount), inline: true },
                { name: "Robux Owed", value: `${robuxValue} R$`, inline: true }
              )
              .setTimestamp(),
          ],
        }).catch(() => undefined);
      }
    }
  }
}
