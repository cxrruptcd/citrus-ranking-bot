import type { GuildMember } from "discord.js";

// Discord role names that grant elevated access regardless of Roblox rank
const PRESIDENTIAL_TEAM_ROLE = "Presidential Team";

/**
 * Returns true if the member has the Presidential Team role.
 * This role bypasses all Roblox rank-based permission checks.
 */
export function hasPresidentialTeamRole(member: GuildMember): boolean {
  return member.roles.cache.some((r) => r.name === PRESIDENTIAL_TEAM_ROLE);
}

/**
 * Check if a member passes a minimum Roblox rank requirement.
 * Presidential Team role always passes regardless of Roblox rank.
 */
export function passesRankCheck(member: GuildMember, robloxRank: number, minRank: number): boolean {
  return hasPresidentialTeamRole(member) || robloxRank >= minRank;
}
