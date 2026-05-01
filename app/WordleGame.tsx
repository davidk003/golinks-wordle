"use client";

import { useEffect, useRef, useState } from "react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 5;

const keyboardRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

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

function canEditGuess(game: GameState) {
  return game.status === "playing" && !game.isSubmitting;
}

function addLetterToGuess(game: GameState, letter: string): GameState {
  if (!canEditGuess(game)) {
    return game;
  }

  return {
    ...game,
    currentGuess: sanitizeGuess(`${game.currentGuess}${letter}`),
    message: initialGameState.message,
  };
}

function removeLetterFromGuess(game: GameState): GameState {
  if (!canEditGuess(game)) {
    return game;
  }

  return {
    ...game,
    currentGuess: game.currentGuess.slice(0, -1),
    message: initialGameState.message,
  };
}

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable]") !== null
  );
}

function isActivationTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.closest("button, a[href]") !== null;
}

function isModifiedKeyboardEvent(event: KeyboardEvent) {
  return (
    event.defaultPrevented ||
    event.isComposing ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    isTextEntryTarget(event.target)
  );
}

function getTileClassName(result?: GuessResult) {
  return `flex size-[clamp(2.75rem,16vw,3.35rem)] items-center justify-center border-2 text-2xl font-black uppercase leading-none ${
    result ? resultClassNames[result] : "border-[#d3d6da] bg-white text-slate-950"
  }`;
}

export function WordleGame() {
  const [game, setGame] = useState<GameState>(initialGameState);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
  const submitGuessRef = useRef<() => void>(() => {});

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isModifiedKeyboardEvent(event)) {
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        setGame((current) => addLetterToGuess(current, event.key));
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setGame(removeLetterFromGuess);
        return;
      }

      if (event.key === "Enter") {
        if (isActivationTarget(event.target)) {
          return;
        }

        event.preventDefault();
        submitGuessRef.current();
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

  async function submitCurrentGuess() {
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

  submitGuessRef.current = () => {
    void submitCurrentGuess();
  };

  function handleReset() {
    setGame(initialGameState);
  }

  function handleKeyboardPress(key: string) {
    if (key === "ENTER") {
      void submitCurrentGuess();
      return;
    }

    if (key === "BACKSPACE") {
      setGame(removeLetterFromGuess);
      return;
    }

    setGame((current) => addLetterToGuess(current, key));
  }

  return (
    <section
      className={`mt-8 flex w-full max-w-md flex-col items-center gap-6 ${
        isKeyboardVisible ? "pb-40" : ""
      }`}
    >
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

      <div className="flex w-full flex-col items-center gap-3 text-center">
        <p id="game-message" className="text-sm text-slate-500" aria-live="polite">
          {game.message}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setIsKeyboardVisible((current) => !current)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600"
        >
          {isKeyboardVisible ? "Hide keyboard" : "Show keyboard"}
        </button>
      </div>

      {isKeyboardVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white p-3">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            {keyboardRows.map((row) => (
              <div key={row.join("")} className="flex justify-center gap-2">
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyboardPress(key)}
                    disabled={game.status !== "playing" || game.isSubmitting}
                    className="rounded bg-slate-200 px-3 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    {key === "BACKSPACE" ? "Backspace" : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
