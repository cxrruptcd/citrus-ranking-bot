import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getActiveStrikes } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("viewstrikes")
  .setDescription("View strike history for a user")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Discord user to check (defaults to yourself)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
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
            : strikes
                .map(
                  (s, i) =>
                    `**${i + 1}.** ${s.reason}\n*Issued by <@${s.issuedBy}> — <t:${Math.floor(s.createdAt.getTime() / 1000)}:R>*`
                )
                .join("\n\n")
        )
        .setFooter({ text: `${strikes.length} strike(s) total` })
        .setTimestamp(),
    ],
  });
}
