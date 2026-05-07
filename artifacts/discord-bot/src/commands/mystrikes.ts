import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getActiveStrikes } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("mystrikes")
  .setDescription("Receive a DM with your personal strike history");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const strikes = await getActiveStrikes(interaction.user.id);

  const embed = new EmbedBuilder()
    .setColor(strikes.length === 0 ? 0x2ecc71 : 0xe67e22)
    .setTitle("Your Strike History")
    .setDescription(
      strikes.length === 0
        ? "You have no strikes on record. Keep it up!"
        : strikes
            .map(
              (s, i) =>
                `**${i + 1}.** ${s.reason}\n*Issued by <@${s.issuedBy}> — <t:${Math.floor(s.createdAt.getTime() / 1000)}:R>*`
            )
            .join("\n\n")
    )
    .setFooter({ text: `${strikes.length} strike(s) on record` })
    .setTimestamp();

  const dmSent = await interaction.user
    .send({ embeds: [embed] })
    .then(() => true)
    .catch(() => false);

  if (dmSent) {
    await interaction.editReply({ content: "Your strike history has been sent to your DMs." });
  } else {
    // If DMs are closed, just show it ephemerally
    await interaction.editReply({ embeds: [embed] });
  }
}
