import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

const WORD_PATTERN = /^[A-Z]{5}$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const PUZZLE_EPOCH_UTC = Date.UTC(2024, 0, 1);

const WORDS = readFileSync(join(process.cwd(), "data", "wordles.txt"), "utf8")
  .split(/\r?\n/)
  .map((word) => word.trim().toUpperCase())
  .filter((word) => WORD_PATTERN.test(word));

if (WORDS.length === 0) {
  throw new Error("data/wordles.txt must contain at least one 5-letter A-Z word.");
}

type GuessResult = "correct" | "present" | "absent";

function normalizeGuess(guess: string) {
  return guess.trim().toUpperCase();
}

function getTodaysPuzzle() {
  const puzzleNumber = Math.floor(
    (Date.now() - PUZZLE_EPOCH_UTC) / MILLISECONDS_PER_DAY,
  );
  const wordIndex = ((puzzleNumber % WORDS.length) + WORDS.length) % WORDS.length;

  return {
    puzzleNumber,
    word: WORDS[wordIndex],
  };
}

function scoreGuess(guess: string, secretWord: string): GuessResult[] {
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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const guess =
    body && typeof body === "object" && "guess" in body ? body.guess : undefined;

  if (typeof guess !== "string") {
    return Response.json({ error: "Guess must be a string." }, { status: 400 });
  }

  const normalizedGuess = normalizeGuess(guess);

  if (!/^[A-Z]{5}$/.test(normalizedGuess)) {
    return Response.json(
      { error: "Guess must be exactly 5 A-Z letters." },
      { status: 400 },
    );
  }

  const puzzle = getTodaysPuzzle();

  return Response.json({
    guess: normalizedGuess,
    result: scoreGuess(normalizedGuess, puzzle.word),
    word: puzzle.word,
    puzzleNumber: puzzle.puzzleNumber,
  });
}
