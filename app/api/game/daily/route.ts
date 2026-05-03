import { auth } from "@clerk/nextjs/server";

import { hasDatabase } from "../../_lib/db";
import { getDailySessionWithGuesses } from "../../_lib/game-storage";
import { createGameTokenForPuzzle, getTodaysPuzzle } from "../../_lib/wordle";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();

  if (!userId || !hasDatabase()) {
    return Response.json({ game: null });
  }

  const puzzle = getTodaysPuzzle();
  const storedGame = await getDailySessionWithGuesses(userId, puzzle.puzzleNumber);

  if (!storedGame) {
    return Response.json({ game: null });
  }

  const { session, guesses } = storedGame;

  return Response.json({
    game: {
      mode: "daily",
      puzzleNumber: puzzle.puzzleNumber,
      status: session.status,
      guesses,
      ...(session.status === "playing"
        ? { gameToken: createGameTokenForPuzzle(puzzle, session.guessCount, session.id) }
        : {}),
      ...(session.status === "lost" ? { word: puzzle.word } : {}),
    },
  });
}
