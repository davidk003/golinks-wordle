import "server-only";

import { currentUser } from "@clerk/nextjs/server";

export async function getCurrentPlayerName() {
  const user = await currentUser().catch(() => null);

  if (!user) {
    return null;
  }

  return user.username?.trim() || null;
}
