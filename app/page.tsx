import { WordleGame } from "./WordleGame";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-stone-50 px-6 py-8 text-slate-950 sm:px-10">
      <header className="w-full max-w-xl border-b border-slate-200 pb-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-700">
          GoLinks Wordle
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          Guess the go link
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          A lightweight shell for the daily internal-link word game. This step
          wires in the local board state before endpoint and keyboard support.
        </p>
      </header>

      <WordleGame />
    </main>
  );
}
