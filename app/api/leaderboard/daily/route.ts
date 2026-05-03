import { auth } from "@clerk/nextjs/server";

import { getSql, hasDatabase } from "../../_lib/db";
import { getPuzzleForNumber, getTodaysPuzzle } from "../../_lib/wordle";

export const runtime = "nodejs";

type LeaderboardRow = {
  player_name: string | null;
  guess_count: number;
};

function getRequestedPuzzleNumber(request: Request) {
  const url = new URL(request.url);
  const rawPuzzleNumber = url.searchParams.get("puzzleNumber");

  if (!rawPuzzleNumber) {
    return getTodaysPuzzle().puzzleNumber;
  }

  const puzzleNumber = Number(rawPuzzleNumber);

  return Number.isInteger(puzzleNumber) &&
    puzzleNumber >= -2147483648 &&
    puzzleNumber <= 2147483647
    ? puzzleNumber
    : null;
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json(
      { error: "Sign in to view the leaderboard." },
      { status: 401 },
    );
  }

  const puzzleNumber = getRequestedPuzzleNumber(request);

  if (puzzleNumber === null) {
    return Response.json({ error: "Invalid puzzle number." }, { status: 400 });
  }

  if (!hasDatabase()) {
    return Response.json({ puzzleNumber, entries: [] });
  }

  const puzzle = getPuzzleForNumber(puzzleNumber);
  const sql = getSql();
  const rows = (await sql`
    SELECT player_name, guess_count
    FROM game_sessions
    WHERE mode = 'daily'
      AND puzzle_number = ${puzzle.puzzleNumber}
      AND status = 'won'
    ORDER BY guess_count ASC, completed_at ASC
    LIMIT 25
  `) as LeaderboardRow[];

  return Response.json({
    puzzleNumber: puzzle.puzzleNumber,
    entries: rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.player_name || `Player ${index + 1}`,
      guesses: row.guess_count,
    })),
  });
}
