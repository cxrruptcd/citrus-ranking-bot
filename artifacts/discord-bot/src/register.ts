import { REST, Routes } from "discord.js";
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
import * as setlogchannelCmd from "./commands/setlogchannel.js";
import * as assignDepartmentCmd from "./commands/assign-department.js";
import * as infoCmd from "./commands/info.js";
import * as rolesCmd from "./commands/roles.js";
import * as commandsCmd from "./commands/commands.js";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN environment variable is required");
}

const commands = [
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
  setlogchannelCmd,
  assignDepartmentCmd,
  infoCmd,
  rolesCmd,
  commandsCmd,
].map((c) => c.data.toJSON());

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
