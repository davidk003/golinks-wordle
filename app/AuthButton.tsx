"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthButton() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white/95 p-1 shadow-sm backdrop-blur">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px"
          >
            Log in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-[#6aaa64] bg-[#6aaa64] px-3 py-1.5 text-sm font-bold text-white transition hover:border-[#5b9956] hover:bg-[#5b9956] focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px"
          >
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton userProfileMode="modal" />
      </Show>
    </div>
  );
}
