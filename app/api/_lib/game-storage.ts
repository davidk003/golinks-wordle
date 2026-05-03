import "server-only";

import { getSql } from "./db";
import type { GuessResult } from "./wordle";

export type GameSession = {
  id: string;
  guessCount: number;
  status: "playing" | "won" | "lost";
};

export type StoredGuess = {
  guess: string;
  result: GuessResult[];
};

type GameSessionRow = {
  id: string;
  guess_count: number;
  status: "playing" | "won" | "lost";
};

type DailySessionWithGuessesRow = GameSessionRow & {
  guesses: StoredGuess[];
};

function toGameSession(row: GameSessionRow): GameSession {
  return {
    id: row.id,
    guessCount: row.guess_count,
    status: row.status,
  };
}

export async function getOrCreateDailySession(
  userId: string,
  playerName: string | null,
  puzzleNumber: number,
) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO game_sessions (user_id, player_name, mode, puzzle_number)
    VALUES (${userId}, ${playerName}, 'daily', ${puzzleNumber})
    ON CONFLICT (user_id, puzzle_number) WHERE mode = 'daily'
    DO UPDATE SET player_name = COALESCE(EXCLUDED.player_name, game_sessions.player_name)
    RETURNING id, guess_count, status
  `) as GameSessionRow[];

  return toGameSession(rows[0]);
}

export async function createPracticeSession(
  userId: string,
  playerName: string | null,
  practiceSeed: string,
) {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO game_sessions (user_id, player_name, mode, practice_seed)
    VALUES (${userId}, ${playerName}, 'practice', ${practiceSeed})
    RETURNING id, guess_count, status
  `) as GameSessionRow[];

  return toGameSession(rows[0]);
}

export async function getPracticeSession(
  userId: string,
  gameSessionId: string,
) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, guess_count, status
    FROM game_sessions
    WHERE id = ${gameSessionId} AND user_id = ${userId} AND mode = 'practice'
    LIMIT 1
  `) as GameSessionRow[];

  return rows[0] ? toGameSession(rows[0]) : null;
}

export async function getDailySessionWithGuesses(
  userId: string,
  puzzleNumber: number,
) {
  const sql = getSql();
  const sessionRows = (await sql`
    SELECT s.id, s.guess_count, s.status,
      COALESCE(
        jsonb_agg(
          jsonb_build_object('guess', g.guess, 'result', g.result)
          ORDER BY g.guess_number ASC
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::jsonb
      ) AS guesses
    FROM game_sessions s
    LEFT JOIN game_guesses g ON g.game_session_id = s.id
    WHERE s.user_id = ${userId}
      AND s.mode = 'daily'
      AND s.puzzle_number = ${puzzleNumber}
    GROUP BY s.id, s.guess_count, s.status
    LIMIT 1
  `) as DailySessionWithGuessesRow[];

  if (!sessionRows[0]) {
    return null;
  }

  return {
    session: toGameSession(sessionRows[0]),
    guesses: sessionRows[0].guesses.map((row) => ({
      guess: row.guess,
      result: row.result,
    })),
  };
}

export async function recordGuessForSession({
  gameSessionId,
  userId,
  guessNumber,
  guess,
  result,
  status,
}: {
  gameSessionId: string;
  userId: string;
  guessNumber: number;
  guess: string;
  result: GuessResult[];
  status: "playing" | "won" | "lost";
}) {
  const sql = getSql();
  const rows = (await sql`
    WITH active_session AS (
      SELECT id
      FROM game_sessions
      WHERE id = ${gameSessionId}
        AND user_id = ${userId}
        AND status = 'playing'
        AND guess_count = ${guessNumber - 1}
    ), inserted_guess AS (
      INSERT INTO game_guesses (game_session_id, guess_number, guess, result)
      SELECT id, ${guessNumber}, ${guess}, ${JSON.stringify(result)}::jsonb
      FROM active_session
      ON CONFLICT (game_session_id, guess_number) DO NOTHING
      RETURNING game_session_id
    ), updated_session AS (
      UPDATE game_sessions
      SET guess_count = ${guessNumber},
        status = ${status},
        completed_at = CASE WHEN ${status} = 'playing' THEN NULL ELSE now() END
      WHERE id = ${gameSessionId}
        AND EXISTS (SELECT 1 FROM inserted_guess)
      RETURNING id
    )
    SELECT EXISTS (SELECT 1 FROM updated_session) AS recorded
  `) as { recorded: boolean }[];

  return Boolean(rows[0]?.recorded);
}

export function getCompletedStatus(
  won: boolean,
  lost: boolean,
): "playing" | "won" | "lost" {
  if (won) {
    return "won";
  }

  if (lost) {
    return "lost";
  }

  return "playing";
}
