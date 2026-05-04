import { auth } from "@clerk/nextjs/server";

import { hasDatabase } from "../../_lib/db";
import { getDailySessionWithGuesses } from "../../_lib/game-storage";
import { createGameTokenForPuzzle, getTodaysPuzzle } from "../../_lib/wordle";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  const puzzle = getTodaysPuzzle();

  if (!userId || !hasDatabase()) {
    return Response.json({ puzzleNumber: puzzle.puzzleNumber, game: null });
  }

  const storedGame = await getDailySessionWithGuesses(userId, puzzle.puzzleNumber);

  if (!storedGame) {
    return Response.json({ puzzleNumber: puzzle.puzzleNumber, game: null });
  }

  const { session, guesses } = storedGame;

  return Response.json({
    puzzleNumber: puzzle.puzzleNumber,
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
