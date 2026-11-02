import { describe, expect, it } from 'vitest';
import {
  FAR_Y,
  FLIGHT_TIME,
  NEAR_Y,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  ROUND_OVER_BUTTONS,
  bottleAt,
  createState,
  landingY,
  neckY,
  roundOverButtonAt,
  step,
  throwRing,
} from './game';

/** Sets the power meter so a throw lands at `y`, throws at `x` and lets the ring land. */
function throwAt(state: ReturnType<typeof createState>, x: number, y: number) {
  state.power = (NEAR_Y - y) / (NEAR_Y - FAR_Y);
  throwRing(state, x);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with every ring and no score', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(throwRing(state, 400)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws one ring at a time', () => {
    const state = createState();
    throwRing(state, 400);
    expect(throwRing(state, 400)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(throwRing(state, 400)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('lands further back with more power', () => {
    expect(landingY(0)).toBe(NEAR_Y);
    expect(landingY(1)).toBe(FAR_Y);
    expect(landingY(0.8)).toBeLessThan(landingY(0.2));
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    throwAt(state, bottle.x, neckY(bottle));
    expect(state.score).toBe(bottle.points);
    expect(state.landed).toHaveLength(1);
    expect(state.landed[0].x).toBe(bottle.x);
    expect(state.landed[0].y).toBeCloseTo(neckY(bottle));
    expect(state.landed[0].bottle).toBe(bottle);
  });

  it('scores a ring aimed at the cap, and not one on the body', () => {
    const hit = createState();
    const bottle = hit.bottles[0];
    throwAt(hit, bottle.x, bottle.y - 20);
    expect(hit.score).toBe(bottle.points);

    const miss = createState();
    throwAt(miss, bottle.x, bottle.y + 14);
    expect(miss.score).toBe(0);
    expect(miss.landed[0].bottle).toBeNull();
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    throwAt(state, 5, NEAR_Y);
    expect(state.score).toBe(0);
    expect(state.landed[0].bottle).toBeNull();
  });

  it('keeps the ring in the air until it lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.power = (NEAR_Y - bottle.y) / (NEAR_Y - FAR_Y);
    throwRing(state, bottle.x);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.ring).not.toBeNull();
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('only counts a landing within the neck radius', () => {
    const { bottles } = createState();
    const bottle = bottles[0];
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS - 1, neckY(bottle))).toBe(bottle);
    expect(bottleAt(bottles, bottle.x + NECK_RADIUS + 1, neckY(bottle))).toBeNull();
  });

  it('ends the round when the last ring lands', () => {
    const state = createState();
    state.rings = 1;
    throwRing(state, 400);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });

  it('swings the power meter between empty and full', () => {
    const state = createState();
    const seen: number[] = [];
    for (let i = 0; i < 100; i++) {
      step(state, 0.05);
      seen.push(state.power);
    }
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(1);
  });

  it('finds the round-over buttons, and nothing outside them', () => {
    const { playAgain, midway } = ROUND_OVER_BUTTONS;
    expect(roundOverButtonAt(playAgain.x + 1, playAgain.y + 1)).toBe('playAgain');
    expect(roundOverButtonAt(midway.x + midway.width, midway.y + midway.height)).toBe('midway');
    expect(roundOverButtonAt(10, 10)).toBeNull();
  });
});
