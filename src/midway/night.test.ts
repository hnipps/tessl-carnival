import { describe, expect, it } from 'vitest';
import {
  createFireworks,
  createNight,
  FADE_SECONDS,
  FIREWORKS_DELAY,
  fireworksOn,
  MAX_ROCKETS,
  MAX_SPARKS,
  sparkAlpha,
  stepFireworks,
  stepNight,
  toggleNight,
  type Fireworks,
} from './night';
import { seededRandom } from './world';

const sky = { left: 0, right: 400, top: -200, horizon: 0 };
const colors = ['gold', 'red'];

function run(state: ReturnType<typeof createNight>, seconds: number, dt = 0.05) {
  for (let t = 0; t < seconds - 1e-9; t += dt) stepNight(state, dt);
}

describe('stepNight', () => {
  it('stays day until N is pressed', () => {
    const state = createNight();
    run(state, 5);
    expect(state.darkness).toBe(0);
    expect(fireworksOn(state)).toBe(false);
  });

  it('fades to night smoothly over a few seconds', () => {
    const state = createNight();
    toggleNight(state);
    run(state, FADE_SECONDS / 2);
    expect(state.darkness).toBeCloseTo(0.5);
    run(state, FADE_SECONDS / 2);
    expect(state.darkness).toBeCloseTo(1);
  });

  it('starts fireworks between 1 and 2 seconds after night is fully in', () => {
    const state = createNight();
    toggleNight(state);
    run(state, FADE_SECONDS + 0.1);
    expect(state.darkness).toBe(1);
    expect(fireworksOn(state)).toBe(false);
    run(state, 0.9);
    expect(fireworksOn(state)).toBe(false);
    run(state, 1);
    expect(fireworksOn(state)).toBe(true);
    expect(FIREWORKS_DELAY).toBeGreaterThanOrEqual(1);
    expect(FIREWORKS_DELAY).toBeLessThanOrEqual(2);
  });

  it('fades back to day when N is pressed again, and stops the fireworks', () => {
    const state = createNight();
    toggleNight(state);
    run(state, FADE_SECONDS + 3);
    expect(fireworksOn(state)).toBe(true);
    toggleNight(state);
    stepNight(state, 0.05);
    expect(fireworksOn(state)).toBe(false);
    run(state, FADE_SECONDS / 2);
    expect(state.darkness).toBeGreaterThan(0);
    expect(state.darkness).toBeLessThan(1);
    run(state, FADE_SECONDS);
    expect(state.darkness).toBe(0);
  });

  it('turns back from the middle of a fade without snapping', () => {
    const state = createNight();
    toggleNight(state);
    run(state, 1);
    const halfway = state.darkness;
    toggleNight(state);
    stepNight(state, 0.05);
    expect(state.darkness).toBeLessThan(halfway);
    expect(state.darkness).toBeGreaterThan(halfway - 0.1);
  });
});

function stepFor(fireworks: Fireworks, seconds: number, launching: boolean, random: () => number) {
  for (let t = 0; t < seconds; t += 0.05)
    stepFireworks(fireworks, 0.05, launching, sky, colors, random);
}

describe('stepFireworks', () => {
  it('launches rockets from below the horizon while launching', () => {
    const fireworks = createFireworks();
    stepFireworks(fireworks, 0.05, true, sky, colors, seededRandom(1));
    expect(fireworks.rockets).toHaveLength(1);
    const [rocket] = fireworks.rockets;
    expect(rocket.y).toBeGreaterThan(sky.horizon);
    expect(rocket.x).toBeGreaterThanOrEqual(sky.left);
    expect(rocket.x).toBeLessThanOrEqual(sky.right);
    expect(colors).toContain(rocket.color);
  });

  it('launches nothing when not launching', () => {
    const fireworks = createFireworks();
    stepFor(fireworks, 5, false, seededRandom(2));
    expect(fireworks.rockets).toHaveLength(0);
    expect(fireworks.sparks).toHaveLength(0);
  });

  it('bursts rockets into sparks in the sky', () => {
    const fireworks = createFireworks();
    stepFor(fireworks, 4, true, seededRandom(3));
    expect(fireworks.sparks.length).toBeGreaterThan(0);
    for (const spark of fireworks.sparks) expect(spark.y).toBeLessThan(sky.horizon + 50);
  });

  it('pulls sparks down and fades them out', () => {
    const fireworks = createFireworks();
    fireworks.sparks.push({ x: 0, y: -100, vx: 0, vy: 0, age: 0, life: 1, color: 'gold' });
    stepFireworks(fireworks, 0.5, false, sky, colors, seededRandom(4));
    const [spark] = fireworks.sparks;
    expect(spark.y).toBeGreaterThan(-100);
    expect(sparkAlpha(spark)).toBeCloseTo(0.5);
    stepFireworks(fireworks, 0.6, false, sky, colors, seededRandom(4));
    expect(fireworks.sparks).toHaveLength(0);
  });

  it('keeps rockets and sparks under their caps', () => {
    const fireworks = createFireworks();
    for (let i = 0; i < 2000; i++) {
      stepFireworks(fireworks, 0.05, true, sky, colors, seededRandom(i));
      expect(fireworks.rockets.length).toBeLessThanOrEqual(MAX_ROCKETS);
      expect(fireworks.sparks.length).toBeLessThanOrEqual(MAX_SPARKS);
    }
  });

  it('clears climbing rockets when it stops launching, and lets sparks fade', () => {
    const fireworks = createFireworks();
    stepFor(fireworks, 4, true, seededRandom(5));
    stepFireworks(fireworks, 0.05, false, sky, colors, seededRandom(5));
    expect(fireworks.rockets).toHaveLength(0);
    stepFor(fireworks, 3, false, seededRandom(5));
    expect(fireworks.sparks).toHaveLength(0);
  });
});
