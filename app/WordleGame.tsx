"use client";

import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from "react";
import { MAX_GUESSES, WORD_LENGTH } from "./wordleConfig";

const DEFAULT_PUZZLE_NUMBER = 0;
const TILE_ENTER_CLEANUP_DELAY_MS = 240;
const TILE_REVEAL_DURATION_MS = 920;
const TILE_REVEAL_STAGGER_MS = 180;
const WIN_CONFETTI_DELAY_MS =
  TILE_REVEAL_DURATION_MS / 2 + TILE_REVEAL_STAGGER_MS;
const WIN_CONFETTI_COLORS = ["#6aaa64", "#c9b458", "#787c7e", "#ffffff"];

type TimeoutRef = {
  current: ReturnType<typeof setTimeout> | null;
};

type NumberRef = {
  current: number;
};

type ConfettiResetRef = {
  current: (() => void) | null;
};

type GameMode = "daily" | "practice";

const keyboardRows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
];

type GameState = {
  guesses: SubmittedGuess[];
  currentGuess: string;
  enteringTiles: EnteredTile[];
  entryAnimationId: number;
  message: string;
  status: "playing" | "won" | "lost";
  isSubmitting: boolean;
  mode: GameMode;
  puzzleNumber: number;
  gameToken?: string;
};

type GuessResult = "correct" | "present" | "absent";

type SubmittedGuess = {
  guess: string;
  result: GuessResult[];
};

type EnteredTile = {
  rowIndex: number;
  columnIndex: number;
  animationId: number;
};

type GuessResponse = {
  guess: string;
  result: GuessResult[];
  mode?: GameMode;
  word?: string;
  puzzleNumber?: number;
  gameToken?: string;
};

type PracticeResponse = {
  mode?: GameMode;
  gameToken?: string;
};

const initialGameState: GameState = {
  guesses: [],
  currentGuess: "",
  enteringTiles: [],
  entryAnimationId: 0,
  message: "Enter a 5-letter guess to fill the board.",
  status: "playing",
  isSubmitting: false,
  mode: "daily",
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

  const currentGuess = game.currentGuess;
  const nextGuess = sanitizeGuess(`${currentGuess}${letter}`);
  const letterWasAdded = nextGuess.length > currentGuess.length;
  const entryAnimationId = letterWasAdded
    ? game.entryAnimationId + 1
    : game.entryAnimationId;

  return {
    ...game,
    currentGuess: nextGuess,
    enteringTiles: letterWasAdded
      ? [
          ...game.enteringTiles,
          {
            rowIndex: game.guesses.length,
            columnIndex: currentGuess.length,
            animationId: entryAnimationId,
          },
        ]
      : game.enteringTiles,
    entryAnimationId,
    message: initialGameState.message,
  };
}

function removeLetterFromGuess(game: GameState): GameState {
  if (!canEditGuess(game)) {
    return game;
  }

  const nextGuess = game.currentGuess.slice(0, -1);

  return {
    ...game,
    currentGuess: nextGuess,
    enteringTiles: game.enteringTiles.filter(
      (tile) =>
        tile.rowIndex !== game.guesses.length || tile.columnIndex < nextGuess.length,
    ),
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

function getTileClassName(result?: GuessResult, isEntering = false) {
  return `flex size-[clamp(2rem,min(15vw,6.2dvh),3.35rem)] items-center justify-center border-2 text-[clamp(1.05rem,6.3vw,1.5rem)] font-black uppercase leading-none ${
    result
      ? `${resultClassNames[result]} wordle-tile-reveal`
      : `border-[#d3d6da] bg-white text-slate-950 ${
          isEntering ? "wordle-tile-enter" : ""
        }`
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
    animationDelay: `${columnIndex * TILE_REVEAL_STAGGER_MS}ms`,
  } as CSSProperties;
}

function getShareText(game: GameState) {
  const score = game.status === "lost" ? "X" : game.guesses.length;
  const gameLabel =
    game.mode === "practice"
      ? "GoLinks Wordle Practice"
      : `GoLinks Wordle #${game.puzzleNumber}`;
  const rows = game.guesses.map((guess) =>
    guess.result.map((result) => shareResultEmoji[result]).join(""),
  );

  return [`${gameLabel} ${score}/${MAX_GUESSES}`, "", ...rows].join("\n");
}

function clearTimeoutRef(timeoutRef: TimeoutRef) {
  if (!timeoutRef.current) {
    return;
  }

  clearTimeout(timeoutRef.current);
  timeoutRef.current = null;
}

function cancelWinConfetti(
  timeoutRef: TimeoutRef,
  celebrationIdRef: NumberRef,
  confettiResetRef: ConfettiResetRef,
) {
  clearTimeoutRef(timeoutRef);
  celebrationIdRef.current += 1;
  confettiResetRef.current?.();
  confettiResetRef.current = null;
}

function clampToViewportFraction(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getConfettiOriginForRow(
  tileRows: (HTMLDivElement | null)[][],
  rowIndex: number,
) {
  const rowTiles = (tileRows[rowIndex] ?? []).filter(
    (tile): tile is HTMLDivElement => tile !== null,
  );

  if (rowTiles.length === 0) {
    return { x: 0.5, y: 0.42 };
  }

  const bounds = rowTiles.reduce(
    (currentBounds, tile) => {
      const rect = tile.getBoundingClientRect();

      return {
        left: Math.min(currentBounds.left, rect.left),
        right: Math.max(currentBounds.right, rect.right),
        top: Math.min(currentBounds.top, rect.top),
        bottom: Math.max(currentBounds.bottom, rect.bottom),
      };
    },
    {
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
      bottom: Number.NEGATIVE_INFINITY,
    },
  );
  const rowCenterX = (bounds.left + bounds.right) / 2;
  const rowCenterY = (bounds.top + bounds.bottom) / 2;

  return {
    x: clampToViewportFraction(rowCenterX / window.innerWidth),
    y: clampToViewportFraction(rowCenterY / window.innerHeight),
  };
}

function getKeyboardKeyClassName(
  key: string,
  result?: GuessResult,
  isPressed = false,
) {
  const widthClass =
    key === "ENTER" || key === "BACKSPACE"
      ? "flex-[1.55_1_0] min-w-0 px-0.5 text-[clamp(0.5rem,2.15vw,0.7rem)] sm:flex-[1.65_1_0] sm:px-2"
      : "flex-[1_1_0] min-w-0 px-0.5 text-[clamp(0.68rem,3vw,0.875rem)] sm:px-2";
  const colorClass = result
    ? keyboardResultClassNames[result]
    : "bg-[#d3d6da] text-black";

  return `${widthClass} ${colorClass} ${
    isPressed ? "keyboard-key-pressed" : ""
  } flex h-[clamp(2.2rem,min(10.5vw,6.8dvh),2.75rem)] transform-gpu items-center justify-center rounded-[4px] font-black uppercase shadow-sm transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 sm:h-11`;
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
  const [isStartingPractice, setIsStartingPractice] = useState(false);
  const [shareTooltipMessage, setShareTooltipMessage] = useState<string | null>(
    null,
  );
  const submitGuessRef = useRef<() => void>(() => {});
  const pressKeyRef = useRef<(key: string) => void>(() => {});
  const submitInFlightRef = useRef(false);
  const practiceRequestIdRef = useRef(0);
  const hasCelebratedWinRef = useRef(false);
  const winCelebrationIdRef = useRef(0);
  const pressKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTooltipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const winConfettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const confettiResetRef = useRef<(() => void) | null>(null);
  const enterTileTimeoutsRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());
  const tileRefs = useRef<(HTMLDivElement | null)[][]>([]);

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

  function clearEnterTileTimeouts() {
    enterTileTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    enterTileTimeoutsRef.current.clear();
  }

  useEffect(() => {
    const enterTileTimeouts = enterTileTimeoutsRef.current;

    return () => {
      if (pressKeyTimeoutRef.current) {
        clearTimeout(pressKeyTimeoutRef.current);
      }

      if (shareTooltipTimeoutRef.current) {
        clearTimeout(shareTooltipTimeoutRef.current);
      }

      cancelWinConfetti(
        winConfettiTimeoutRef,
        winCelebrationIdRef,
        confettiResetRef,
      );

      enterTileTimeouts.forEach((timeout) => clearTimeout(timeout));
      enterTileTimeouts.clear();
    };
  }, []);

  useEffect(() => {
    const enterTileTimeouts = enterTileTimeoutsRef.current;
    const activeAnimationIds = new Set(
      game.enteringTiles.map((tile) => tile.animationId),
    );

    game.enteringTiles.forEach((tile) => {
      if (enterTileTimeouts.has(tile.animationId)) {
        return;
      }

      const timeout = setTimeout(() => {
        enterTileTimeouts.delete(tile.animationId);
        setGame((current) => ({
          ...current,
          enteringTiles: current.enteringTiles.filter(
            (currentTile) => currentTile.animationId !== tile.animationId,
          ),
        }));
      }, TILE_ENTER_CLEANUP_DELAY_MS);

      enterTileTimeouts.set(tile.animationId, timeout);
    });

    enterTileTimeouts.forEach((timeout, animationId) => {
      if (activeAnimationIds.has(animationId)) {
        return;
      }

      clearTimeout(timeout);
      enterTileTimeouts.delete(animationId);
    });
  }, [game.enteringTiles]);

  useEffect(() => {
    if (game.status !== "won" || hasCelebratedWinRef.current) {
      return;
    }

    const winningRowIndex = game.guesses.length - 1;
    const celebrationId = winCelebrationIdRef.current + 1;
    winCelebrationIdRef.current = celebrationId;
    hasCelebratedWinRef.current = true;
    clearTimeoutRef(winConfettiTimeoutRef);

    winConfettiTimeoutRef.current = setTimeout(() => {
      winConfettiTimeoutRef.current = null;

      if (winCelebrationIdRef.current !== celebrationId) {
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const origin = getConfettiOriginForRow(tileRefs.current, winningRowIndex);

      void import("canvas-confetti")
        .then(({ default: confetti }) => {
          if (winCelebrationIdRef.current !== celebrationId) {
            return;
          }

          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
          }

          confettiResetRef.current = () => {
            confetti.reset();
          };

          const animation = confetti({
            colors: WIN_CONFETTI_COLORS,
            disableForReducedMotion: true,
            gravity: 0.9,
            origin,
            particleCount: 90,
            spread: 70,
            startVelocity: 34,
          });
          confetti({
            colors: WIN_CONFETTI_COLORS,
            disableForReducedMotion: true,
            gravity: 0.95,
            origin,
            particleCount: 35,
            scalar: 0.75,
            spread: 110,
            startVelocity: 22,
          });

          if (animation) {
            void animation.finally(() => {
              if (winCelebrationIdRef.current === celebrationId) {
                confettiResetRef.current = null;
              }
            });
          }
        })
        .catch(() => undefined);
    }, WIN_CONFETTI_DELAY_MS);

    return () => {
      cancelWinConfetti(
        winConfettiTimeoutRef,
        winCelebrationIdRef,
        confettiResetRef,
      );
    };
  }, [game.guesses.length, game.status]);

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
    if (game.status !== "playing" || game.isSubmitting || submitInFlightRef.current) {
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
    submitInFlightRef.current = true;

    setGame((current) => ({
      ...current,
      enteringTiles: [],
      isSubmitting: true,
      message: "Checking guess...",
    }));

    try {
      const response = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess: submittedGuess,
          ...(game.gameToken ? { gameToken: game.gameToken } : {}),
        }),
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
        const gameToken =
          typeof guessResult.gameToken === "string"
            ? guessResult.gameToken
            : current.gameToken;
        const mode =
          guessResult.mode === "daily" || guessResult.mode === "practice"
            ? guessResult.mode
            : current.mode;
        const lostMessage = guessResult.word
          ? `No guesses left. The word was ${guessResult.word}.`
          : "No guesses left.";

        return {
          guesses,
          currentGuess: "",
          enteringTiles: [],
          entryAnimationId: current.entryAnimationId,
          isSubmitting: false,
          mode,
          puzzleNumber,
          gameToken,
          status: won ? "won" : lost ? "lost" : "playing",
          message: won
            ? "You won! Reset the board to play again."
            : lost
              ? lostMessage
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
    } finally {
      submitInFlightRef.current = false;
    }
  }

  submitGuessRef.current = () => {
    void submitCurrentGuess();
  };

  function showShareTooltipMessage(message: string) {
    setShareTooltipMessage(message);

    if (shareTooltipTimeoutRef.current) {
      clearTimeout(shareTooltipTimeoutRef.current);
    }

    shareTooltipTimeoutRef.current = setTimeout(() => {
      setShareTooltipMessage(null);
      shareTooltipTimeoutRef.current = null;
    }, 1600);
  }

  function handleReset(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    practiceRequestIdRef.current += 1;
    setIsStartingPractice(false);
    clearEnterTileTimeouts();
    cancelWinConfetti(
      winConfettiTimeoutRef,
      winCelebrationIdRef,
      confettiResetRef,
    );
    hasCelebratedWinRef.current = false;

    if (shareTooltipTimeoutRef.current) {
      clearTimeout(shareTooltipTimeoutRef.current);
      shareTooltipTimeoutRef.current = null;
    }

    setShareTooltipMessage(null);
    setGame(initialGameState);
  }

  async function handleStartPractice(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();

    if (game.isSubmitting || isStartingPractice || submitInFlightRef.current) {
      return;
    }

    const requestId = practiceRequestIdRef.current + 1;
    practiceRequestIdRef.current = requestId;
    clearEnterTileTimeouts();
    cancelWinConfetti(
      winConfettiTimeoutRef,
      winCelebrationIdRef,
      confettiResetRef,
    );
    hasCelebratedWinRef.current = false;
    setShareTooltipMessage(null);
    setIsStartingPractice(true);
    setGame((current) => ({
      ...current,
      enteringTiles: [],
      isSubmitting: true,
      message: "Starting practice game...",
    }));

    try {
      const response = await fetch("/api/practice", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Unable to start practice game.",
        );
      }

      const practiceGame = data as PracticeResponse;

      if (
        practiceGame.mode !== "practice" ||
        typeof practiceGame.gameToken !== "string"
      ) {
        throw new Error("Unable to start practice game.");
      }

      if (practiceRequestIdRef.current !== requestId) {
        return;
      }

      clearEnterTileTimeouts();
      setGame({
        ...initialGameState,
        mode: "practice",
        gameToken: practiceGame.gameToken,
        message: "Practice game started. Enter a 5-letter guess.",
      });
    } catch (error) {
      if (practiceRequestIdRef.current !== requestId) {
        return;
      }

      setGame((current) => ({
        ...current,
        isSubmitting: false,
        message:
          error instanceof Error ? error.message : "Unable to start practice game.",
      }));
    } finally {
      if (practiceRequestIdRef.current === requestId) {
        setIsStartingPractice(false);
      }
    }
  }

  async function handleShareResults() {
    if (game.status === "playing") {
      return;
    }

    try {
      await navigator.clipboard.writeText(getShareText(game));
      showShareTooltipMessage("Copied");
    } catch {
      showShareTooltipMessage("Unable to copy results.");
    }
  }

  function handleHideKeyboard(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    setIsKeyboardVisible(false);
  }

  function handleShowKeyboard(event: MouseEvent<HTMLButtonElement>) {
    event.currentTarget.blur();
    setIsKeyboardVisible(true);
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
      className={`relative mt-[clamp(0.75rem,2.5dvh,1rem)] flex w-full max-w-md flex-col items-center gap-[clamp(0.75rem,2.2dvh,1rem)] sm:mt-8 sm:gap-6 ${
        isKeyboardVisible
          ? "pb-[calc(clamp(10.5rem,36dvh,13.5rem)+env(safe-area-inset-bottom))] sm:pb-[calc(15rem+env(safe-area-inset-bottom))]"
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
            {shareTooltipMessage ? (
              <span className="block font-bold" aria-live="polite" aria-atomic="true">
                {shareTooltipMessage}
              </span>
            ) : (
              <pre className="m-0 whitespace-pre-wrap font-mono leading-relaxed text-white">
                {shareText}
              </pre>
            )}
          </div>
        </div>
      </div>

      <div
        aria-label="Wordle board"
        className="grid max-w-full grid-cols-5 gap-[clamp(0.125rem,1vw,0.25rem)] rounded-sm border border-slate-200 bg-white p-[clamp(0.125rem,1vw,0.25rem)] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
      >
        {rows.map((row, rowIndex) =>
          Array.from({ length: WORD_LENGTH }, (_, columnIndex) => {
            const letter = row[columnIndex] ?? "";
            const result = game.guesses[rowIndex]?.result[columnIndex];
            const enteringTile = letter && !result
              ? game.enteringTiles.find(
                  (tile) =>
                    tile.rowIndex === rowIndex && tile.columnIndex === columnIndex,
                )
              : undefined;

            return (
              <div
                key={`${rowIndex}-${columnIndex}`}
                ref={(node) => {
                  tileRefs.current[rowIndex] ??= [];
                  tileRefs.current[rowIndex][columnIndex] = node;
                }}
                className={getTileClassName(result, Boolean(enteringTile))}
                style={getTileStyle(result, columnIndex)}
              >
                {letter}
              </div>
            );
          }),
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-[clamp(0.5rem,1.5dvh,0.75rem)] text-center">
        <p id="game-message" className="text-sm text-slate-500" aria-live="polite">
          {game.message}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={game.isSubmitting || isStartingPractice}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleStartPractice}
            disabled={game.isSubmitting || isStartingPractice}
            className="rounded-md border border-[#6aaa64] bg-[#6aaa64] px-4 py-2 text-sm font-bold text-white transition hover:border-[#5b9956] hover:bg-[#5b9956] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStartingPractice ? "Starting..." : "New practice"}
          </button>
        </div>
      </div>

      {isKeyboardVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-slate-50/95 pb-[calc(env(safe-area-inset-bottom)+clamp(0.35rem,1.5dvh,0.75rem))] pl-[max(0.125rem,env(safe-area-inset-left))] pr-[max(0.125rem,env(safe-area-inset-right))] pt-[clamp(0.25rem,1.2dvh,0.5rem)] shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur sm:px-3">
          <div className="mx-auto flex w-full max-w-[31rem] flex-col gap-[clamp(0.1875rem,0.8dvh,0.5rem)]">
            <div className="px-[clamp(0.25rem,2vw,0.5rem)]">
              <button
                type="button"
                onClick={handleHideKeyboard}
                aria-label="Hide keyboard"
                className="relative z-10 flex h-8 w-full touch-manipulation select-none items-center justify-center gap-1 rounded-md border border-transparent text-xs font-bold uppercase tracking-[0.12em] text-slate-500 transition hover:bg-white/80 hover:text-slate-900 active:translate-y-px"
              >
                <ChevronDownIcon />
                Hide keyboard
              </button>
            </div>
            {keyboardRows.map((row) => (
              <div key={row.join("")} className="flex w-full justify-center gap-[clamp(1px,0.45vw,0.5rem)] sm:gap-2">
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
          onClick={handleShowKeyboard}
          aria-label="Show keyboard"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+0.75rem)] z-20 flex size-11 touch-manipulation select-none items-center justify-center rounded-full border border-slate-300 bg-white/95 text-slate-600 shadow-lg transition hover:border-slate-400 hover:text-slate-950 active:translate-y-px"
        >
          <KeyboardIcon />
        </button>
      )}
    </section>
  );
}
