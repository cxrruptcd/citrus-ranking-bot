import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import { getUserByDiscordId, setUserDepartment, getAuditLogChannel } from "../lib/db.js";
import { logger } from "../lib/logger.js";

// All known department names — these must exactly match Discord role names in your server
const DEPARTMENTS = ["Staff Management", "Public Relations"] as const;
type Department = (typeof DEPARTMENTS)[number];

// Maps Discord role name → which department they can assign ("global" = any)
const PERMISSION_MAP: Record<string, Department | "global"> = {
  "Presidential Team": "global",
  "Staff Management Lead": "Staff Management",
  "Public Relations Lead": "Public Relations",
};

interface Permission {
  roleName: string;
  scope: Department | "global";
}

function getExecutorPermission(member: GuildMember): Permission | null {
  for (const [roleName, scope] of Object.entries(PERMISSION_MAP)) {
    if (member.roles.cache.some((r) => r.name === roleName)) {
      return { roleName, scope };
    }
  }
  return null;
}

export const data = new SlashCommandBuilder()
  .setName("assign-department")
  .setDescription("Assign a user to a department")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Discord user to assign").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("department")
      .setDescription("Department to assign the user to")
      .setRequired(true)
      .addChoices(
        { name: "Staff Management", value: "Staff Management" },
        { name: "Public Relations", value: "Public Relations" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.guild || !interaction.guildId) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Server Only")
          .setDescription("This command can only be used in a server."),
      ],
    });
    return;
  }

  // ── Step 1: Identity verification ────────────────────────────────────────
  const executor = interaction.member as GuildMember;
  const permission = getExecutorPermission(executor);

  if (!permission) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Insufficient Permissions")
          .setDescription(
            "You must hold one of the following roles to use this command:\n" +
              Object.keys(PERMISSION_MAP)
                .map((r) => `• **${r}**`)
                .join("\n")
          ),
      ],
    });
    return;
  }

  // ── Step 2: Logic gate ────────────────────────────────────────────────────
  const department = interaction.options.getString("department", true) as Department;

  if (permission.scope !== "global" && permission.scope !== department) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Insufficient Permissions")
          .setDescription(
            `As **${permission.roleName}**, you can only assign users to **${permission.scope}**.\n` +
              `Assigning to **${department}** is outside your jurisdiction.`
          ),
      ],
    });
    return;
  }

  // ── Step 3: Action execution ───────────────────────────────────────────────
  const targetUser = interaction.options.getUser("user", true);

  // Fetch the target as a guild member so we can manage their roles
  let targetMember: GuildMember;
  try {
    targetMember = await interaction.guild.members.fetch(targetUser.id);
  } catch {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Member Not Found")
          .setDescription(`<@${targetUser.id}> could not be found in this server.`),
      ],
    });
    return;
  }

  // Remove all existing department roles, then add the new one
  const allDeptRoles = DEPARTMENTS.map((d) =>
    interaction.guild!.roles.cache.find((r) => r.name === d)
  ).filter(Boolean);

  const newRole = interaction.guild.roles.cache.find((r) => r.name === department);
  if (!newRole) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Role Not Found")
          .setDescription(
            `The Discord role **${department}** does not exist in this server.\n` +
              `Please create a role with that exact name first.`
          ),
      ],
    });
    return;
  }

  try {
    // Remove conflicting department roles
    for (const role of allDeptRoles) {
      if (role && targetMember.roles.cache.has(role.id)) {
        await targetMember.roles.remove(role, `Department reassignment by ${interaction.user.tag}`);
      }
    }
    // Add new department role
    await targetMember.roles.add(newRole, `Assigned to ${department} by ${interaction.user.tag}`);
  } catch (err) {
    logger.error({ err }, "Failed to update department roles");
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle("Role Update Failed")
          .setDescription(
            "Could not update the user's roles. Make sure the bot has the **Manage Roles** permission and its role is above the department roles."
          ),
      ],
    });
    return;
  }

  // Update database
  const dbUser = await getUserByDiscordId(targetUser.id);
  if (dbUser) {
    await setUserDepartment(targetUser.id, department);
  }

  logger.info(
    { executor: interaction.user.id, target: targetUser.id, department },
    "Department assigned"
  );

  // ── Success reply ─────────────────────────────────────────────────────────
  const successEmbed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Department Assigned")
    .addFields(
      { name: "User", value: `<@${targetUser.id}>`, inline: true },
      { name: "Department", value: department, inline: true },
      { name: "Assigned By", value: `<@${interaction.user.id}>`, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [successEmbed] });

  // ── DM the target user ────────────────────────────────────────────────────
  const dmFailed = await targetUser
    .send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3498db)
          .setTitle("Department Assignment")
          .setDescription(
            `You have been assigned to a new department in the **Citrus Executives** server.\n\n` +
              `Your new department is **${department}**.\n` +
              `The department was assigned by **${interaction.user.tag}**.`
          )
          .setTimestamp(),
      ],
    })
    .then(() => false)
    .catch(() => true);

  // ── Audit log ─────────────────────────────────────────────────────────────
  const auditChannelId = await getAuditLogChannel(interaction.guildId);
  if (auditChannelId) {
    try {
      const channel = await interaction.client.channels.fetch(auditChannelId);
      if (channel instanceof TextChannel) {
        const auditEmbed = new EmbedBuilder()
          .setColor(0x9b59b6)
          .setTitle("Audit — Department Assigned")
          .addFields(
            { name: "User", value: `<@${targetUser.id}> (${targetUser.tag})`, inline: true },
            { name: "Department", value: department, inline: true },
            { name: "Assigned By", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
            { name: "DB Record", value: dbUser ? "Updated" : "User not linked — DB not updated", inline: true },
            { name: "DM Sent", value: dmFailed ? "❌ Failed (DMs disabled)" : "✅ Sent", inline: true }
          )
          .setTimestamp();
        await channel.send({ embeds: [auditEmbed] });
      }
    } catch {
      logger.warn({ auditChannelId }, "Failed to post to audit log channel");
    }
  }

  // If DM failed, still inform the executor
  if (dmFailed) {
    await interaction.followUp({
      content: `⚠️ <@${targetUser.id}> has DMs disabled — they were not notified. This has been logged in the audit channel.`,
      ephemeral: true,
    });
  }
}
