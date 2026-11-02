import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
/** The stream is an oval loop around a wooden island. */
export const STREAM = { x: WIDTH / 2, y: 280, rx: 300, ry: 140 } as const;
/** Radians per second; every duck floats round at the same pace. */
export const DUCK_SPEED = 0.5;
export const DUCK_RADIUS = 22;
/** The number on each duck's base, in the order they float. */
export const DUCK_VALUES = [1, 2, 3, 5, 10, 1, 2, 3];
/** Seconds the hook takes to go down, and to come back up. */
export const DROP_TIME = 0.35;
export const RAISE_TIME = 0.35;
/** How close the hook has to land to a duck's centre to catch it. */
export const CATCH_RADIUS = 26;
/** Where the rod hangs from: the hook starts and ends each cast here. */
export const ROD_Y = 50;

export interface Duck {
  /** Position round the stream, in radians. */
  angle: number;
  value: number;
  /** True while the duck is on the hook, out of the stream. */
  caught: boolean;
}

export interface Hook {
  /** Where the hook goes down to. */
  x: number;
  y: number;
  phase: 'dropping' | 'rising';
  /** Seconds into the current phase. */
  t: number;
  /** The index of the duck on the hook, if it caught one. */
  duck: number | null;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook | null;
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const spacing = (Math.PI * 2) / DUCK_VALUES.length;
  const ducks = DUCK_VALUES.map((value, i) => ({ angle: spacing * i, value, caught: false }));
  return { ducks, hook: null, casts: CASTS, score: 0, phase: 'playing' };
}

/** Where a duck floats on the canvas. */
export function duckPosition(duck: Duck): { x: number; y: number } {
  return {
    x: STREAM.x + STREAM.rx * Math.cos(duck.angle),
    y: STREAM.y + STREAM.ry * Math.sin(duck.angle),
  };
}

/** The index of the free duck closest to a point within the catch radius, or null. */
export function duckAt(state: HookADuckState, x: number, y: number): number | null {
  let best: number | null = null;
  let bestDistance = CATCH_RADIUS;
  state.ducks.forEach((duck, i) => {
    if (duck.caught) return;
    const pos = duckPosition(duck);
    const distance = Math.hypot(pos.x - x, pos.y - y);
    if (distance <= bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

/** Lowers the hook towards a point. Returns false if nothing was cast. */
export function cast(state: HookADuckState, x: number, y: number): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook) return false;
  state.hook = { x, y: Math.max(y, ROD_Y), phase: 'dropping', t: 0, duck: null };
  state.casts -= 1;
  return true;
}

/** Where the hook is now, in canvas pixels. */
export function hookPosition(hook: Hook): { x: number; y: number } {
  const progress =
    hook.phase === 'dropping'
      ? Math.min(hook.t / DROP_TIME, 1)
      : 1 - Math.min(hook.t / RAISE_TIME, 1);
  return { x: hook.x, y: ROD_Y + (hook.y - ROD_Y) * progress };
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    if (!duck.caught) duck.angle = (duck.angle + DUCK_SPEED * dt) % (Math.PI * 2);
  }

  const hook = state.hook;
  if (hook) {
    hook.t += dt;
    if (hook.phase === 'dropping' && hook.t >= DROP_TIME) {
      // The hook only catches what is under it when it reaches the water.
      const caught = duckAt(state, hook.x, hook.y);
      if (caught !== null) {
        state.ducks[caught].caught = true;
        state.score += state.ducks[caught].value;
        hook.duck = caught;
      }
      hook.phase = 'rising';
      hook.t = 0;
    } else if (hook.phase === 'rising' && hook.t >= RAISE_TIME) {
      // A caught duck goes back into the stream where it was hooked.
      if (hook.duck !== null) state.ducks[hook.duck].caught = false;
      state.hook = null;
    }
  }

  if (state.casts === 0 && !state.hook) state.phase = 'over';
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

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, value: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.6, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.danger;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.8);
  ctx.lineTo(x + DUCK_RADIUS * 1.35, y - DUCK_RADIUS * 0.65);
  ctx.lineTo(x + DUCK_RADIUS * 0.95, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(value), x - 2, y + 2);
  ctx.textBaseline = 'alphabetic';
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream, round a wooden island.
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 64;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx, STREAM.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(STREAM.x, STREAM.y, STREAM.rx - 40, STREAM.ry - 40, 0, 0, Math.PI * 2);
  ctx.fill();

  state.ducks.forEach((duck) => {
    if (duck.caught) return;
    const pos = duckPosition(duck);
    drawDuck(ctx, pos.x, pos.y, duck.value);
  });

  // Rod and line, hanging over the aim or the cast.
  const hook = state.hook ? hookPosition(state.hook) : { x: aim.x, y: ROD_Y };
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(hook.x, 0);
  ctx.lineTo(hook.x, ROD_Y - 6);
  ctx.stroke();
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y - 6);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hook.x - 6, hook.y, 6, 0, Math.PI);
  ctx.stroke();
  if (state.hook?.duck != null) {
    drawDuck(ctx, hook.x, hook.y + DUCK_RADIUS, state.ducks[state.hook.duck].value);
  }

  // Where the next cast will land.
  if (!state.hook && state.phase === 'playing') {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aim.x, Math.max(aim.y, ROD_Y), CATCH_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);

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

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Hook the rubber ducks as they float by. The number on each duck is its score.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: STREAM.y + STREAM.ry };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        const button = roundOverButtonAt(aim.x, aim.y);
        if (button === 'playAgain') {
          state = createState();
          scoreRecorded = false;
        } else if (button === 'midway') {
          location.hash = '#/';
        }
      } else {
        cast(state, aim.x, aim.y);
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
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
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

export default hookADuck;
