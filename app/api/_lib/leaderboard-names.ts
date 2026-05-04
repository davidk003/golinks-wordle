import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

export async function getUsernamesById(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  try {
    const client = await clerkClient();
    const { data: users } = await client.users.getUserList({
      userId: uniqueUserIds,
      limit: uniqueUserIds.length,
    });

    return new Map(
      users.flatMap((user) => {
        const username = user.username?.trim();

        return username ? ([[user.id, username]] as const) : [];
      }),
    );
  } catch {
    return new Map<string, string>();
  }
}
