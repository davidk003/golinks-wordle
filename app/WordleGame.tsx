"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 5;

type GameState = {
  guesses: SubmittedGuess[];
  currentGuess: string;
  message: string;
  status: "playing" | "won" | "lost";
  isSubmitting: boolean;
};

type GuessResult = "correct" | "present" | "absent";

type SubmittedGuess = {
  guess: string;
  result: GuessResult[];
};

type GuessResponse = {
  guess: string;
  result: GuessResult[];
  word: string;
};

const initialGameState: GameState = {
  guesses: [],
  currentGuess: "",
  message: "Enter a 5-letter guess to fill the board.",
  status: "playing",
  isSubmitting: false,
};

const resultClassNames: Record<GuessResult, string> = {
  correct: "border-[#6aaa64] bg-[#6aaa64] text-white",
  present: "border-[#c9b458] bg-[#c9b458] text-white",
  absent: "border-[#787c7e] bg-[#787c7e] text-white",
};

function sanitizeGuess(value: string) {
  return value.replace(/[^a-z]/gi, "").slice(0, WORD_LENGTH).toUpperCase();
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, button, a[href], [contenteditable]") !==
      null
  );
}

function getTileClassName(result?: GuessResult) {
  return `flex size-[clamp(2.75rem,16vw,3.35rem)] items-center justify-center border-2 text-2xl font-black uppercase leading-none ${
    result ? resultClassNames[result] : "border-[#d3d6da] bg-white text-slate-950"
  }`;
}

export function WordleGame() {
  const [game, setGame] = useState<GameState>(initialGameState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        setGame((current) => ({
          ...current,
          currentGuess:
            current.status === "playing" && !current.isSubmitting
              ? sanitizeGuess(`${current.currentGuess}${event.key}`)
              : current.currentGuess,
          message:
            current.status === "playing" && !current.isSubmitting
              ? initialGameState.message
              : current.message,
        }));
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setGame((current) => ({
          ...current,
          currentGuess:
            current.status === "playing" && !current.isSubmitting
              ? current.currentGuess.slice(0, -1)
              : current.currentGuess,
          message:
            current.status === "playing" && !current.isSubmitting
              ? initialGameState.message
              : current.message,
        }));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const rows = Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
    if (game.guesses[rowIndex]) {
      return game.guesses[rowIndex].guess;
    }

    if (rowIndex === game.guesses.length) {
      return game.currentGuess;
    }

    return "";
  });

  function handleGuessChange(value: string) {
    setGame((current) => ({
      ...current,
      currentGuess:
        current.status === "playing" && !current.isSubmitting
          ? sanitizeGuess(value)
          : current.currentGuess,
      message:
        current.status === "playing" && !current.isSubmitting
          ? initialGameState.message
          : current.message,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (game.status !== "playing" || game.isSubmitting) {
      return;
    }

    if (game.currentGuess.length !== WORD_LENGTH) {
      setGame((current) => ({
        ...current,
        message: `Guesses must be ${WORD_LENGTH} letters.`,
      }));
      return;
    }

    const submittedGuess = game.currentGuess;

    setGame((current) => ({
      ...current,
      isSubmitting: true,
      message: "Checking guess...",
    }));

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: submittedGuess }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Unable to submit guess.",
        );
      }

      const guessResult = data as GuessResponse;

      setGame((current) => {
        if (!current.isSubmitting || current.currentGuess !== submittedGuess) {
          return current;
        }

        const guesses = [
          ...current.guesses,
          { guess: guessResult.guess, result: guessResult.result },
        ];
        const won = guessResult.result.every((result) => result === "correct");
        const lost = !won && guesses.length === MAX_GUESSES;

        return {
          guesses,
          currentGuess: "",
          isSubmitting: false,
          status: won ? "won" : lost ? "lost" : "playing",
          message: won
            ? "You won! Reset the board to play again."
            : lost
              ? `No guesses left. The word was ${guessResult.word}.`
              : "Keep going.",
        };
      });
    } catch (error) {
      setGame((current) => {
        if (!current.isSubmitting || current.currentGuess !== submittedGuess) {
          return current;
        }

        return {
          ...current,
          isSubmitting: false,
          message:
            error instanceof Error ? error.message : "Unable to submit guess.",
        };
      });
    }
  }

  function handleReset() {
    setGame(initialGameState);
  }

  return (
    <section className="mt-8 flex w-full max-w-md flex-col items-center gap-6">
      <div
        aria-label="Wordle board"
        className="grid grid-cols-5 gap-1 rounded-sm border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
      >
        {rows.map((row, rowIndex) =>
          Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
            const letter = row[columnIndex] ?? "";
            const result = game.guesses[rowIndex]?.result[columnIndex];

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={getTileClassName(result)}
              >
                {letter}
              </div>
            );
          }),
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm"
      >
        <label className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500" htmlFor="guess">
          Current guess
        </label>
        <input
          id="guess"
          name="guess"
          type="text"
          value={game.currentGuess}
          onChange={(event) => handleGuessChange(event.target.value)}
          disabled={game.status !== "playing" || game.isSubmitting}
          maxLength={WORD_LENGTH}
          autoComplete="off"
          className="rounded-md border border-slate-300 px-4 py-2.5 text-center text-xl font-black uppercase tracking-[0.32em] outline-none focus:border-[#6aaa64] focus:ring-2 focus:ring-[#6aaa64]/15"
          aria-describedby="game-message"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="game-message" className="text-sm text-slate-500" aria-live="polite">
            {game.message}
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={game.status !== "playing" || game.isSubmitting}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {game.isSubmitting ? "Checking..." : "Submit guess"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
            >
              Reset
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
