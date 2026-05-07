import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getGroupRoles } from "../lib/roblox.js";

export const data = new SlashCommandBuilder()
  .setName("roles")
  .setDescription("List all available roles in the Roblox group");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const roles = await getGroupRoles();
  if (roles.length === 0) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("No Roles").setDescription("Could not retrieve group roles. Please try again.")]});
    return;
  }

  const sorted = roles.filter((r) => r.rank > 0).sort((a, b) => b.rank - a.rank);

  const chunks: string[] = [];
  let current = "";
  for (const r of sorted) {
    const line = `\`${String(r.rank).padStart(3, " ")}\` — **${r.name}** (${r.memberCount} members)\n`;
    if (current.length + line.length > 1000) {
      chunks.push(current);
      current = line;
    } else {
      current += line;
    }
  }
  if (current) chunks.push(current);

  const embeds = chunks.map((chunk, i) =>
    new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(i === 0 ? "Group Roles" : "Group Roles (continued)")
      .setDescription(chunk)
      .setFooter(i === chunks.length - 1 ? { text: `${sorted.length} roles total` } : null)
  );

  await interaction.editReply({ embeds });
}
