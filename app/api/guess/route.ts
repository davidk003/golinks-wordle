import {
  createGameTokenForPuzzle,
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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

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

  let tokenPayload: GameTokenPayload | null;

  try {
    tokenPayload = readGameToken(gameToken);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid game token." },
      { status: 400 },
    );
  }

  const puzzle = tokenPayload ? getPuzzleForToken(tokenPayload) : getTodaysPuzzle();
  const result = scoreGuess(normalizedGuess, puzzle.word);
  const guessCount = (tokenPayload?.guessCount ?? 0) + 1;
  const won = result.every((letterResult) => letterResult === "correct");
  const lost = !won && guessCount >= MAX_GUESSES;

  return Response.json({
    guess: normalizedGuess,
    result,
    ...(won || lost ? { word: puzzle.word } : {}),
    mode: puzzle.mode,
    ...(puzzle.mode === "daily" ? { puzzleNumber: puzzle.puzzleNumber } : {}),
    gameToken: createGameTokenForPuzzle(puzzle, guessCount),
  });
}
