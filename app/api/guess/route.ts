import { auth } from "@clerk/nextjs/server";

import { hasDatabase } from "../_lib/db";
import {
  getCompletedStatus,
  getOrCreateDailySession,
  getPracticeSession,
  recordGuessForSession,
  type GameSession,
} from "../_lib/game-storage";
import {
  createGameTokenForPuzzle,
  assertWordleTokenSecretConfigured,
  type GameTokenPayload,
  getPuzzleForToken,
  getTodaysPuzzle,
  isAllowedGuess,
  MAX_GUESSES,
  normalizeGuess,
  readGameToken,
  scoreGuess,
  WORD_PATTERN,
} from "../_lib/wordle";

export const runtime = "nodejs";

function createServerTimingTracker() {
  const timings: string[] = [];
  let lastMark = performance.now();

  return {
    mark(name: string) {
      const now = performance.now();
      timings.push(`${name};dur=${(now - lastMark).toFixed(1)}`);
      lastMark = now;
    },
    response(body: unknown) {
      return Response.json(body, {
        headers: { "Server-Timing": timings.join(", ") },
      });
    },
  };
}

export async function POST(request: Request) {
  const timing = createServerTimingTracker();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  timing.mark("parse");

  const guess =
    body && typeof body === "object" && "guess" in body ? body.guess : undefined;
  const gameToken =
    body && typeof body === "object" && "gameToken" in body
      ? body.gameToken
      : undefined;

  if (typeof guess !== "string") {
    return Response.json({ error: "Guess must be a string." }, { status: 400 });
  }

  const normalizedGuess = normalizeGuess(guess);

  if (!WORD_PATTERN.test(normalizedGuess)) {
    return Response.json(
      { error: "Guess must be exactly 5 A-Z letters." },
      { status: 400 },
    );
  }

  if (!isAllowedGuess(normalizedGuess)) {
    return Response.json({ error: "Not in word list." }, { status: 400 });
  }

  timing.mark("validate");

  assertWordleTokenSecretConfigured();

  let tokenPayload: GameTokenPayload | null;

  try {
    tokenPayload = readGameToken(gameToken);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid game token." },
      { status: 400 },
    );
  }

  const todaysPuzzle = getTodaysPuzzle();
  const puzzle = tokenPayload ? getPuzzleForToken(tokenPayload) : todaysPuzzle;

  if (puzzle.mode === "daily" && puzzle.puzzleNumber !== todaysPuzzle.puzzleNumber) {
    return Response.json(
      { error: "This daily puzzle has ended." },
      { status: 400 },
    );
  }

  timing.mark("token");

  const { userId } = await auth();
  timing.mark("auth");
  let session: GameSession | null = null;

  if (userId && hasDatabase()) {
    if (puzzle.mode === "daily") {
      session = await getOrCreateDailySession(
        userId,
        null,
        puzzle.puzzleNumber,
      );

      if (
        (session.guessCount > 0 && !tokenPayload) ||
        (tokenPayload &&
          (tokenPayload.gameSessionId !== session.id ||
            tokenPayload.guessCount !== session.guessCount))
      ) {
        return Response.json(
          { error: "This game state is out of date. Please refresh and try again." },
          { status: 409 },
        );
      }
    } else if (tokenPayload?.gameSessionId) {
      session = await getPracticeSession(userId, tokenPayload.gameSessionId);

      if (!session) {
        return Response.json(
          { error: "Practice session was not found." },
          { status: 400 },
        );
      }

      if (tokenPayload.guessCount !== session.guessCount) {
        return Response.json(
          { error: "This game state is out of date. Please refresh and try again." },
          { status: 409 },
        );
      }
    }

    if (session && session.status !== "playing") {
      return Response.json(
        { error: "This game has already been completed." },
        { status: 400 },
      );
    }
  }

  timing.mark("session");

  const result = scoreGuess(normalizedGuess, puzzle.word);
  timing.mark("score");
  const guessCount = session
    ? session.guessCount + 1
    : (tokenPayload?.guessCount ?? 0) + 1;
  const won = result.every((letterResult) => letterResult === "correct");
  const lost = !won && guessCount >= MAX_GUESSES;
  const status = getCompletedStatus(won, lost);

  if (session && userId) {
    const recorded = await recordGuessForSession({
      gameSessionId: session.id,
      userId,
      guessNumber: guessCount,
      guess: normalizedGuess,
      result,
      status,
    });

    if (!recorded) {
      return Response.json(
        { error: "Unable to record guess. Please refresh and try again." },
        { status: 409 },
      );
    }
  }

  timing.mark("record");

  return timing.response({
    guess: normalizedGuess,
    result,
    ...(won || lost ? { word: puzzle.word } : {}),
    mode: puzzle.mode,
    ...(puzzle.mode === "daily" ? { puzzleNumber: puzzle.puzzleNumber } : {}),
    ...(won || lost
      ? {}
      : { gameToken: createGameTokenForPuzzle(puzzle, guessCount, session?.id) }),
    ...(session ? { statsUpdated: true } : {}),
  });
}
