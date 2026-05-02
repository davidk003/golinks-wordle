import { AuthButton } from "./AuthButton";
import { WordleGame } from "./WordleGame";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center overflow-x-hidden bg-slate-50 px-[clamp(0.5rem,3vw,0.75rem)] py-4 text-slate-950 sm:px-8 sm:py-6">
      <div className="fixed right-[calc(env(safe-area-inset-right)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)] z-30">
        <AuthButton />
      </div>

      <header className="w-full max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-slate-500">
          Guess the word
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,9vw,2.25rem)] font-black tracking-tight">
          Definitely not Wordle
        </h1>
      </header>

      <WordleGame />
    </main>
  );
}
