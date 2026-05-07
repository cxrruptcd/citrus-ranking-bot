import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getGroupRoles, setGroupRank, isAdminRank, getRobloxUserByUsername } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("setrank")
  .setDescription("Set a Roblox user's group rank by name or number")
  .addStringOption((opt) =>
    opt.setName("username").setDescription("Roblox username to rank").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("rank")
      .setDescription("Rank name or rank number (e.g. 'Member' or '5')")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const callerDb = await getUserByDiscordId(interaction.user.id);
  if (!callerDb) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Not Linked")
          .setDescription("You need to link your Roblox account first with `/link`."),
      ],
    });
    return;
  }

  const admin = await isAdminRank(callerDb.robloxId);
  if (!admin) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Permission Denied")
          .setDescription("You must be Presidential Assistant or higher to use this command."),
      ],
    });
    return;
  }

  const usernameInput = interaction.options.getString("username", true);
  const rankInput = interaction.options.getString("rank", true);

  const [robloxUser, roles] = await Promise.all([
    getRobloxUserByUsername(usernameInput),
    getGroupRoles(),
  ]);

  if (!robloxUser) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("User Not Found")
          .setDescription(`Could not find a Roblox user named **${usernameInput}**.`),
      ],
    });
    return;
  }

  const rankNumber = parseInt(rankInput, 10);
  const role = isNaN(rankNumber)
    ? roles.find((r) => r.name.toLowerCase() === rankInput.toLowerCase())
    : roles.find((r) => r.rank === rankNumber);

  if (!role) {
    const roleList = roles
      .filter((r) => r.rank > 0 && r.rank < 255)
      .sort((a, b) => a.rank - b.rank)
      .map((r) => `**${r.rank}** — ${r.name}`)
      .join("\n");

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Rank Not Found")
          .setDescription(
            `Could not find a rank matching **${rankInput}**.\n\nAvailable ranks:\n${roleList}`
          ),
      ],
    });
    return;
  }

  const success = await setGroupRank(String(robloxUser.id), role.id);

  if (!success) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Failed")
          .setDescription(`Could not set rank for **${robloxUser.name}**.`),
      ],
    });
    return;
  }

  logger.info(
    { admin: interaction.user.id, robloxUser: robloxUser.name, roleName: role.name, roleRank: role.rank },
    "User rank set"
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Rank Set!")
        .setDescription(
          `**${robloxUser.name}** has been set to **${role.name}** (Rank ${role.rank}).`
        )
        .setFooter({ text: `Set by ${interaction.user.tag}` }),
    ],
  });
}
