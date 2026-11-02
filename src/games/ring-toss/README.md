# Ring Toss

Toss rings onto the necks of the bottles at the back of the booth.

## How to play

- Move the mouse left and right to aim. The dashed line shows where the next ring
  will land.
- The power meter on the right swings up and down on its own. Click to throw: the
  fuller the meter, the further back the ring lands.
- One ring is in the air at a time. You have 8 rings, and the round ends when the
  last one lands.
- When the round is over, click **Play again** to start a new round, or **Back to the
  midway** to leave the game. A click anywhere else on that screen does nothing.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck. Bottles further back
score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A ring that misses scores nothing. Your final score is saved to the carnival's
score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `landingY`,
  `bottleAt`, `roundOverButtonAt`) and the `ringToss` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.
