import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getUserByDiscordId } from "../lib/db.js";
import { getGroupMembership } from "../lib/roblox.js";

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("View a user's linked account info, rank, department, and credits")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Discord user to look up (defaults to yourself)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const target = interaction.options.getUser("user") ?? interaction.user;
  const dbUser = await getUserByDiscordId(target.id);

  if (!dbUser) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not Linked")
          .setDescription(
            target.id === interaction.user.id
              ? "You haven't linked your Roblox account yet. Use `/link start` to get started."
              : `<@${target.id}> hasn't linked their Roblox account yet.`
          ),
      ],
    });
    return;
  }

  // Fetch live rank from Roblox (non-blocking — we'll show N/A if it fails)
  const membership = await getGroupMembership(dbUser.robloxId);

  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`Info — ${target.username}`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      {
        name: "Discord",
        value: `<@${target.id}>`,
        inline: true,
      },
      {
        name: "Roblox Username",
        value: dbUser.robloxUsername,
        inline: true,
      },
      {
        name: "Roblox ID",
        value: dbUser.robloxId,
        inline: true,
      },
      {
        name: "Group Rank",
        value: membership
          ? `${membership.role.name} (${membership.role.rank})`
          : "Not in group / unavailable",
        inline: true,
      },
      {
        name: "Credits",
        value: String(dbUser.credits),
        inline: true,
      },
      {
        name: "Department",
        value: dbUser.department ?? "Non-Applicable (N/A)",
        inline: true,
      }
    )
    .setFooter({ text: `User ID: ${target.id}` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
