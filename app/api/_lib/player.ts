import "server-only";

import { currentUser } from "@clerk/nextjs/server";

export async function getCurrentPlayerName() {
  const user = await currentUser().catch(() => null);

  if (!user) {
    return null;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return (
    fullName ||
    user.username ||
    null
  );
}
