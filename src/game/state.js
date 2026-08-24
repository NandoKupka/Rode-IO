import { clamp } from './math.js';
import { CANVAS, WORLD } from './theme.js';
import { DEFAULT_LOADOUT, resolveLoadout } from './equipment.js';

const LASSO_FLIGHT_DURATION = .48;
const LASSO_FALL_DURATION = .34;
const BULL_START_X = 24;
const COWBOY_START_X = WORLD.cowboyX;

export const ROUND_RULES = Object.freeze({
  cowboyDelay: .58,
  bullStartSpeed: 80,
  bullCruiseSpeed: 94,
  bullAcceleration: 34,
  playerMinSpeed: 16,
  playerDefaultSpeed: WORLD.cameraSpeed,
  playerMaxSpeed: 72,
  playerAcceleration: 56,
  playerTapDuration: .2,
  playerMovementInfluence: 1.8,
  playerMinX: COWBOY_START_X,
  playerMaxX: CANVAS.width - 48,
  playerVerticalMaxSpeed: 18,
  playerVerticalAcceleration: 48,
  playerVerticalFriction: 36,
  catchMinDistance: 34,
  catchLaneTolerance: 20,
  caughtResultDelay: .85,
});

function newLasso() {
  return {
    mode: 'ready',
    progress: 0,
    willCatch: null,
    releaseAngle: null,
    releaseDistance: null,
    maxRange: null,
    withinRange: null,
    dragDistance: 0,
    dragTime: 0,
  };
}

export function createGameState() {
  return {
    cameraX: 0,
    score: { attempts: 0, hits: 0 },
    equipment: { ...DEFAULT_LOADOUT },
    round: {
      number: 1,
      status: 'running',
      elapsed: 0,
      attempts: 0,
      hits: 0,
      caughtTimer: null,
    },
    cowboy: {
      x: COWBOY_START_X,
      y: WORLD.cowboyBaseY,
      targetY: WORLD.cowboyBaseY,
      verticalSpeed: 0,
      speed: ROUND_RULES.playerDefaultSpeed,
      frame: 0,
      frameTimer: 0,
      lassoAngle: 0,
      lasso: newLasso(),
    },
    bull: {
      worldX: BULL_START_X,
      screenX: BULL_START_X,
      y: 108,
      speed: ROUND_RULES.bullStartSpeed,
      frame: 0,
      frameTimer: .1,
    },
  };
}

export function resetRound(state, { number = state.round.number + 1, resetScore = false } = {}) {
  if (resetScore) state.score = { attempts: 0, hits: 0 };
  state.cameraX = 0;
  state.round = {
    number,
    status: 'running',
    elapsed: 0,
    attempts: 0,
    hits: 0,
    caughtTimer: null,
  };
  Object.assign(state.cowboy, {
    x: COWBOY_START_X,
    y: WORLD.cowboyBaseY,
    targetY: WORLD.cowboyBaseY,
    verticalSpeed: 0,
    speed: ROUND_RULES.playerDefaultSpeed,
    frame: 0,
    frameTimer: 0,
    lassoAngle: 0,
    lasso: newLasso(),
  });
  Object.assign(state.bull, {
    worldX: BULL_START_X,
    screenX: BULL_START_X,
    y: 108,
    speed: ROUND_RULES.bullStartSpeed,
    frame: 0,
    frameTimer: .1,
  });
}

function moveTowards(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

function getControlVector(input) {
  const horizontal = ((input.right || input.rightPressed) ? 1 : 0) -
    ((input.left || input.leftPressed) ? 1 : 0);
  const vertical = ((input.down || input.downPressed) ? 1 : 0) -
    ((input.up || input.upPressed) ? 1 : 0);
  const magnitude = Math.hypot(horizontal, vertical);
  const divisor = Math.max(magnitude, 1);
  return {
    x: horizontal / divisor,
    y: vertical / divisor,
    tapped: Boolean(
      input.upPressed || input.downPressed || input.leftPressed || input.rightPressed
    ),
  };
}

function updateRace(state, input, delta) {
  const { round, cowboy, bull } = state;
  const previousElapsed = round.elapsed;
  round.elapsed += delta;

  bull.speed = Math.min(
    bull.speed + ROUND_RULES.bullAcceleration * delta,
    ROUND_RULES.bullCruiseSpeed,
  );
  bull.worldX += bull.speed * delta;

  const ridingDelta = Math.max(
    round.elapsed - Math.max(previousElapsed, ROUND_RULES.cowboyDelay),
    0,
  );
  if (ridingDelta > 0) {
    const direction = getControlVector(input);
    const movementDelta = direction.tapped
      ? Math.max(ridingDelta, ROUND_RULES.playerTapDuration)
      : ridingDelta;
    if (direction.x) {
      cowboy.speed = clamp(
        cowboy.speed + direction.x * ROUND_RULES.playerAcceleration * movementDelta,
        ROUND_RULES.playerMinSpeed,
        ROUND_RULES.playerMaxSpeed,
      );
    }

    if (direction.y) {
      cowboy.verticalSpeed = moveTowards(
        cowboy.verticalSpeed,
        direction.y * ROUND_RULES.playerVerticalMaxSpeed,
        ROUND_RULES.playerVerticalAcceleration * Math.abs(direction.y) * movementDelta,
      );
    } else {
      cowboy.verticalSpeed = moveTowards(
        cowboy.verticalSpeed,
        0,
        ROUND_RULES.playerVerticalFriction * ridingDelta,
      );
    }
    state.cameraX += WORLD.cameraSpeed * ridingDelta;

    cowboy.x = clamp(
      cowboy.x +
      (cowboy.speed - ROUND_RULES.playerDefaultSpeed) *
      ROUND_RULES.playerMovementInfluence * movementDelta,
      ROUND_RULES.playerMinX,
      ROUND_RULES.playerMaxX,
    );

    const nextY = cowboy.y + cowboy.verticalSpeed * movementDelta;
    cowboy.y = clamp(
      nextY,
      WORLD.cowboyBaseY - WORLD.laneOffset,
      WORLD.cowboyBaseY + WORLD.laneOffset,
    );
    if (cowboy.y !== nextY) cowboy.verticalSpeed = 0;
    cowboy.targetY = cowboy.y;
  }

  bull.screenX = bull.worldX - state.cameraX;
}

function getThrowEligibility(state) {
  const horizontalDistance = state.bull.screenX - state.cowboy.x;
  const laneDistance = Math.abs(state.bull.y - state.cowboy.y);
  const distance = Math.hypot(horizontalDistance, laneDistance);
  const { lasso } = resolveLoadout(state.equipment);
  const withinRange = horizontalDistance >= ROUND_RULES.catchMinDistance &&
    distance <= lasso.maxRange &&
    laneDistance <= ROUND_RULES.catchLaneTolerance;
  return { distance, lasso, withinRange };
}

function startThrow(state, random) {
  const { cowboy, round } = state;
  const eligibility = getThrowEligibility(state);
  cowboy.lasso.mode = 'throwing';
  cowboy.lasso.progress = 0;
  cowboy.lasso.withinRange = eligibility.withinRange;
  cowboy.lasso.releaseDistance = eligibility.distance;
  cowboy.lasso.maxRange = eligibility.lasso.maxRange;
  cowboy.lasso.willCatch = eligibility.withinRange && random() < .5;
  cowboy.lasso.releaseAngle = cowboy.lassoAngle;
  round.attempts += 1;
  state.score.attempts += 1;
}

function updateLasso(state, input, delta, random) {
  const { cowboy, round } = state;
  const { lasso } = cowboy;

  if (input.lassoPressed && round.elapsed >= ROUND_RULES.cowboyDelay) {
    if (lasso.mode === 'ready') {
      lasso.mode = 'spinning';
      lasso.progress = 0;
    } else if (lasso.mode === 'spinning') {
      startThrow(state, random);
    }
  }

  const turnsPerSecond = {
    spinning: 1.35,
    throwing: 1.8,
    falling: 1.05,
  }[lasso.mode] ?? 0;
  if (turnsPerSecond) {
    cowboy.lassoAngle = (cowboy.lassoAngle + delta * Math.PI * 2 * turnsPerSecond) % (Math.PI * 2);
  }

  if (lasso.mode === 'throwing') {
    lasso.progress = Math.min(lasso.progress + delta / LASSO_FLIGHT_DURATION, 1);
    if (lasso.progress === 1) {
      lasso.progress = 0;
      if (lasso.willCatch) {
        lasso.mode = 'caught';
        round.hits += 1;
        state.score.hits += 1;
        round.caughtTimer = 0;
      } else {
        lasso.mode = 'falling';
      }
    }
  } else if (lasso.mode === 'falling') {
    lasso.progress = Math.min(lasso.progress + delta / LASSO_FALL_DURATION, 1);
    if (lasso.progress === 1) cowboy.lasso = newLasso();
  }
}

function updateAnimation(state, delta) {
  const { cowboy, bull } = state;
  cowboy.frameTimer += delta;
  bull.frameTimer += delta;
  if (cowboy.frameTimer > .14) {
    cowboy.frame = (cowboy.frame + 1) % 4;
    cowboy.frameTimer = 0;
  }
  if (bull.frameTimer > .12) {
    bull.frame = (bull.frame + 1) % 4;
    bull.frameTimer = 0;
  }
}

export function updateGame(state, input, delta, random = Math.random) {
  if (state.round.status !== 'running') return;

  updateRace(state, input, delta);

  updateLasso(state, input, delta, random);
  updateAnimation(state, delta);

  if (state.round.caughtTimer !== null) {
    state.round.caughtTimer += delta;
    if (state.round.caughtTimer >= ROUND_RULES.caughtResultDelay) state.round.status = 'complete';
  } else if (state.bull.screenX > CANVAS.width + 18) {
    state.round.status = 'complete';
  }
}
