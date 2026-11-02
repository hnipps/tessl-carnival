import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** How close to the middle of a bottle's neck a ring has to land to score, in pixels. */
export const NECK_RADIUS = 14;
/** How tall a bottle's neck is drawn, from the top of its body up, in pixels. */
const NECK_HEIGHT = 18;
/** How long a ring is in the air, in seconds. */
export const FLIGHT_TIME = 0.6;
/** Full swings of the power meter, from empty to full, per second. */
export const POWER_SPEED = 0.8;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Where a ring lands at no power and at full power. */
export const NEAR_Y = 340;
export const FAR_Y = 60;
/** The rows of bottles, back row first. Bottles further back score more. */
const ROWS = [
  { y: 100, points: 30 },
  { y: 170, points: 20 },
  { y: 240, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  y: number;
  points: number;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface LandedRing {
  x: number;
  y: number;
  /** The bottle the ring landed on, or null for a miss. */
  bottle: Bottle | null;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  landed: LandedRing[];
  rings: number;
  score: number;
  /** The power meter, from 0 (near) to 1 (far). */
  power: number;
  powerRising: boolean;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (BOTTLES_PER_ROW - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      points: row.points,
    })),
  );
  return {
    bottles,
    ring: null,
    landed: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    power: 0,
    powerRising: true,
    phase: 'playing',
  };
}

/** Where a throw at this power lands, from NEAR_Y at 0 to FAR_Y at 1. */
export function landingY(power: number): number {
  return NEAR_Y - Math.min(Math.max(power, 0), 1) * (NEAR_Y - FAR_Y);
}

/** The middle of a bottle's neck as drawn: the point a ring has to land near. */
export function neckY(bottle: Bottle): number {
  return bottle.y - NECK_HEIGHT / 2;
}

/** The bottle whose neck a ring landing at (x, y) goes over, or null for a miss. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | null {
  let best: Bottle | null = null;
  let bestDistance = NECK_RADIUS;
  for (const bottle of bottles) {
    const distance = Math.hypot(x - bottle.x, y - neckY(bottle));
    if (distance <= bestDistance) {
      best = bottle;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Throws one ring towards `aimX`, as far as the power meter says. Only one ring
 * is in the air at a time. Returns false if nothing was thrown.
 */
export function throwRing(state: RingTossState, aimX: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: Math.min(Math.max(aimX, 0), WIDTH),
    toY: landingY(state.power),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  if (state.phase !== 'playing') return;

  // The power meter swings between empty and full.
  state.power += (state.powerRising ? 1 : -1) * POWER_SPEED * dt;
  if (state.power >= 1) {
    state.power = 1;
    state.powerRising = false;
  } else if (state.power <= 0) {
    state.power = 0;
    state.powerRising = true;
  }

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
      if (bottle) state.score += bottle.points;
      state.landed.push({ x: ring.toX, y: ring.toY, bottle });
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

/** Where a ring in the air is drawn: a straight line with a hop on top. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - Math.sin(Math.PI * t) * 80,
  };
}

export type RoundOverButton = 'playAgain' | 'midway';

/** Where the round-over screen draws its buttons, in canvas pixels. */
export const ROUND_OVER_BUTTONS: Record<
  RoundOverButton,
  { x: number; y: number; width: number; height: number; label: string }
> = {
  playAgain: {
    x: WIDTH / 2 - 210,
    y: HEIGHT / 2 + 30,
    width: 200,
    height: 52,
    label: 'Play again',
  },
  midway: {
    x: WIDTH / 2 + 10,
    y: HEIGHT / 2 + 30,
    width: 200,
    height: 52,
    label: 'Back to the midway',
  },
};

/** The round-over button a canvas point lands on, or null when it misses both. */
export function roundOverButtonAt(x: number, y: number): RoundOverButton | null {
  for (const [name, button] of Object.entries(ROUND_OVER_BUTTONS)) {
    if (
      x >= button.x &&
      x <= button.x + button.width &&
      y >= button.y &&
      y <= button.y + button.height
    ) {
      return name as RoundOverButton;
    }
  }
  return null;
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, NECK_RADIUS + 4, (NECK_RADIUS + 4) / 2.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aimX: number) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(60, row.y + 26, WIDTH - 120, 6);
  }

  // Missed rings lie where they fell, behind the bottles.
  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.muted;
  for (const landed of state.landed) {
    if (!landed.bottle) drawRing(ctx, landed.x, landed.y + 22);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.beginPath();
    ctx.roundRect(bottle.x - 12, bottle.y - 2, 24, 30, 6);
    ctx.fill();
    ctx.fillRect(bottle.x - 4, bottle.y - NECK_HEIGHT, 8, NECK_HEIGHT);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 5, bottle.y - NECK_HEIGHT - 4, 10, 5);
  }

  // Rings that scored sit on their bottle's neck.
  ctx.strokeStyle = colors.accent;
  for (const landed of state.landed) {
    if (landed.bottle) drawRing(ctx, landed.bottle.x, neckY(landed.bottle));
  }

  // Where the next ring will land.
  if (state.phase === 'playing' && !state.ring && state.rings > 0) {
    const y = landingY(state.power);
    ctx.strokeStyle = colors.text;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(THROWER.x, THROWER.y);
    ctx.lineTo(aimX, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(aimX, y, 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (state.ring) {
    const { x, y } = ringPosition(state.ring);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    drawRing(ctx, x, y);
  }

  // Counter at the front of the booth.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, HEIGHT - 70, WIDTH, 12);

  // Power meter.
  const meter = { x: WIDTH - 40, y: 80, width: 16, height: 280 };
  ctx.fillStyle = colors.surface;
  ctx.fillRect(meter.x, meter.y, meter.width, meter.height);
  ctx.fillStyle = colors.danger;
  const filled = meter.height * state.power;
  ctx.fillRect(meter.x, meter.y + meter.height - filled, meter.width, filled);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);

    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    // Play again is the primary button: filled with the accent colour.
    const primary = ROUND_OVER_BUTTONS.playAgain;
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.roundRect(primary.x, primary.y, primary.width, primary.height, theme.radius);
    ctx.fill();
    ctx.fillStyle = colors.background;
    ctx.font = canvasFont('body', 'bold');
    ctx.fillText(primary.label, primary.x + primary.width / 2, primary.y + primary.height / 2);

    // Back to the midway is secondary: outlined, with quieter text.
    const secondary = ROUND_OVER_BUTTONS.midway;
    ctx.strokeStyle = colors.muted;
    ctx.beginPath();
    ctx.roundRect(secondary.x, secondary.y, secondary.width, secondary.height, theme.radius);
    ctx.stroke();
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('body');
    ctx.fillText(
      secondary.label,
      secondary.x + secondary.width / 2,
      secondary.y + secondary.height / 2,
    );
    ctx.textBaseline = 'alphabetic';
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let aimX = WIDTH / 2;

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => {
      aimX = toCanvas(event).x;
    };
    const onDown = (event: PointerEvent) => {
      const point = toCanvas(event);
      aimX = point.x;
      if (state.phase === 'over') {
        const button = roundOverButtonAt(point.x, point.y);
        if (button === 'playAgain') {
          state = createState();
          scoreRecorded = false;
        } else if (button === 'midway') {
          location.hash = '#/';
        }
      } else {
        throwRing(state, aimX);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aimX);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
