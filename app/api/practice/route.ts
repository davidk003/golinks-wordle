import { createGameTokenForPuzzle, getRandomPracticePuzzle } from "../_lib/wordle";

export const runtime = "nodejs";

export async function POST() {
  const puzzle = getRandomPracticePuzzle();

  return Response.json({
    mode: puzzle.mode,
    gameToken: createGameTokenForPuzzle(puzzle, 0),
  });
}
