import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORD_PATTERN } from "./wordleConfig";

function readWordList(fileName: string) {
  return readFileSync(join(process.cwd(), "data", fileName), "utf8")
    .split(/\r?\n/)
    .map((word) => word.trim().toUpperCase())
    .filter((word) => WORD_PATTERN.test(word));
}

export const WORDS = readWordList("wordles.txt");

const VALID_GUESSES = readWordList("valid-guesses.txt");
const ALLOWED_GUESSES = new Set([...VALID_GUESSES, ...WORDS]);

if (WORDS.length === 0) {
  throw new Error("data/wordles.txt must contain at least one 5-letter A-Z word.");
}

if (VALID_GUESSES.length === 0) {
  throw new Error(
    "data/valid-guesses.txt must contain at least one 5-letter A-Z word.",
  );
}

export function getAllowedGuesses() {
  return [...ALLOWED_GUESSES];
}

export function isAllowedGuess(guess: string) {
  return ALLOWED_GUESSES.has(guess);
}
