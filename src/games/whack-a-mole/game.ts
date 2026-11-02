import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_MOLE = 10;
export const MOLE_RADIUS = 38;
const COLUMNS = 3;
const ROWS = 3;
const GRID_TOP = 130;
const ROW_GAP = 115;

/** Seconds between pop-ups, from the start of the round to the end. */
export const POP_INTERVAL = { start: 1.0, end: 0.35 } as const;
/** Seconds a mole stays up, from the start of the round to the end. */
export const UP_TIME = { start: 1.4, end: 0.6 } as const;

export interface Hole {
  x: number;
  y: number;
  /** Seconds left before the mole drops back down; 0 means no mole. */
  up: number;
  /** Seconds since this hole's mole was whacked, for the bonk effect; -1 when none. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const spacing = WIDTH / COLUMNS;
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      holes.push({
        x: spacing * column + spacing / 2,
        y: GRID_TOP + row * ROW_GAP,
        up: 0,
        bonk: -1,
      });
    }
  }
  return { holes, timeLeft: ROUND_SECONDS, nextPop: 0.5, score: 0, phase: 'playing' };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

/** Seconds until the next pop-up: shorter as the round goes on. */
export function popInterval(state: WhackAMoleState): number {
  return POP_INTERVAL.start + (POP_INTERVAL.end - POP_INTERVAL.start) * progress(state);
}

/** Seconds a new mole stays up: shorter as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return UP_TIME.start + (UP_TIME.end - UP_TIME.start) * progress(state);
}

/** True when a canvas point lands on the visible part of a mole that is up. */
export function isHit(hole: Hole, x: number, y: number): boolean {
  // drawMole clips the mole at the hole's rim, so nothing below hole.y is mole.
  return (
    hole.up > 0 &&
    y <= hole.y &&
    Math.hypot(x - hole.x, y - (hole.y - MOLE_RADIUS / 2)) <= MOLE_RADIUS
  );
}

/** Whacks the mole at a canvas point, if one is up there. Returns true on a hit. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isHit(h, x, y));
  if (!hole) return false;
  hole.up = 0;
  hole.bonk = 0;
  state.score += POINTS_PER_MOLE;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` returns a number in [0, 1) and
 * picks which empty hole the next mole pops out of.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random) {
  for (const hole of state.holes) {
    if (hole.bonk >= 0) {
      hole.bonk += dt;
      if (hole.bonk >= 0.3) hole.bonk = -1;
    }
  }
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  if (state.timeLeft === 0) {
    state.phase = 'over';
    for (const hole of state.holes) hole.up = 0;
    return;
  }

  for (const hole of state.holes) hole.up = Math.max(hole.up - dt, 0);

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    const empty = state.holes.filter((h) => h.up === 0 && h.bonk < 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.up = upTime(state);
    }
    state.nextPop = popInterval(state);
  }
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

function drawMole(ctx: CanvasRenderingContext2D, hole: Hole) {
  const { colors } = theme;
  const cx = hole.x;
  const cy = hole.y - MOLE_RADIUS / 2;

  // Clip to above the hole's rim so the mole looks like it rises out of it.
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - MOLE_RADIUS - 4, cy - MOLE_RADIUS - 4, MOLE_RADIUS * 2 + 8, MOLE_RADIUS * 1.5 + 4);
  ctx.clip();

  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.arc(cx, cy, MOLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(cx - 13, cy - 10, 5, 0, Math.PI * 2);
  ctx.arc(cx + 13, cy - 10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.arc(cx, cy + 4, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.fillRect(cx - 6, cy + 13, 5, 7);
  ctx.fillRect(cx + 1, cy + 13, 5, 7);
  ctx.restore();
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, MOLE_RADIUS + 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) drawMole(ctx, hole);

    if (hole.bonk >= 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - hole.bonk / 0.3;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y - MOLE_RADIUS / 2, 12 + hole.bonk * 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);

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

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as the clock runs.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onDown = (event: PointerEvent) => {
      const point = toCanvas(event);
      if (state.phase === 'over') {
        const button = roundOverButtonAt(point.x, point.y);
        if (button === 'playAgain') {
          state = createState();
          scoreRecorded = false;
        } else if (button === 'midway') {
          location.hash = '#/';
        }
      } else {
        whack(state, point.x, point.y);
      }
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
