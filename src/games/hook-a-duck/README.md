# Hook a Duck

Rubber ducks float round a stream in a loop. Lower the hook to catch one as it passes.

## How to play

- Move the mouse to aim: a ring shows where the hook will land.
- Click to cast. The hook takes a moment to go down, so aim a little ahead of a duck.
  It catches the duck under it when it reaches the water, and comes back up. You can't cast again until it is back up.
- A caught duck goes back into the stream once the hook is up.
- You have 10 casts. The round ends when the last cast is back up.
- When the round is over, click **Play again** to start a new round, or **Back to the
  midway** to leave the game. A click anywhere else on that screen does nothing.

## Scoring

Each duck has a number on its base, and catching it scores that number. The eight
ducks carry 1, 2, 3, 5, 10, 1, 2 and 3. A cast that misses scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`, `duckPosition`,
  `hookPosition`, `roundOverButtonAt`) and the `hookADuck` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
