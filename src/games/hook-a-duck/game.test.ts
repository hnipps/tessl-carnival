import { describe, expect, it } from 'vitest';
import {
  CASTS,
  CATCH_RADIUS,
  DROP_TIME,
  DUCK_SPEED,
  DUCK_VALUES,
  RAISE_TIME,
  ROD_Y,
  ROUND_OVER_BUTTONS,
  cast,
  createState,
  duckAt,
  duckPosition,
  hookPosition,
  roundOverButtonAt,
  step,
} from './game';

/** Casts where a duck will be when the hook reaches the water, and lets it land. */
function castAt(state: ReturnType<typeof createState>, index: number) {
  const duck = state.ducks[index];
  const { x, y } = duckPosition({ ...duck, angle: duck.angle + DUCK_SPEED * DROP_TIME });
  cast(state, x, y);
  step(state, DROP_TIME);
}

describe('hook a duck', () => {
  it('starts with every cast left, no score and a duck for each value', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual(DUCK_VALUES);
  });

  it('floats the ducks round the stream', () => {
    const state = createState();
    const before = state.ducks[0].angle;
    step(state, 1);
    expect(state.ducks[0].angle).toBeCloseTo(before + DUCK_SPEED);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state, 400, 300)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook).not.toBeNull();
  });

  it('cannot cast again while the hook is still out', () => {
    const state = createState();
    cast(state, 400, 300);
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot cast once the casts are used up', () => {
    const state = createState();
    state.casts = 0;
    expect(cast(state, 400, 300)).toBe(false);
    expect(state.hook).toBeNull();
  });

  it('scores the number on a duck the hook lands on', () => {
    const state = createState();
    const index = DUCK_VALUES.indexOf(10);
    castAt(state, index);
    expect(state.score).toBe(10);
    expect(state.ducks[index].caught).toBe(true);
    expect(state.hook?.duck).toBe(index);
  });

  it('scores nothing when the hook misses every duck', () => {
    const state = createState();
    cast(state, 400, 280);
    step(state, DROP_TIME);
    expect(state.score).toBe(0);
    expect(state.hook?.duck).toBeNull();
  });

  it('only catches a duck within the catch radius', () => {
    const state = createState();
    const { x, y } = duckPosition(state.ducks[0]);
    expect(duckAt(state, x + CATCH_RADIUS - 1, y)).toBe(0);
    expect(duckAt(state, x + CATCH_RADIUS + 1, y)).toBeNull();
  });

  it('puts a caught duck back in the stream when the hook is back up', () => {
    const state = createState();
    castAt(state, 0);
    step(state, RAISE_TIME);
    expect(state.hook).toBeNull();
    expect(state.ducks[0].caught).toBe(false);
  });

  it('lowers the hook from the rod and raises it back', () => {
    const state = createState();
    cast(state, 400, 300);
    expect(hookPosition(state.hook!).y).toBe(ROD_Y);
    step(state, DROP_TIME);
    expect(hookPosition(state.hook!).y).toBe(300);
    step(state, RAISE_TIME / 2);
    expect(hookPosition(state.hook!).y).toBeCloseTo((ROD_Y + 300) / 2);
  });

  it('keeps playing while the last cast is still out', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, DROP_TIME);
    expect(state.phase).toBe('playing');
  });

  it('ends the round when the last cast is back up', () => {
    const state = createState();
    state.casts = 1;
    cast(state, 400, 300);
    step(state, DROP_TIME);
    step(state, RAISE_TIME);
    expect(state.phase).toBe('over');
    expect(cast(state, 400, 300)).toBe(false);
  });

  it('finds the round-over buttons under a point, and nothing elsewhere', () => {
    const { playAgain, midway } = ROUND_OVER_BUTTONS;
    expect(roundOverButtonAt(playAgain.x + 10, playAgain.y + 10)).toBe('playAgain');
    expect(roundOverButtonAt(midway.x + 10, midway.y + 10)).toBe('midway');
    expect(roundOverButtonAt(10, 10)).toBeNull();
  });
});
