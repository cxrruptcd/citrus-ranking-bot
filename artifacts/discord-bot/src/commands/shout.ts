import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { postGroupShout, getGroupMembership } from "../lib/roblox.js";
import { getUserByDiscordId } from "../lib/db.js";
import { passesRankCheck } from "../lib/permissions.js";
import { logger } from "../lib/logger.js";

export const data = new SlashCommandBuilder()
  .setName("shout")
  .setDescription("Post a shout to the Roblox group (Rank 13+ required)")
  .addStringOption((opt) =>
    opt.setName("message").setDescription("The shout message").setRequired(true).setMaxLength(255)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const callerDb = await getUserByDiscordId(interaction.user.id);
  if (!callerDb) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Not Linked").setDescription("Link your Roblox account first with `/link start`.")],
    });
    return;
  }

  const member = interaction.member as GuildMember;
  const callerMembership = await getGroupMembership(callerDb.robloxId);

  if (!passesRankCheck(member, callerMembership?.role.rank ?? 0, 13)) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Permission Denied").setDescription("You must be **Rank 13 or higher** in the Roblox group to post a shout.")],
    });
    return;
  }

  const message = interaction.options.getString("message", true);
  const success = await postGroupShout(message);

  if (!success) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(0xe74c3c).setTitle("Shout Failed").setDescription("Could not post the shout. Make sure the API key has `group:write` scope.")],
    });
    return;
  }

  logger.info({ admin: interaction.user.id, message }, "Group shout posted");

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Shout Posted!")
        .setDescription(`**Message:** ${message}`)
        .setFooter({ text: `Posted by ${interaction.user.tag}` })
        .setTimestamp(),
    ],
  });
}
