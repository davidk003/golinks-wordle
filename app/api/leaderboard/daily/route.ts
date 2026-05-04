import { auth } from "@clerk/nextjs/server";

import { getSql, hasDatabase } from "../../_lib/db";
import { getUsernamesById } from "../../_lib/leaderboard-names";
import { MAX_GUESSES } from "../../_lib/wordle";

export const runtime = "nodejs";

type LeaderboardRow = {
  user_id: string;
  points: string | number;
  wins: string | number;
};

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json(
      { error: "Sign in to view the leaderboard." },
      { status: 401 },
    );
  }

  if (!hasDatabase()) {
    return Response.json({ entries: [] });
  }

  const sql = getSql();
  const rows = (await sql`
    SELECT
      user_id,
      SUM(${MAX_GUESSES + 1} - guess_count) AS points,
      COUNT(*) AS wins
    FROM game_sessions
    WHERE mode = 'daily'
      AND status = 'won'
    GROUP BY user_id
    ORDER BY points DESC, wins DESC, MAX(completed_at) ASC, user_id ASC
    LIMIT 25
  `) as LeaderboardRow[];
  const usernamesById = await getUsernamesById(rows.map((row) => row.user_id));

  return Response.json({
    entries: rows.map((row, index) => ({
      rank: index + 1,
      playerName: usernamesById.get(row.user_id) || `Player ${index + 1}`,
      points: Number(row.points),
      wins: Number(row.wins),
    })),
  });
}
