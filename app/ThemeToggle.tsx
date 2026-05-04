"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "golinks-wordle-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function readSavedTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The current tab can still apply the theme when storage is unavailable.
  }
}

function getPreferredTheme(): Theme {
  const savedTheme = readSavedTheme();

  return isTheme(savedTheme) ? savedTheme : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3.5"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.6 15.3A8.2 8.2 0 0 1 8.7 3.4a.9.9 0 0 0-1-.1 9.7 9.7 0 1 0 13 13 .9.9 0 0 0-.1-1Z" />
    </svg>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") {
      return "light";
    }

    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  });
  const isDark = theme === "dark";

  useEffect(() => {
    function syncTheme() {
      const nextTheme = getPreferredTheme();
      applyTheme(nextTheme);
      setTheme(nextTheme);
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key === THEME_STORAGE_KEY) {
        syncTheme();
      }
    }

    syncTheme();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function handleToggleTheme() {
    const nextTheme: Theme = isDark ? "light" : "dark";

    saveTheme(nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      onClick={handleToggleTheme}
      suppressHydrationWarning
      className="relative flex h-10 w-[4.25rem] shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] p-1 text-[var(--muted-strong)] shadow-sm backdrop-blur transition hover:border-[#6aaa64] focus:outline-none focus:ring-2 focus:ring-[#6aaa64]/35 active:translate-y-px"
    >
      <span className="flex flex-1 justify-center text-amber-500">
        <SunIcon />
      </span>
      <span className="flex flex-1 justify-center text-[var(--muted)]">
        <MoonIcon />
      </span>
      <span
        aria-hidden="true"
        className="theme-toggle-knob absolute left-1 flex size-8 items-center justify-center rounded-full bg-[#6aaa64] text-[#020617] shadow-sm transition-transform duration-200"
      >
        <span className="theme-toggle-sun">
          <SunIcon />
        </span>
        <span className="theme-toggle-moon">
          <MoonIcon />
        </span>
      </span>
    </button>
  );
}
