CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  player_name text,
  mode text NOT NULL CHECK (mode IN ('daily', 'practice')),
  puzzle_number integer,
  practice_seed text,
  status text NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'won', 'lost')),
  guess_count integer NOT NULL DEFAULT 0 CHECK (guess_count BETWEEN 0 AND 6),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (
    (mode = 'daily' AND puzzle_number IS NOT NULL AND practice_seed IS NULL) OR
    (mode = 'practice' AND puzzle_number IS NULL AND practice_seed IS NOT NULL)
  ),
  CHECK (
    (status = 'playing' AND completed_at IS NULL) OR
    (status IN ('won', 'lost') AND completed_at IS NOT NULL AND completed_at >= started_at)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS game_sessions_daily_user_puzzle_idx
  ON game_sessions (user_id, puzzle_number)
  WHERE mode = 'daily';

CREATE INDEX IF NOT EXISTS game_sessions_user_mode_idx
  ON game_sessions (user_id, mode);

CREATE INDEX IF NOT EXISTS game_sessions_daily_leaderboard_idx
  ON game_sessions (puzzle_number, guess_count, completed_at)
  WHERE mode = 'daily' AND status = 'won';

CREATE TABLE IF NOT EXISTS game_guesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id uuid NOT NULL REFERENCES game_sessions (id) ON DELETE CASCADE,
  guess_number integer NOT NULL CHECK (guess_number BETWEEN 1 AND 6),
  guess text NOT NULL CHECK (guess ~ '^[A-Z]{5}$'),
  result jsonb NOT NULL CHECK (
    jsonb_typeof(result) = 'array' AND
    jsonb_array_length(result) = 5 AND
    result <@ '["correct", "present", "absent"]'::jsonb
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_session_id, guess_number)
);
