import { auth } from "@clerk/nextjs/server";

import { getSql, hasDatabase } from "../../_lib/db";
import { MAX_GUESSES } from "../../_lib/wordle";

export const runtime = "nodejs";

type LeaderboardRow = {
  player_name: string | null;
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
      (array_agg(player_name ORDER BY completed_at DESC) FILTER (WHERE player_name IS NOT NULL))[1] AS player_name,
      SUM(${MAX_GUESSES + 1} - guess_count) AS points,
      COUNT(*) AS wins
    FROM game_sessions
    WHERE mode = 'practice'
      AND status = 'won'
    GROUP BY user_id
    ORDER BY points DESC, wins DESC, MAX(completed_at) ASC, user_id ASC
    LIMIT 25
  `) as LeaderboardRow[];

  return Response.json({
    entries: rows.map((row, index) => ({
      rank: index + 1,
      playerName: row.player_name || `Player ${index + 1}`,
      points: Number(row.points),
      wins: Number(row.wins),
    })),
  });
}
