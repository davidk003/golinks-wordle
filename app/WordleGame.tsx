"use client";

import { FormEvent, useState } from "react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 5;

type GameState = {
  guesses: string[];
  currentGuess: string;
  message: string;
};

const initialGameState: GameState = {
  guesses: [],
  currentGuess: "",
  message: "Enter a 5-letter guess to fill the board.",
};

export function WordleGame() {
  const [game, setGame] = useState<GameState>(initialGameState);

  const rows = Array.from({ length: MAX_GUESSES }, (_, rowIndex) => {
    if (game.guesses[rowIndex]) {
      return game.guesses[rowIndex];
    }

    if (rowIndex === game.guesses.length) {
      return game.currentGuess;
    }

    return "";
  });

  function handleGuessChange(value: string) {
    setGame((current) => ({
      ...current,
      currentGuess: value.replace(/[^a-z]/gi, "").slice(0, WORD_LENGTH),
      message: "Enter a 5-letter guess to fill the board.",
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGame((current) => {
      if (current.currentGuess.length !== WORD_LENGTH) {
        return {
          ...current,
          message: `Guesses must be ${WORD_LENGTH} letters.`,
        };
      }

      if (current.guesses.length >= MAX_GUESSES) {
        return {
          ...current,
          message: "Reset the board to start another local round.",
        };
      }

      const guesses = [...current.guesses, current.currentGuess.toUpperCase()];

      return {
        guesses,
        currentGuess: "",
        message:
          guesses.length === MAX_GUESSES
            ? "Board filled. Endpoint submission comes in a later step."
            : "Guess recorded locally. No endpoint submission yet.",
      };
    });
  }

  function handleReset() {
    setGame(initialGameState);
  }

  return (
    <section className="mt-10 flex w-full max-w-xl flex-col items-center gap-8">
      <div aria-label="Wordle board" className="grid grid-cols-5 gap-2">
        {rows.map((row, rowIndex) =>
          Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
            const letter = row[columnIndex] ?? "";

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className="flex size-12 items-center justify-center rounded border-2 border-slate-300 bg-white text-lg font-bold uppercase shadow-sm sm:size-14"
              >
                {letter}
              </div>
            );
          }),
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <label className="text-sm font-semibold text-slate-700" htmlFor="guess">
          Current guess
        </label>
        <input
          id="guess"
          name="guess"
          type="text"
          value={game.currentGuess}
          onChange={(event) => handleGuessChange(event.target.value)}
          maxLength={WORD_LENGTH}
          autoComplete="off"
          className="rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl font-black uppercase tracking-[0.35em] outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          aria-describedby="game-message"
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="game-message" className="text-sm text-slate-600" aria-live="polite">
            {game.message}
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white"
            >
              Add guess
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
