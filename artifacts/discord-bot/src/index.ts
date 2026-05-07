import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "./lib/logger.js";
import * as linkCmd from "./commands/link.js";
import * as rankCmd from "./commands/rank.js";
import * as rankcheckCmd from "./commands/rankcheck.js";
import * as promoteCmd from "./commands/promote.js";
import * as demoteCmd from "./commands/demote.js";
import * as setrankCmd from "./commands/setrank.js";
import * as shoutCmd from "./commands/shout.js";
import * as creditsCmd from "./commands/credits.js";
import * as addcreditCmd from "./commands/addcredit.js";
import * as removecreditCmd from "./commands/removecredit.js";
import * as setcreditchannelCmd from "./commands/setcreditchannel.js";
import * as redeemcreditsCmd from "./commands/redeemcredits.js";
import * as creditboardCmd from "./commands/creditboard.js";
import * as strikeCmd from "./commands/strike.js";
import * as mystrikesCmd from "./commands/mystrikes.js";
import * as viewstrikesCmd from "./commands/viewstrikes.js";
import * as setlogchannelCmd from "./commands/setlogchannel.js";
import * as assignDepartmentCmd from "./commands/assign-department.js";
import * as infoCmd from "./commands/info.js";
import * as rolesCmd from "./commands/roles.js";
import * as commandsCmd from "./commands/commands.js";
import { handleGuildMemberAdd } from "./events/guildMemberAdd.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}

interface Command {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();

for (const cmd of [
  linkCmd,
  rankCmd,
  rankcheckCmd,
  promoteCmd,
  demoteCmd,
  setrankCmd,
  shoutCmd,
  creditsCmd,
  addcreditCmd,
  removecreditCmd,
  setcreditchannelCmd,
  redeemcreditsCmd,
  creditboardCmd,
  strikeCmd,
  mystrikesCmd,
  viewstrikesCmd,
  setlogchannelCmd,
  assignDepartmentCmd,
  infoCmd,
  rolesCmd,
  commandsCmd,
]) {
  commands.set(cmd.data.name, cmd as Command);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (c) => {
  logger.info({ tag: c.user.tag }, "Discord bot is ready");
});

client.on(Events.GuildMemberAdd, async (member) => {
  await handleGuildMemberAdd(member).catch((err) => {
    logger.error({ err }, "Unhandled error in guildMemberAdd");
    console.error("[guildMemberAdd] Unhandled error:", err);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) {
    logger.warn({ command: interaction.commandName }, "Unknown command");
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    logger.error({ err, command: interaction.commandName }, "Command execution failed");
    console.error(`[InteractionCreate] Command "${interaction.commandName}" failed:`, err);
    const msg = { content: "An error occurred while running this command.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => undefined);
    } else {
      await interaction.reply(msg).catch(() => undefined);
    }
  }
});

client.login(DISCORD_TOKEN).catch((err) => {
  logger.error({ err }, "Failed to login to Discord");
  console.error("[login] Failed to login to Discord:", err);
  process.exit(1);
});
