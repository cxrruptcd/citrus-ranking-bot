import { REST, Routes } from "discord.js";
import { logger } from "./lib/logger.js";
import * as linkCmd from "./commands/link.js";
import * as rankCmd from "./commands/rank.js";
import * as promoteCmd from "./commands/promote.js";
import * as demoteCmd from "./commands/demote.js";
import * as setrankCmd from "./commands/setrank.js";
import * as creditsCmd from "./commands/credits.js";
import * as setlogchannelCmd from "./commands/setlogchannel.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}

const commands = [linkCmd, rankCmd, promoteCmd, demoteCmd, setrankCmd, creditsCmd, setlogchannelCmd].map((c) =>
  c.data.toJSON()
);

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Registering ${commands.length} application (/) commands globally...`);
    const data = (await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID ?? ""), {
      body: commands,
    })) as unknown[];
    logger.info(`Successfully registered ${data.length} application (/) commands.`);
  } catch (err) {
    logger.error({ err }, "Failed to register commands");
    process.exit(1);
  }
})();
