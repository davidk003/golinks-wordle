import { WordleGame } from "./WordleGame";

export default function Home() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center bg-slate-50 px-4 py-6 text-slate-950 sm:px-8">
      <header className="w-full max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
          Guess the go link
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          Definitely not Wordle
        </h1>
      </header>

      <WordleGame />
    </main>
  );
}
