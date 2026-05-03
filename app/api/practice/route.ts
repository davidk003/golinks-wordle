import { auth } from "@clerk/nextjs/server";

import { hasDatabase } from "../_lib/db";
import { createPracticeSession } from "../_lib/game-storage";
import { getCurrentPlayerName } from "../_lib/player";
import {
  assertWordleTokenSecretConfigured,
  createGameTokenForPuzzle,
  getRandomPracticePuzzle,
} from "../_lib/wordle";

export const runtime = "nodejs";

export async function POST() {
  assertWordleTokenSecretConfigured();

  const puzzle = getRandomPracticePuzzle();
  const { userId } = await auth();
  let gameSessionId: string | undefined;

  if (userId && hasDatabase()) {
    const playerName = await getCurrentPlayerName();
    const session = await createPracticeSession(
      userId,
      playerName,
      puzzle.practiceSeed,
    );
    gameSessionId = session.id;
  }

  return Response.json({
    mode: puzzle.mode,
    gameToken: createGameTokenForPuzzle(puzzle, 0, gameSessionId),
  });
}
