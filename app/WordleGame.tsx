"use client";

import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from "react";

const WORD_LENGTH = 5;
const MAX_GUESSES = 5;
const DEFAULT_PUZZLE_NUMBER = 0;

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
  puzzleNumber: number;
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
  puzzleNumber?: number;
};

const initialGameState: GameState = {
  guesses: [],
  currentGuess: "",
  message: "Enter a 5-letter guess to fill the board.",
  status: "playing",
  isSubmitting: false,
  puzzleNumber: DEFAULT_PUZZLE_NUMBER,
};

const resultClassNames: Record<GuessResult, string> = {
  correct: "border-[#6aaa64] bg-[#6aaa64] text-white",
  present: "border-[#c9b458] bg-[#c9b458] text-white",
  absent: "border-[#787c7e] bg-[#787c7e] text-white",
};

const resultColors: Record<GuessResult, string> = {
  correct: "#6aaa64",
  present: "#c9b458",
  absent: "#787c7e",
};

const shareResultEmoji: Record<GuessResult, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

const keyboardResultClassNames: Record<GuessResult, string> = {
  correct: "bg-[#6aaa64] text-white",
  present: "bg-[#c9b458] text-white",
  absent: "bg-[#787c7e] text-white",
};

const resultRank: Record<GuessResult, number> = {
  absent: 1,
  present: 2,
  correct: 3,
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
  return `flex size-[clamp(2.75rem,min(16vw,8dvh),3.35rem)] items-center justify-center border-2 text-[clamp(1.35rem,7vw,1.5rem)] font-black uppercase leading-none ${
    result
      ? `${resultClassNames[result]} wordle-tile-reveal`
      : "border-[#d3d6da] bg-white text-slate-950"
  }`;
}

function getTileStyle(
  result: GuessResult | undefined,
  columnIndex: number,
): CSSProperties | undefined {
  if (!result) {
    return undefined;
  }

  return {
    "--tile-result-color": resultColors[result],
    animationDelay: `${columnIndex * 180}ms`,
  } as CSSProperties;
}

function getShareText(game: GameState) {
  const score = game.status === "lost" ? "X" : game.guesses.length;
  const rows = game.guesses.map((guess) =>
    guess.result.map((result) => shareResultEmoji[result]).join(""),
  );

  return [`GoLinks Wordle #${game.puzzleNumber} ${score}/${MAX_GUESSES}`, "", ...rows].join(
    "\n",
  );
}

function getKeyboardKeyClassName(
  key: string,
  result?: GuessResult,
  isPressed = false,
) {
  const widthClass =
    key === "ENTER" || key === "BACKSPACE"
      ? "flex-[1.55_1_0] min-w-0 px-1 text-[clamp(0.56rem,2.3vw,0.7rem)] sm:flex-[1.65_1_0] sm:px-2"
      : "flex-[1_1_0] min-w-0 px-1 text-[clamp(0.78rem,3.4vw,0.875rem)] sm:px-2";
  const colorClass = result
    ? keyboardResultClassNames[result]
    : "bg-[#d3d6da] text-black";

  return `${widthClass} ${colorClass} ${
    isPressed ? "keyboard-key-pressed" : ""
  } flex h-[clamp(2.35rem,11vw,2.75rem)] transform-gpu items-center justify-center rounded-[4px] font-black uppercase shadow-sm transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:h-11`;
}

function KeyboardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h10" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.25"
    >
      <path d="M8.7 10.7 15.3 7m-6.6 6.3 6.6 3.7" />
      <circle cx="18" cy="5.5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="18.5" r="3" />
    </svg>
  );
}

export function WordleGame() {
  const [game, setGame] = useState<GameState>(initialGameState);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const submitGuessRef = useRef<() => void>(() => {});
  const pressKeyRef = useRef<(key: string) => void>(() => {});
  const pressKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  pressKeyRef.current = (key: string) => {
    const normalizedKey = key.length === 1 ? key.toUpperCase() : key;

    if (pressKeyTimeoutRef.current) {
      clearTimeout(pressKeyTimeoutRef.current);
    }

    setPressedKey(normalizedKey);
    pressKeyTimeoutRef.current = setTimeout(() => {
      setPressedKey((current) =>
        current === normalizedKey ? null : current,
      );
      pressKeyTimeoutRef.current = null;
    }, 160);
  };

  useEffect(() => {
    return () => {
      if (pressKeyTimeoutRef.current) {
        clearTimeout(pressKeyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isModifiedKeyboardEvent(event)) {
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        pressKeyRef.current(event.key);
        setGame((current) => addLetterToGuess(current, event.key));
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        pressKeyRef.current("BACKSPACE");
        setGame(removeLetterFromGuess);
        return;
      }

      if (event.key === "Enter") {
        if (isActivationTarget(event.target)) {
          return;
        }

        event.preventDefault();
        pressKeyRef.current("ENTER");
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

  const keyboardStatuses = game.guesses.reduce<Record<string, GuessResult>>(
    (statuses, submittedGuess) => {
      submittedGuess.guess.split("").forEach((letter, index) => {
        const result = submittedGuess.result[index];
        const existingResult = statuses[letter];

        if (!existingResult || resultRank[result] > resultRank[existingResult]) {
          statuses[letter] = result;
        }
      });

      return statuses;
    },
    {},
  );
  const canShare = game.status !== "playing";
  const shareText = canShare ? getShareText(game) : "";

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
        const puzzleNumber =
          typeof guessResult.puzzleNumber === "number" &&
          Number.isFinite(guessResult.puzzleNumber)
            ? guessResult.puzzleNumber
            : current.puzzleNumber;

        return {
          guesses,
          currentGuess: "",
          isSubmitting: false,
          puzzleNumber,
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

  function handleReset(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    setGame(initialGameState);
  }

  async function handleShareResults(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();

    if (game.status === "playing") {
      return;
    }

    try {
      await navigator.clipboard.writeText(getShareText(game));
      setGame((current) => ({
        ...current,
        message: "Results copied to clipboard.",
      }));
    } catch {
      setGame((current) => ({
        ...current,
        message: "Unable to copy results.",
      }));
    }
  }

  function handleKeyboardPress(key: string) {
    pressKeyRef.current(key);

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
      className={`relative mt-4 flex w-full max-w-md flex-col items-center gap-4 sm:mt-8 sm:gap-6 ${
        isKeyboardVisible
          ? "pb-[calc(11rem+env(safe-area-inset-bottom))] sm:pb-[calc(12rem+env(safe-area-inset-bottom))]"
          : ""
      }`}
    >
      <div className="pointer-events-none absolute right-0 top-0 z-[1] h-0 w-full">
        <div
          aria-hidden={!canShare}
          className={`group absolute right-0 top-0 ${canShare ? "pointer-events-auto visible" : "invisible"}`}
        >
          <button
            type="button"
            disabled={!canShare}
            onClick={handleShareResults}
            aria-label="Share results"
            aria-describedby={canShare ? "share-results-tooltip" : undefined}
            className="flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-600 shadow-sm transition hover:border-[#6aaa64] hover:text-[#6aaa64] focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px sm:size-11"
          >
            <ShareIcon />
          </button>
          <div
            id="share-results-tooltip"
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full mt-2 w-max max-w-[min(20rem,calc(100vw-2rem))] rounded-md bg-black/80 p-3 text-left text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <pre className="m-0 whitespace-pre-wrap font-mono leading-relaxed text-white">
              {shareText}
            </pre>
          </div>
        </div>
      </div>

      <div
        aria-label="Wordle board"
        className="grid max-w-full grid-cols-5 gap-1 rounded-sm border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
      >
        {rows.map((row, rowIndex) =>
          Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
            const letter = row[columnIndex] ?? "";
            const result = game.guesses[rowIndex]?.result[columnIndex];

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                className={getTileClassName(result)}
                style={getTileStyle(result, columnIndex)}
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
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Reset
          </button>
        </div>
      </div>

      {isKeyboardVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-10 min-w-[20rem] border-t border-slate-200 bg-slate-50/95 px-1 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:px-3">
          <button
            type="button"
            onClick={() => setIsKeyboardVisible(false)}
            aria-label="Hide keyboard"
            className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full border border-slate-300 bg-white/90 text-slate-500 shadow-sm transition hover:border-slate-400 hover:text-slate-900 active:translate-y-px sm:right-4 sm:top-2 sm:size-9"
          >
            <ChevronDownIcon />
          </button>
          <div className="mx-auto flex w-full max-w-[31rem] flex-col gap-1.5 sm:gap-2">
            {keyboardRows.map((row) => (
              <div key={row.join("")} className="flex w-full justify-center gap-0.5 sm:gap-2">
                {row.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeyboardPress(key)}
                    disabled={game.status !== "playing" || game.isSubmitting}
                    aria-label={key === "BACKSPACE" ? "Backspace" : key}
                    className={getKeyboardKeyClassName(
                      key,
                      key.length === 1 ? keyboardStatuses[key] : undefined,
                      pressedKey === key,
                    )}
                  >
                    {key === "BACKSPACE" ? "⌫" : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsKeyboardVisible(true)}
          aria-label="Show keyboard"
          className="fixed bottom-4 right-4 z-10 flex size-11 items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-600 shadow-lg transition hover:border-slate-400 hover:text-slate-950 active:translate-y-px"
        >
          <KeyboardIcon />
        </button>
      )}
    </section>
  );
}
