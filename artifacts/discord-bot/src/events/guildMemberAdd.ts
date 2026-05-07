import { GuildMember, EmbedBuilder } from "discord.js";
import { getRobloxUserByUsername } from "../lib/roblox.js";
import { linkUser, getUserByDiscordId } from "../lib/db.js";
import { logger } from "../lib/logger.js";

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  if (member.user.bot) return;

  try {
    const existing = await getUserByDiscordId(member.id);
    if (existing) {
      logger.info({ discordId: member.id }, "User already linked, skipping auto-link");
      return;
    }

    const displayName = member.displayName ?? member.user.displayName ?? member.user.username;
    const robloxUser = await getRobloxUserByUsername(displayName);

    if (!robloxUser) {
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe67e22)
            .setTitle("Welcome to the server!")
            .setDescription(
              `We couldn't automatically link your Roblox account.\n\nPlease use \`/link <roblox_username>\` to connect your account.`
            ),
        ],
      }).catch(() => undefined);
      return;
    }

    await linkUser(member.id, String(robloxUser.id), robloxUser.name);

    logger.info(
      { discordId: member.id, robloxId: robloxUser.id, robloxUsername: robloxUser.name },
      "Auto-linked user on join"
    );

    await member.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x2ecc71)
          .setTitle("Account Auto-Linked!")
          .setDescription(
            `Welcome! Your Discord has been automatically linked to Roblox account **${robloxUser.name}**.\n\nIf this is incorrect, use \`/link <your_roblox_username>\` to update it.`
          ),
      ],
    }).catch(() => undefined);
  } catch (err) {
    logger.error({ err, discordId: member.id }, "Failed to auto-link user on join");
  }
}
