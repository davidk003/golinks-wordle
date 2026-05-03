import { auth } from "@clerk/nextjs/server";

import { getSql, hasDatabase } from "../_lib/db";
import { getTodaysPuzzle } from "../_lib/wordle";

export const runtime = "nodejs";

type GameMode = "daily" | "practice";

type SummaryRow = {
  mode: GameMode;
  games_played: string | number;
  wins: string | number;
  losses: string | number;
  average_guesses: string | number | null;
};

type DistributionRow = {
  mode: GameMode;
  guess_count: number;
  wins: string | number;
};

type CharacterRow = {
  mode: GameMode;
  letter: string;
  uses: string | number;
};

type DailyResultRow = {
  puzzle_number: number;
  status: "won" | "lost";
};

type ModeStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  averageGuesses: number | null;
  guessDistribution: Record<number, number>;
  favoriteCharacters: { character: string; count: number }[];
  currentStreak: number;
  maxStreak: number;
};

function emptyModeStats(): ModeStats {
  return {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    averageGuesses: null,
    guessDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    favoriteCharacters: [],
    currentStreak: 0,
    maxStreak: 0,
  };
}

function roundStat(value: number) {
  return Math.round(value * 10) / 10;
}

function calculateStreaks(rows: DailyResultRow[], todaysPuzzleNumber: number) {
  const latest = rows[0];

  if (
    !latest ||
    latest.status !== "won" ||
    latest.puzzle_number < todaysPuzzleNumber - 1
  ) {
    return { currentStreak: 0, maxStreak: getMaxStreak(rows) };
  }

  let currentStreak = 0;

  for (const row of rows) {
    if (row.status !== "won") {
      break;
    }

    if (currentStreak > 0) {
      const previous = rows[currentStreak - 1];

      if (previous.puzzle_number !== row.puzzle_number + 1) {
        break;
      }
    }

    currentStreak += 1;
  }

  return { currentStreak, maxStreak: getMaxStreak(rows) };
}

function getMaxStreak(rows: DailyResultRow[]) {
  let maxStreak = 0;
  let streak = 0;
  let previousPuzzleNumber: number | null = null;

  for (const row of [...rows].reverse()) {
    if (
      row.status === "won" &&
      (previousPuzzleNumber === null || row.puzzle_number === previousPuzzleNumber + 1)
    ) {
      streak += 1;
    } else if (row.status === "won") {
      streak = 1;
    } else {
      streak = 0;
    }

    maxStreak = Math.max(maxStreak, streak);
    previousPuzzleNumber = row.puzzle_number;
  }

  return maxStreak;
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Sign in to view stats." }, { status: 401 });
  }

  if (!hasDatabase()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const sql = getSql();
  const [summaryRows, distributionRows, characterRows, dailyResultRows] = await Promise.all([
    sql`
      SELECT mode,
        COUNT(*) AS games_played,
        COUNT(*) FILTER (WHERE status = 'won') AS wins,
        COUNT(*) FILTER (WHERE status = 'lost') AS losses,
        AVG(guess_count) FILTER (WHERE status = 'won') AS average_guesses
      FROM game_sessions
      WHERE user_id = ${userId} AND status IN ('won', 'lost')
      GROUP BY mode
    `,
    sql`
      SELECT mode, guess_count, COUNT(*) AS wins
      FROM game_sessions
      WHERE user_id = ${userId} AND status = 'won'
      GROUP BY mode, guess_count
    `,
    sql`
      SELECT s.mode, letter, COUNT(*) AS uses
      FROM game_guesses g
      JOIN game_sessions s ON s.id = g.game_session_id
      CROSS JOIN LATERAL regexp_split_to_table(g.guess, '') AS letter
      WHERE s.user_id = ${userId}
      GROUP BY s.mode, letter
      ORDER BY s.mode, uses DESC, letter ASC
    `,
    sql`
      SELECT puzzle_number, status
      FROM game_sessions
      WHERE user_id = ${userId}
        AND mode = 'daily'
        AND status IN ('won', 'lost')
      ORDER BY puzzle_number DESC
    `,
  ]);

  const stats: Record<GameMode, ModeStats> = {
    daily: emptyModeStats(),
    practice: emptyModeStats(),
  };

  for (const row of summaryRows as SummaryRow[]) {
    const gamesPlayed = Number(row.games_played);
    const wins = Number(row.wins);
    const losses = Number(row.losses);

    stats[row.mode] = {
      ...stats[row.mode],
      gamesPlayed,
      wins,
      losses,
      winRate: gamesPlayed > 0 ? roundStat((wins / gamesPlayed) * 100) : 0,
      averageGuesses:
        row.average_guesses === null ? null : roundStat(Number(row.average_guesses)),
    };
  }

  for (const row of distributionRows as DistributionRow[]) {
    stats[row.mode].guessDistribution[row.guess_count] = Number(row.wins);
  }

  for (const row of characterRows as CharacterRow[]) {
    const favoriteCharacters = stats[row.mode].favoriteCharacters;

    if (favoriteCharacters.length < 5) {
      favoriteCharacters.push({ character: row.letter, count: Number(row.uses) });
    }
  }

  const streaks = calculateStreaks(
    dailyResultRows as DailyResultRow[],
    getTodaysPuzzle().puzzleNumber,
  );
  stats.daily.currentStreak = streaks.currentStreak;
  stats.daily.maxStreak = streaks.maxStreak;

  return Response.json({ stats });
}
