import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { getGroupMembership, getRobloxUserByUsername } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("rankcheck")
  .setDescription("Check a Roblox member's current group rank")
  .addStringOption((opt) =>
    opt.setName("username").setDescription("Roblox username to check (leave empty to check yourself)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const usernameInput = interaction.options.getString("username");
  let robloxId: string;
  let robloxUsername: string;

  if (usernameInput) {
    const robloxUser = await getRobloxUserByUsername(usernameInput);
    if (!robloxUser) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("User Not Found").setDescription(`Could not find a Roblox user named **${usernameInput}**.`)]});
      return;
    }
    robloxId = String(robloxUser.id);
    robloxUsername = robloxUser.name;
  } else {
    const dbUser = await getUserByDiscordId(interaction.user.id);
    if (!dbUser) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Not Linked").setDescription("You haven't linked your Roblox account yet. Use `/link start` or provide a username.")]});
      return;
    }
    robloxId = dbUser.robloxId;
    robloxUsername = dbUser.robloxUsername;
  }

  const membership = await getGroupMembership(robloxId);
  if (!membership) {
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Not in Group").setDescription(`**${robloxUsername}** is not a member of the group, or the rank could not be retrieved.`)]});
    return;
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Group Rank")
        .addFields(
          { name: "Roblox User", value: robloxUsername, inline: true },
          { name: "Rank Name", value: membership.role.name, inline: true },
          { name: "Rank Number", value: String(membership.role.rank), inline: true }
        ),
    ],
  });
}
