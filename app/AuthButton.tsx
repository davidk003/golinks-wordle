"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function AuthButton() {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-sm backdrop-blur">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-transparent px-3 py-1.5 text-sm font-bold text-[var(--muted-strong)] transition hover:border-[var(--border)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px"
          >
            Log in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="rounded-md border border-[#6aaa64] bg-[#6aaa64] px-3 py-1.5 text-sm font-bold text-[#020617] transition hover:border-[#5b9956] hover:bg-[#5b9956] focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px"
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
