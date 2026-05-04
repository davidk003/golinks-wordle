# GoLinks Wordle

A Wordle clone.

## Quick Setup

```bash
pnpm install
pnpm db:schema
pnpm dev
```

Create `.env.local` with Clerk auth keys, `DATABASE_URL`, and `WORDLE_TOKEN_SECRET` before running the database schema or authenticated features.

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Clerk, Neon Postgres.

## Features

- Daily Wordle-style puzzle and unlimited practice mode
- Server-scored guesses with signed game tokens
- Clerk sign-in with saved sessions, stats, and leaderboards
- Shareable results, win confetti, and light/dark theme toggle
- Responsive on-screen keyboard with tile reveal animations
