import { logger } from "./logger.js";

const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;
const GROUP_ID = "32805863";
const ADMIN_MIN_RANK = 13;

if (!ROBLOX_API_KEY) {
  throw new Error("ROBLOX_API_KEY environment variable is required");
}

const BASE = "https://apis.roblox.com";

async function robloxFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": ROBLOX_API_KEY!,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return res;
}

export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
}

export interface GroupMembership {
  groupId: number;
  membershipPath: string;
  role: {
    id: number;
    name: string;
    rank: number;
  };
  isOwner: boolean;
}

export interface GroupRole {
  id: number;
  name: string;
  rank: number;
  memberCount: number;
}

export async function getRobloxUserByUsername(username: string): Promise<RobloxUser | null> {
  try {
    const res = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data: RobloxUser[] };
    return data.data[0] ?? null;
  } catch (err) {
    logger.error({ err }, "Failed to get Roblox user by username");
    return null;
  }
}

export async function getRobloxUserById(userId: string): Promise<RobloxUser | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!res.ok) return null;
    return (await res.json()) as RobloxUser;
  } catch (err) {
    logger.error({ err }, "Failed to get Roblox user by ID");
    return null;
  }
}

export async function getRobloxProfileDescription(userId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://users.roblox.com/v1/users/${userId}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { description?: string };
    return data.description ?? null;
  } catch (err) {
    logger.error({ err }, "Failed to get Roblox profile description");
    return null;
  }
}

export async function getGroupOwnerUserId(): Promise<string | null> {
  try {
    // Try Cloud v2 group details
    const res = await robloxFetch(`/cloud/v2/groups/${GROUP_ID}`);
    if (res.ok) {
      const data = (await res.json()) as { owner?: string };
      // owner field is "users/12345678"
      if (data.owner) return data.owner.replace("users/", "");
    }
    // Fallback to legacy groups API (no auth needed for public groups)
    const legacyRes = await fetch(`https://groups.roblox.com/v1/groups/${GROUP_ID}`);
    if (legacyRes.ok) {
      const data = (await legacyRes.json()) as { owner?: { userId?: number } };
      if (data.owner?.userId) return String(data.owner.userId);
    }
    return null;
  } catch (err) {
    logger.error({ err }, "Failed to get group owner");
    return null;
  }
}

export async function getGroupMembership(userId: string): Promise<GroupMembership | null> {
  try {
    // Kick off owner check in parallel
    const ownerIdPromise = getGroupOwnerUserId();

    const res = await robloxFetch(
      `/cloud/v2/groups/${GROUP_ID}/memberships?filter=user=='users/${userId}'`
    );

    const ownerId = await ownerIdPromise;
    const isOwner = ownerId === userId;

    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Failed to get group membership");

      // If the API fails but we know the user is the owner, return a synthetic membership
      if (isOwner) {
        logger.info({ userId }, "Returning synthetic owner membership due to API failure");
        return {
          groupId: Number(GROUP_ID),
          membershipPath: `groups/${GROUP_ID}/memberships/owner`,
          role: { id: 0, name: "Owner", rank: 255 },
          isOwner: true,
        };
      }
      return null;
    }

    const data = (await res.json()) as {
      groupMemberships: Array<{ path: string; role: string; user: string }>;
    };
    const membership = data.groupMemberships?.[0];
    if (!membership) {
      // Not in group — but check owner fallback
      if (isOwner) {
        return {
          groupId: Number(GROUP_ID),
          membershipPath: `groups/${GROUP_ID}/memberships/owner`,
          role: { id: 0, name: "Owner", rank: 255 },
          isOwner: true,
        };
      }
      return null;
    }

    const roleRes = await robloxFetch(`/cloud/v2/${membership.role}`);
    if (!roleRes.ok) {
      if (isOwner) {
        return {
          groupId: Number(GROUP_ID),
          membershipPath: membership.path,
          role: { id: 0, name: "Owner", rank: 255 },
          isOwner: true,
        };
      }
      return null;
    }
    const role = (await roleRes.json()) as {
      id: string;
      displayName: string;
      rank: number;
    };

    return {
      groupId: Number(GROUP_ID),
      membershipPath: membership.path,
      role: {
        id: Number(role.id),
        name: isOwner ? "Owner" : role.displayName,
        rank: isOwner ? 255 : role.rank,
      },
      isOwner,
    };
  } catch (err) {
    logger.error({ err }, "Failed to get group membership");
    return null;
  }
}

export async function isAdminRank(userId: string): Promise<boolean> {
  const membership = await getGroupMembership(userId);
  return (membership?.role.rank ?? 0) >= ADMIN_MIN_RANK || (membership?.isOwner ?? false);
}

export async function getGroupRoles(): Promise<GroupRole[]> {
  try {
    const res = await robloxFetch(`/cloud/v2/groups/${GROUP_ID}/roles`);
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Failed to get group roles");
      return [];
    }
    const data = (await res.json()) as {
      groupRoles: Array<{ id: string; displayName: string; rank: number; memberCount: number }>;
    };
    return (data.groupRoles ?? []).map((r) => ({
      id: Number(r.id),
      name: r.displayName,
      rank: r.rank,
      memberCount: r.memberCount,
    }));
  } catch (err) {
    logger.error({ err }, "Failed to get group roles");
    return [];
  }
}

// membershipPath is the full path from getGroupMembership, e.g.
// "groups/32805863/memberships/1234567890"
export async function setGroupRank(membershipPath: string, roleId: number): Promise<boolean> {
  try {
    const res = await robloxFetch(`/cloud/v2/${membershipPath}?updateMask=role`, {
      method: "PATCH",
      body: JSON.stringify({ role: `groups/${GROUP_ID}/roles/${roleId}` }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Failed to set group rank");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to set group rank");
    return false;
  }
}

export async function postGroupShout(message: string): Promise<boolean> {
  try {
    const res = await robloxFetch(`/cloud/v2/groups/${GROUP_ID}/shouts`, {
      method: "POST",
      body: JSON.stringify({ content: message }),
    });
    if (!res.ok) {
      const text = await res.text();
      logger.warn({ status: res.status, body: text }, "Failed to post group shout");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to post group shout");
    return false;
  }
}

export async function promoteUser(
  userId: string
): Promise<{ success: boolean; newRole?: GroupRole }> {
  const [roles, membership] = await Promise.all([getGroupRoles(), getGroupMembership(userId)]);
  if (!membership) return { success: false };

  const sortedRoles = roles
    .filter((r) => r.rank > 0 && r.rank < 255)
    .sort((a, b) => a.rank - b.rank);
  const currentIndex = sortedRoles.findIndex((r) => r.rank === membership.role.rank);

  if (currentIndex === -1 || currentIndex >= sortedRoles.length - 1) {
    return { success: false };
  }

  const nextRole = sortedRoles[currentIndex + 1];
  const success = await setGroupRank(membership.membershipPath, nextRole.id);
  return { success, newRole: success ? nextRole : undefined };
}

export async function demoteUser(
  userId: string
): Promise<{ success: boolean; newRole?: GroupRole }> {
  const [roles, membership] = await Promise.all([getGroupRoles(), getGroupMembership(userId)]);
  if (!membership) return { success: false };

  const sortedRoles = roles
    .filter((r) => r.rank > 0 && r.rank < 255)
    .sort((a, b) => a.rank - b.rank);
  const currentIndex = sortedRoles.findIndex((r) => r.rank === membership.role.rank);

  if (currentIndex <= 0) return { success: false };

  const prevRole = sortedRoles[currentIndex - 1];
  const success = await setGroupRank(membership.membershipPath, prevRole.id);
  return { success, newRole: success ? prevRole : undefined };
}

export { ADMIN_MIN_RANK, GROUP_ID };
