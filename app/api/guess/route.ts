const SECRET_WORD = "SLUMP";

type GuessResult = "correct" | "present" | "absent";

function normalizeGuess(guess: string) {
  return guess.trim().toUpperCase();
}

function scoreGuess(guess: string): GuessResult[] {
  return Array.from(guess, (letter, index) => {
    if (letter === SECRET_WORD[index]) {
      return "correct";
    }

    if (SECRET_WORD.includes(letter)) {
      return "present";
    }

    return "absent";
  });
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
