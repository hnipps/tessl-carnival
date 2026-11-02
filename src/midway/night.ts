/**
 * Night on the midway: how dark it is, and the fireworks that go up once it is.
 * Plain functions, so they can be tested without a browser.
 */

/** Seconds a full fade between day and night takes. */
export const FADE_SECONDS = 3;
/** Seconds of full night before the first rocket goes up. */
export const FIREWORKS_DELAY = 1.5;
/** The most sparks in the sky at once, so slow laptops keep up. */
export const MAX_SPARKS = 300;
/** The most rockets climbing at once. */
export const MAX_ROCKETS = 4;

export interface NightState {
  /** Whether it is heading to night (true) or back to day (false). */
  night: boolean;
  /** 0 is full day, 1 is full night. */
  darkness: number;
  /** Seconds since night was fully in, or 0 while it isn't. */
  nightFor: number;
}

export function createNight(): NightState {
  return { night: false, darkness: 0, nightFor: 0 };
}

/** Turns towards night, or back towards day, from wherever the fade is. */
export function toggleNight(state: NightState) {
  state.night = !state.night;
}

/** Moves the fade on by `dt` seconds. */
export function stepNight(state: NightState, dt: number) {
  const step = dt / FADE_SECONDS;
  state.darkness = state.night
    ? Math.min(1, state.darkness + step)
    : Math.max(0, state.darkness - step);
  state.nightFor = state.night && state.darkness === 1 ? state.nightFor + dt : 0;
}

/** Whether rockets should be going up. */
export function fireworksOn(state: NightState): boolean {
  return state.night && state.nightFor >= FIREWORKS_DELAY;
}

export interface Rocket {
  x: number;
  y: number;
  /** Upward speed, in world pixels a second. */
  speed: number;
  /** The height it bursts at. */
  burstAt: number;
  color: string;
}

export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
}

export interface Fireworks {
  rockets: Rocket[];
  sparks: Spark[];
  /** Seconds until the next rocket goes up. */
  nextLaunch: number;
}

/** Where rockets go up: from just below `horizon`, bursting between `top` and the horizon. */
export interface Sky {
  left: number;
  right: number;
  top: number;
  horizon: number;
}

export function createFireworks(): Fireworks {
  return { rockets: [], sparks: [], nextLaunch: 0 };
}

const GRAVITY = 40;
const SPARKS_PER_BURST = 48;

/**
 * Moves the fireworks on by `dt` seconds. While `launching`, new rockets go up
 * every so often; rockets burst into sparks that fall, fade and are removed.
 */
export function stepFireworks(
  fireworks: Fireworks,
  dt: number,
  launching: boolean,
  sky: Sky,
  colors: readonly string[],
  random: () => number,
) {
  const { rockets, sparks } = fireworks;

  if (launching) {
    fireworks.nextLaunch -= dt;
    if (fireworks.nextLaunch <= 0 && rockets.length < MAX_ROCKETS) {
      fireworks.nextLaunch = 0.4 + random() * 0.9;
      const height = sky.horizon - sky.top;
      rockets.push({
        x: sky.left + random() * (sky.right - sky.left),
        y: sky.horizon + 10,
        speed: 110 + random() * 40,
        burstAt: sky.top + random() * height * 0.5,
        color: colors[Math.floor(random() * colors.length)],
      });
    }
  } else {
    // Rockets still climbing stop; sparks already in the air fade out.
    rockets.length = 0;
    fireworks.nextLaunch = 0;
  }

  for (const rocket of rockets) rocket.y -= rocket.speed * dt;
  const bursting = rockets.filter((r) => r.y <= r.burstAt);
  for (const rocket of bursting) {
    const count = Math.min(SPARKS_PER_BURST, MAX_SPARKS - sparks.length);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random() * 0.2;
      const speed = 30 + random() * 30;
      sparks.push({
        x: rocket.x,
        y: rocket.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
        life: 1.2 + random() * 0.8,
        color: rocket.color,
      });
    }
  }
  fireworks.rockets = rockets.filter((r) => r.y > r.burstAt);

  for (const spark of sparks) {
    spark.age += dt;
    spark.vy += GRAVITY * dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
  }
  fireworks.sparks = sparks.filter((s) => s.age < s.life);
}

/** How visible a spark still is, from 1 as it bursts to 0 as it's removed. */
export function sparkAlpha(spark: Spark): number {
  return Math.max(0, 1 - spark.age / spark.life);
}
