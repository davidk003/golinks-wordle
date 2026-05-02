import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MAX_GUESSES, WORD_PATTERN } from "../../wordleConfig";

export { MAX_GUESSES, WORD_PATTERN };

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PUZZLE_EPOCH_UTC = Date.UTC(2026, 4, 1);
const TOKEN_SECRET =
  process.env.WORDLE_TOKEN_SECRET ?? randomBytes(32).toString("base64url");

const WORDS = readFileSync(join(process.cwd(), "data", "wordles.txt"), "utf8")
  .split(/\r?\n/)
  .map((word) => word.trim().toUpperCase())
  .filter((word) => WORD_PATTERN.test(word));

if (WORDS.length === 0) {
  throw new Error("data/wordles.txt must contain at least one 5-letter A-Z word.");
}

export type GameMode = "daily" | "practice";
export type GuessResult = "correct" | "present" | "absent";

export type DailyPuzzle = {
  mode: "daily";
  puzzleNumber: number;
  word: string;
};

export type PracticePuzzle = {
  mode: "practice";
  practiceSeed: string;
  wordIndex: number;
  word: string;
};

export type Puzzle = DailyPuzzle | PracticePuzzle;

export type DailyGameTokenPayload = {
  mode: "daily";
  puzzleNumber: number;
  guessCount: number;
};

export type PracticeGameTokenPayload = {
  mode: "practice";
  practiceSeed: string;
  guessCount: number;
};

export type GameTokenPayload = DailyGameTokenPayload | PracticeGameTokenPayload;

export function normalizeGuess(guess: string) {
  return guess.trim().toUpperCase();
}

export function getTodaysPuzzle(): DailyPuzzle {
  const puzzleNumber = Math.floor(
    (Date.now() - PUZZLE_EPOCH_UTC) / MILLISECONDS_PER_DAY,
  );

  return getPuzzleForNumber(puzzleNumber);
}

export function getPuzzleForNumber(puzzleNumber: number): DailyPuzzle {
  const wordIndex = ((puzzleNumber % WORDS.length) + WORDS.length) % WORDS.length;

  return {
    mode: "daily",
    puzzleNumber,
    word: WORDS[wordIndex],
  };
}

export function getRandomPracticePuzzle(): PracticePuzzle {
  const practiceSeed = randomBytes(16).toString("base64url");
  const wordIndex = getPracticeWordIndex(practiceSeed);

  return {
    mode: "practice",
    practiceSeed,
    wordIndex,
    word: WORDS[wordIndex],
  };
}

export function getPuzzleForToken(payload: GameTokenPayload): Puzzle {
  if (payload.mode === "practice") {
    const wordIndex = getPracticeWordIndex(payload.practiceSeed);

    return {
      mode: "practice",
      practiceSeed: payload.practiceSeed,
      wordIndex,
      word: WORDS[wordIndex],
    };
  }

  return getPuzzleForNumber(payload.puzzleNumber);
}

function signTokenPayload(encodedPayload: string) {
  return createHmac("sha256", TOKEN_SECRET).update(encodedPayload).digest("base64url");
}

function getPracticeWordIndex(practiceSeed: string) {
  const digest = createHmac("sha256", TOKEN_SECRET).update(practiceSeed).digest();

  return digest.readUInt32BE(0) % WORDS.length;
}

function createGameToken(payload: GameTokenPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = signTokenPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function createGameTokenForPuzzle(puzzle: Puzzle, guessCount: number) {
  if (puzzle.mode === "practice") {
    return createGameToken({
      mode: "practice",
      practiceSeed: puzzle.practiceSeed,
      guessCount,
    });
  }

  return createGameToken({
    mode: "daily",
    puzzleNumber: puzzle.puzzleNumber,
    guessCount,
  });
}

function hasValidGuessCount(payload: Record<string, unknown>) {
  return (
    Number.isInteger(payload.guessCount) &&
    typeof payload.guessCount === "number" &&
    payload.guessCount >= 0 &&
    payload.guessCount < MAX_GUESSES
  );
}

function isValidTokenPayload(payload: unknown): payload is GameTokenPayload {
  if (payload === null || typeof payload !== "object") {
    return false;
  }

  const tokenPayload = payload as Record<string, unknown>;

  if (!hasValidGuessCount(tokenPayload)) {
    return false;
  }

  if (tokenPayload.mode === "daily") {
    return (
      Number.isInteger(tokenPayload.puzzleNumber) &&
      typeof tokenPayload.puzzleNumber === "number"
    );
  }

  if (tokenPayload.mode === "practice") {
    return (
      typeof tokenPayload.practiceSeed === "string" &&
      tokenPayload.practiceSeed.length > 0
    );
  }

  return false;
}

export function readGameToken(gameToken: unknown): GameTokenPayload | null {
  if (gameToken === undefined) {
    return null;
  }

  if (typeof gameToken !== "string") {
    throw new Error("Game token must be a string.");
  }

  const [encodedPayload, signature, extra] = gameToken.split(".");

  if (!encodedPayload || !signature || extra !== undefined) {
    throw new Error("Invalid game token.");
  }

  const expectedSignature = signTokenPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new Error("Invalid game token.");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid game token.");
  }

  if (!isValidTokenPayload(payload)) {
    throw new Error("Invalid game token.");
  }

  return payload;
}

export function scoreGuess(guess: string, secretWord: string): GuessResult[] {
  const result = Array<GuessResult>(guess.length).fill("absent");
  const remainingLetters: Record<string, number> = {};

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === secretWord[index]) {
      result[index] = "correct";
    } else {
      const secretLetter = secretWord[index];
      remainingLetters[secretLetter] = (remainingLetters[secretLetter] ?? 0) + 1;
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (result[index] === "correct") {
      continue;
    }

    const letter = guess[index];

    if ((remainingLetters[letter] ?? 0) > 0) {
      result[index] = "present";
      remainingLetters[letter] -= 1;
    }
  }

  return result;
}
