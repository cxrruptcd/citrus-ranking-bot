import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { getRobloxUserByUsername, getRobloxProfileDescription } from "../lib/roblox.js";
import {
  linkUser,
  getUserByDiscordId,
  getUserByRobloxId,
  createPendingVerification,
  getPendingVerification,
  deletePendingVerification,
} from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { randomBytes } from "crypto";

function generateCode(discordId: string): string {
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `CITRUS-${rand}`;
}

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Discord account to your Roblox account")
  .addSubcommand((sub) =>
    sub
      .setName("start")
      .setDescription("Start the verification process for your Roblox account")
      .addStringOption((opt) =>
        opt.setName("username").setDescription("Your Roblox username").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("verify")
      .setDescription("Confirm verification after adding the code to your Roblox profile")
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();

  if (sub === "start") {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString("username", true);

    const robloxUser = await getRobloxUserByUsername(username);
    if (!robloxUser) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("User Not Found")
            .setDescription(`Could not find a Roblox user named **${username}**.`),
        ],
      });
      return;
    }

    // Check if this Roblox account is already linked to a different Discord user
    const existingByRoblox = await getUserByRobloxId(String(robloxUser.id));
    if (existingByRoblox && existingByRoblox.discordId !== interaction.user.id) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Already Linked")
            .setDescription(
              `The Roblox account **${robloxUser.name}** is already linked to a different Discord user.`
            ),
        ],
      });
      return;
    }

    const code = generateCode(interaction.user.id);

    await createPendingVerification(
      interaction.user.id,
      String(robloxUser.id),
      robloxUser.name,
      code
    );

    logger.info(
      { discordId: interaction.user.id, robloxId: robloxUser.id, code },
      "Verification started"
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("Verification Started")
          .setDescription(
            [
              `To verify ownership of **${robloxUser.name}**, add the code below to your Roblox profile description:`,
              "",
              `\`\`\`${code}\`\`\``,
              "",
              "**Steps:**",
              "1. Go to your [Roblox profile settings](https://www.roblox.com/my/account#!/info)",
              "2. Paste the code anywhere in your **About** / description field",
              "3. Save, then run `/link verify`",
              "",
              "The code expires in **10 minutes**. You can remove it after verification.",
            ].join("\n")
          ),
      ],
    });
    return;
  }

  if (sub === "verify") {
    await interaction.deferReply({ ephemeral: true });

    const pending = await getPendingVerification(interaction.user.id);
    if (!pending) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("No Pending Verification")
            .setDescription(
              "You don't have an active verification request, or it has expired. Run `/link start` first."
            ),
        ],
      });
      return;
    }

    const description = await getRobloxProfileDescription(pending.robloxId);
    if (description === null) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Could Not Fetch Profile")
            .setDescription(
              "Unable to read the Roblox profile. Please make sure your profile is public and try again."
            ),
        ],
      });
      return;
    }

    if (!description.includes(pending.code)) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("Code Not Found")
            .setDescription(
              [
                `The code \`${pending.code}\` was not found in **${pending.robloxUsername}**'s profile description.`,
                "",
                "Make sure you saved the profile after pasting the code, then try again.",
              ].join("\n")
            ),
        ],
      });
      return;
    }

    // Code confirmed — link the account
    await linkUser(interaction.user.id, pending.robloxId, pending.robloxUsername);
    await deletePendingVerification(interaction.user.id);

    logger.info(
      { discordId: interaction.user.id, robloxId: pending.robloxId, robloxUsername: pending.robloxUsername },
      "User verified and linked account"
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Account Linked!")
          .setDescription(
            [
              `Successfully verified and linked your Discord to **${pending.robloxUsername}** (ID: ${pending.robloxId}).`,
              "",
              "You can now remove the code from your Roblox profile description.",
            ].join("\n")
          ),
      ],
    });
  }
}
