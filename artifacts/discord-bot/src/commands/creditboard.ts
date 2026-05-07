import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getTopCreditHolders } from "../lib/db.js";

const MEDALS = ["🥇", "🥈", "🥉"];

export const data = new SlashCommandBuilder()
  .setName("creditboard")
  .setDescription("View the top credit holders in the server");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const top = await getTopCreditHolders(10);

  if (top.length === 0) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle("Credit Leaderboard").setDescription("No credit holders yet.")]});
    return;
  }

  const lines = top.map((u, i) => {
    const medal = MEDALS[i] ?? `**${i + 1}.**`;
    return `${medal} <@${u.discordId}> — **${u.credits}** credits`;
  });

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle("🏆 Credit Leaderboard")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Top 10 credit holders" })
        .setTimestamp(),
    ],
  });
}
