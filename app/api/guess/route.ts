const SECRET_WORD = "SLUMP";

type GuessResult = "correct" | "present" | "absent";

function normalizeGuess(guess: string) {
  return guess.trim().toUpperCase();
}

function scoreGuess(guess: string): GuessResult[] {
  const result = Array<GuessResult>(guess.length).fill("absent");
  const remainingLetters: Record<string, number> = {};

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === SECRET_WORD[index]) {
      result[index] = "correct";
    } else {
      const secretLetter = SECRET_WORD[index];
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

  return Response.json({
    guess: normalizedGuess,
    result: scoreGuess(normalizedGuess),
    word: SECRET_WORD,
  });
}
