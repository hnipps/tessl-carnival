import { describe, expect, it } from 'vitest';
import {
  MOLE_RADIUS,
  POINTS_PER_MOLE,
  POP_INTERVAL,
  ROUND_OVER_BUTTONS,
  ROUND_SECONDS,
  UP_TIME,
  createState,
  popInterval,
  roundOverButtonAt,
  step,
  upTime,
  whack,
} from './game';

const moleCentre = (hole: { x: number; y: number }) => ({ x: hole.x, y: hole.y - MOLE_RADIUS / 2 });

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and no moles up', () => {
    const state = createState();
    expect(state.holes).toHaveLength(9);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up from an empty hole when the pop timer runs out', () => {
    const state = createState();
    step(state, state.nextPop, () => 0);
    expect(state.holes[0].up).toBeCloseTo(UP_TIME.start, 1);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('drops a mole back down once its time is up', () => {
    const state = createState();
    state.holes[4].up = 0.2;
    state.nextPop = 10;
    step(state, 0.25);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it back down', () => {
    const state = createState();
    state.holes[2].up = 1;
    const { x, y } = moleCentre(state.holes[2]);
    expect(whack(state, x, y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(state.holes[2].up).toBe(0);
  });

  it('cannot whack the same mole twice', () => {
    const state = createState();
    state.holes[2].up = 1;
    const { x, y } = moleCentre(state.holes[2]);
    whack(state, x, y);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('scores nothing for an empty hole or a miss', () => {
    const state = createState();
    const { x, y } = moleCentre(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    state.holes[0].up = 1;
    expect(whack(state, x + MOLE_RADIUS * 2, y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('scores nothing for a click below the visible mole', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    // Inside the mole's full circle, but below the rim it is clipped at and below the hole.
    expect(whack(state, hole.x, hole.y + 18)).toBe(false);
    expect(hole.up).toBe(1);
    expect(state.score).toBe(0);
  });

  it('pops moles faster and for less time as the round goes on', () => {
    const state = createState();
    expect(popInterval(state)).toBeCloseTo(POP_INTERVAL.start);
    expect(upTime(state)).toBeCloseTo(UP_TIME.start);
    state.timeLeft = ROUND_SECONDS / 2;
    expect(popInterval(state)).toBeLessThan(POP_INTERVAL.start);
    expect(upTime(state)).toBeLessThan(UP_TIME.start);
    state.timeLeft = 0;
    expect(popInterval(state)).toBeCloseTo(POP_INTERVAL.end);
    expect(upTime(state)).toBeCloseTo(UP_TIME.end);
  });

  it('ends the round when the clock runs out, with every mole down', () => {
    const state = createState();
    state.holes[1].up = 5;
    for (let t = 0; t < ROUND_SECONDS + 1; t += 0.05) step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('cannot whack once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    state.holes[0].up = 1;
    const { x, y } = moleCentre(state.holes[0]);
    expect(whack(state, x, y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('finds the round-over buttons, and nothing between them', () => {
    const { playAgain, midway } = ROUND_OVER_BUTTONS;
    expect(roundOverButtonAt(playAgain.x + 5, playAgain.y + 5)).toBe('playAgain');
    expect(roundOverButtonAt(midway.x + 5, midway.y + 5)).toBe('midway');
    expect(roundOverButtonAt(playAgain.x + playAgain.width + 5, playAgain.y + 5)).toBeNull();
  });
});
