# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack them before they drop back down.

## How to play

- Click a mole while it's up to whack it.
- Each mole stays up for a short time, then drops back into its hole.
- Moles pop up faster, and stay up for less time, as the round goes on:
  a new mole every 1 second at the start, down to every 0.35 seconds at the end,
  each staying up 1.4 seconds at the start and 0.6 seconds at the end.
- The round lasts 30 seconds.
- When the round is over, click **Play again** to start a new round, or **Back to the
  midway** to leave the game. A click anywhere else on that screen does nothing.

## Scoring

Each mole you whack scores 10 points. Missing, or clicking an empty hole, costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `popInterval`, `upTime`,
  `roundOverButtonAt`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
