import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { isAdminRank } from "../lib/roblox.js";
import { getUserByDiscordId, adjustCredits, getCredits } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("credits")
  .setDescription("Manage or check credits")
  .addSubcommand((sub) =>
    sub
      .setName("check")
      .setDescription("Check your own credit balance or another user's")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to check (defaults to yourself)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add credits to a user [Admin only]")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to give credits to").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt.setName("amount").setDescription("Number of credits to add").setRequired(true).setMinValue(1)
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for adding credits").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove credits from a user [Admin only]")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to remove credits from").setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("amount")
          .setDescription("Number of credits to remove")
          .setRequired(true)
          .setMinValue(1)
      )
      .addStringOption((opt) =>
        opt.setName("reason").setDescription("Reason for removing credits").setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "check") {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser("user") ?? interaction.user;
    const balance = await getCredits(target.id);

    if (balance === null) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Not Linked")
            .setDescription(
              target.id === interaction.user.id
                ? "You haven't linked your Roblox account yet. Use `/link` first."
                : `<@${target.id}> hasn't linked their account yet.`
            ),
        ],
      });
      return;
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("Credit Balance")
          .setDescription(`<@${target.id}> has **${balance}** credits.`),
      ],
    });
    return;
  }

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
          .setDescription("You must be Presidential Assistant or higher to manage credits."),
      ],
    });
    return;
  }

  const target = interaction.options.getUser("user", true);
  const amount = interaction.options.getInteger("amount", true);
  const reason = interaction.options.getString("reason") ?? undefined;
  const delta = sub === "add" ? amount : -amount;

  const result = await adjustCredits(target.id, delta, interaction.user.id, reason);

  if (!result) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Failed")
          .setDescription(`<@${target.id}> doesn't have a linked account.`),
      ],
    });
    return;
  }

  logger.info(
    { admin: interaction.user.id, target: target.id, delta, reason },
    "Credits adjusted"
  );

  const color = sub === "add" ? 0x2ecc71 : 0xe74c3c;
  const verb = sub === "add" ? "Added" : "Removed";

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setTitle(`Credits ${verb}`)
        .addFields(
          { name: "User", value: `<@${target.id}>`, inline: true },
          { name: `Credits ${verb}`, value: String(amount), inline: true },
          { name: "New Balance", value: String(result.newBalance), inline: true },
          ...(reason ? [{ name: "Reason", value: reason }] : [])
        )
        .setFooter({ text: `By ${interaction.user.tag}` }),
    ],
  });
}
