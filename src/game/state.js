import { clamp } from './math.js';
import { CANVAS, WORLD } from './theme.js';
import {
  COWBOY_LEVEL,
  DEFAULT_LOADOUT,
  DEFAULT_OWNED_LASSO_IDS,
  getBoleioPresses,
  getCowboyStamina,
  getLassoAimRadius,
  INFINITE_MONEY,
  resolveLoadout,
} from './equipment.js';

const LASSO_FLIGHT_DURATION = .48;
const LASSO_FALL_DURATION = .34;
const LASSO_INITIAL_TRAIL = 26;
const LASSO_MAX_TRAIL = 72;
const LASSO_REEL_SPEED = 120;
const BULL_START_X = 24;
const COWBOY_START_X = WORLD.cowboyX;
const BULL_SPEED_MULTIPLIER = .8;

export const AIM_RULES = Object.freeze({
  fadeDistance: 5.25,
  minTolerance: 1,
  maxTolerance: 5,
  defaultTolerance: 3,
  toleranceFadeStep: 1.5,
  chanceFalloff: 1.25,
  ellipseAspect: .544,
  knotOrbitRate: Math.PI * 2 * 1.5,
  visualScale: 2,
  pulseDepth: .16,
  pulseRate: 4.2,
  startupDuration: .6,
  stabilityTransitionSpeed: 5,
});

export const BOLEIO_RULES = Object.freeze({
  startupDuration: .18,
  minTurnsPerSecond: .12,
  preAccelerationTurnsPerSecond: .24,
  accelerationThreshold: .7,
  maxTurnsPerSecond: 1.5,
  minAimScale: .08,
});

export const STABILITY_LEVELS = Object.freeze({
  '-1': Object.freeze({ wanderRadius: 17, movementRate: 3.1, horseBob: 2.7 }),
  0: Object.freeze({ wanderRadius: 15.5, movementRate: 2.75, horseBob: 2.35 }),
  1: Object.freeze({ wanderRadius: 14, movementRate: 2.4, horseBob: 2 }),
  2: Object.freeze({ wanderRadius: 12.5, movementRate: 1.95, horseBob: 1.6 }),
  3: Object.freeze({ wanderRadius: 11, movementRate: 1.55, horseBob: 1.25 }),
  4: Object.freeze({ wanderRadius: 9.5, movementRate: 1.15, horseBob: .9 }),
  5: Object.freeze({ wanderRadius: 8, movementRate: .75, horseBob: .6 }),
});

function getMaxVisibleTrail(cowboy) {
  return Math.min(
    LASSO_MAX_TRAIL,
    Math.max(cowboy.x + WORLD.lassoGroundLead - WORLD.lassoGroundMargin, 0),
  );
}

export const ROUND_RULES = Object.freeze({
  cowboyDelay: .58,
  bullStartSpeed: 80 * BULL_SPEED_MULTIPLIER,
  bullCruiseSpeed: 94 * BULL_SPEED_MULTIPLIER,
  bullAcceleration: 34 * BULL_SPEED_MULTIPLIER,
  playerMinSpeed: 16,
  playerDefaultSpeed: WORLD.cameraSpeed,
  playerMaxSpeed: 72,
  playerAcceleration: 48,
  playerBrakeDeceleration: 72,
  playerCruiseRecovery: 18,
  playerTapDuration: .035,
  playerMovementInfluence: 1.8,
  playerMinX: COWBOY_START_X,
  playerMaxX: CANVAS.width - 48,
  playerVerticalMaxSpeed: 18,
  playerVerticalAcceleration: 48,
  playerVerticalFriction: 36,
  caughtResultDelay: .85,
});

function newLasso() {
  return {
    mode: 'ready',
    progress: 0,
    boleioPresses: 0,
    requiredBoleioPresses: null,
    throwReady: false,
    spinStartupElapsed: 0,
    willCatch: null,
    releaseAngle: null,
    releaseDistance: null,
    releaseChance: null,
    maxRange: null,
    withinRange: null,
    wellAimed: null,
    releaseAimX: null,
    releaseAimY: null,
    dragDistance: 0,
    dragTime: 0,
    autoReel: false,
  };
}

export function createGameState() {
  return {
    cameraX: 0,
    score: { attempts: 0, hits: 0 },
    equipment: { ...DEFAULT_LOADOUT },
    settings: { aimTolerance: AIM_RULES.defaultTolerance },
    inventory: {
      money: INFINITE_MONEY,
      ownedLassoIds: [...DEFAULT_OWNED_LASSO_IDS],
    },
    round: {
      number: 1,
      status: 'running',
      elapsed: 0,
      attempts: 0,
      hits: 0,
      caughtTimer: null,
    },
    cowboy: {
      level: COWBOY_LEVEL,
      stamina: getCowboyStamina(COWBOY_LEVEL),
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
    aim: newAim(),
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
  state.aim = newAim();
}

function moveTowards(value, target, amount) {
  if (value < target) return Math.min(value + amount, target);
  return Math.max(value - amount, target);
}

function newAim() {
  return {
    offsetX: 0,
    offsetY: 0,
    ellipseRadiusX: 0,
    ellipseRadiusY: 0,
    baseEllipseRadiusX: 0,
    baseEllipseRadiusY: 0,
    knotOrbitAngle: 0,
    elapsed: 0,
    phaseX: 0,
    phaseY: 0,
    rateVariation: 1,
    motionTime: 0,
    effectiveStability: null,
    initialized: false,
  };
}

export function getHorseSpeedMultiplier(horse) {
  return .7 + horse.speedStars * .1;
}

function getStabilityLevel(horseOrLevel) {
  const level = typeof horseOrLevel === 'number'
    ? horseOrLevel
    : horseOrLevel.stabilityStars;
  return clamp(level, -1, 5);
}

function getStabilityTuning(horseOrLevel) {
  const level = getStabilityLevel(horseOrLevel);
  const lowerLevel = Math.floor(level);
  const upperLevel = Math.ceil(level);
  const lower = STABILITY_LEVELS[lowerLevel];
  const upper = STABILITY_LEVELS[upperLevel];
  const progress = level - lowerLevel;
  return {
    wanderRadius: lower.wanderRadius + (upper.wanderRadius - lower.wanderRadius) * progress,
    movementRate: lower.movementRate + (upper.movementRate - lower.movementRate) * progress,
    horseBob: lower.horseBob + (upper.horseBob - lower.horseBob) * progress,
  };
}

export function getAimWanderRadius(horseOrLevel) {
  return getStabilityTuning(horseOrLevel).wanderRadius;
}

export function getAimMovementRate(horseOrLevel) {
  return getStabilityTuning(horseOrLevel).movementRate;
}

export function getEffectiveStabilityLevel(horse, input = {}) {
  const accelerating = Boolean(input.right || input.rightPressed) &&
    !Boolean(input.left || input.leftPressed);
  return clamp(horse.stabilityStars - (accelerating ? 2 : 0), -1, 5);
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
  const { horse } = resolveLoadout(state.equipment);
  const speedMultiplier = getHorseSpeedMultiplier(horse);
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
    const pacingCaughtBull = cowboy.lasso.mode === 'caught';
    const controlDelta = direction.tapped
      ? Math.max(ridingDelta, ROUND_RULES.playerTapDuration)
      : ridingDelta;
    if (pacingCaughtBull) {
      cowboy.speed = bull.speed;
    } else if (direction.x) {
      const speedChange = direction.x > 0
        ? ROUND_RULES.playerAcceleration
        : ROUND_RULES.playerBrakeDeceleration;
      cowboy.speed = clamp(
        cowboy.speed + direction.x * speedChange * speedMultiplier * controlDelta,
        ROUND_RULES.playerMinSpeed,
        ROUND_RULES.playerMaxSpeed,
      );
    } else {
      cowboy.speed = moveTowards(
        cowboy.speed,
        ROUND_RULES.playerDefaultSpeed,
        ROUND_RULES.playerCruiseRecovery * ridingDelta,
      );
    }

    if (direction.y) {
      cowboy.verticalSpeed = moveTowards(
        cowboy.verticalSpeed,
        direction.y * ROUND_RULES.playerVerticalMaxSpeed,
        ROUND_RULES.playerVerticalAcceleration * Math.abs(direction.y) * controlDelta,
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
      (cowboy.speed - ROUND_RULES.playerDefaultSpeed) * ridingDelta *
      (pacingCaughtBull ? 1 : ROUND_RULES.playerMovementInfluence),
      ROUND_RULES.playerMinX,
      ROUND_RULES.playerMaxX,
    );

    const nextY = cowboy.y + cowboy.verticalSpeed * ridingDelta;
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

function updateAim(state, input, delta, random) {
  if (delta <= 0) return;
  const { horse } = resolveLoadout(state.equipment);
  const aim = state.aim;
  const targetStability = getEffectiveStabilityLevel(horse, input);
  if (aim.effectiveStability === null) aim.effectiveStability = horse.stabilityStars;
  aim.effectiveStability = moveTowards(
    aim.effectiveStability,
    targetStability,
    AIM_RULES.stabilityTransitionSpeed * delta,
  );
  if (!aim.initialized) {
    aim.phaseX = random() * Math.PI * 2;
    aim.phaseY = random() * Math.PI * 2;
    aim.rateVariation = .88 + random() * .24;
    aim.initialized = true;
  }

  aim.elapsed += delta;
  const tuning = getStabilityTuning(aim.effectiveStability);
  const radius = tuning.wanderRadius;
  const rate = tuning.movementRate * aim.rateVariation;
  aim.motionTime += rate * delta;
  const startupProgress = clamp(aim.elapsed / AIM_RULES.startupDuration, 0, 1);
  const startupBlend = startupProgress ** 2 * (3 - 2 * startupProgress);
  const time = aim.motionTime;
  const gallopTime = aim.elapsed * Math.PI * 2 / .56;
  const horseSwayX = Math.sin(gallopTime + Math.PI / 3) * tuning.horseBob * .2;
  const horseBobY = Math.sin(gallopTime) * tuning.horseBob;
  aim.offsetX = radius * startupBlend * (
    Math.sin(time + aim.phaseX) * .78 +
    Math.sin(time * .41 + aim.phaseY) * .22
  ) + horseSwayX * startupBlend;
  aim.offsetY = radius * .12 * startupBlend *
    Math.sin(time * .63 + aim.phaseY) + horseBobY * startupBlend;

  const { lasso } = resolveLoadout(state.equipment);
  const pulse = 1 + Math.sin(
    aim.elapsed * AIM_RULES.pulseRate + aim.phaseX,
  ) * AIM_RULES.pulseDepth;
  aim.baseEllipseRadiusX = getLassoAimRadius(lasso) * pulse;
  aim.baseEllipseRadiusY = aim.baseEllipseRadiusX * AIM_RULES.ellipseAspect;
  aim.ellipseRadiusX = aim.baseEllipseRadiusX;
  aim.ellipseRadiusY = aim.baseEllipseRadiusY;
  aim.knotOrbitAngle = aim.elapsed * AIM_RULES.knotOrbitRate + aim.phaseY * .12;
}

function getThrowEligibility(state) {
  const cowboyX = state.cowboy.x ?? WORLD.cowboyX;
  const cowboyY = state.cowboy.y ?? WORLD.cowboyBaseY;
  const bullX = state.bull.screenX ?? WORLD.bullX;
  const bullY = state.bull.y ?? 108;
  const aim = state.aim ?? { offsetX: 0, offsetY: 0 };
  const horizontalDistance = bullX - cowboyX;
  const verticalDistance = Math.abs(bullY - cowboyY);
  const distance = Math.hypot(horizontalDistance, verticalDistance);
  const { lasso } = resolveLoadout(state.equipment);
  const aimError = Math.hypot(aim.offsetX, aim.offsetY);
  const ellipseRadiusX = aim.ellipseRadiusX || getLassoAimRadius(lasso);
  const ellipseRadiusY = aim.ellipseRadiusY || ellipseRadiusX * AIM_RULES.ellipseAspect;
  const normalizedEllipseDistance = Math.hypot(
    aim.offsetX / ellipseRadiusX,
    aim.offsetY / ellipseRadiusY,
  );
  const boundaryRadius = normalizedEllipseDistance > 0
    ? aimError / normalizedEllipseDistance
    : Math.min(ellipseRadiusX, ellipseRadiusY);
  const tolerance = clamp(
    state.settings?.aimTolerance ?? AIM_RULES.defaultTolerance,
    AIM_RULES.minTolerance,
    AIM_RULES.maxTolerance,
  );
  const toleranceOffset = tolerance - AIM_RULES.defaultTolerance;
  const fadeDistance = AIM_RULES.fadeDistance +
    toleranceOffset * AIM_RULES.toleranceFadeStep;
  const fadeRadius = boundaryRadius + fadeDistance;
  const wellAimed = normalizedEllipseDistance <= 1;
  const withinRange = horizontalDistance > 0 && distance <= lasso.maxRange;
  return {
    aimError,
    boundaryRadius,
    distance,
    ellipseRadiusX,
    ellipseRadiusY,
    fadeRadius,
    lasso,
    normalizedEllipseDistance,
    wellAimed,
    withinRange,
  };
}

function getChanceFromEligibility(eligibility) {
  if (!eligibility.withinRange || eligibility.aimError >= eligibility.fadeRadius) return 0;
  if (eligibility.normalizedEllipseDistance <= 1) return 1;
  const fadeProgress = (
    eligibility.aimError - eligibility.boundaryRadius
  ) / (
    eligibility.fadeRadius - eligibility.boundaryRadius
  );
  return (1 - fadeProgress) ** AIM_RULES.chanceFalloff;
}

export function getAimChance(state) {
  return getChanceFromEligibility(getThrowEligibility(state));
}

function mixChannel(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

export function getAimColor(chance) {
  const amount = clamp(chance, 0, 1);
  const red = [199, 70, 59];
  const yellow = [239, 202, 75];
  const green = [98, 186, 83];
  const start = amount < .5 ? red : yellow;
  const end = amount < .5 ? yellow : green;
  const progress = amount < .5 ? amount * 2 : (amount - .5) * 2;
  return `rgb(${mixChannel(start[0], end[0], progress)}, ${mixChannel(start[1], end[1], progress)}, ${mixChannel(start[2], end[2], progress)})`;
}

export function getAimStatus(state) {
  const chance = getAimChance(state);
  if (chance === 0) return 'red';
  return chance === 1 ? 'green' : 'yellow';
}

function startThrow(state, random) {
  const { cowboy, round } = state;
  const eligibility = getThrowEligibility(state);
  const releaseChance = getChanceFromEligibility(eligibility);
  cowboy.lasso.mode = 'throwing';
  cowboy.lasso.progress = 0;
  cowboy.lasso.withinRange = eligibility.withinRange;
  cowboy.lasso.wellAimed = eligibility.wellAimed;
  cowboy.lasso.releaseAimX = state.aim.offsetX;
  cowboy.lasso.releaseAimY = state.aim.offsetY;
  cowboy.lasso.releaseDistance = eligibility.distance;
  cowboy.lasso.releaseChance = releaseChance;
  cowboy.lasso.maxRange = eligibility.lasso.maxRange;
  cowboy.lasso.willCatch = releaseChance === 1 ||
    (releaseChance > 0 && random() < releaseChance);
  cowboy.lasso.releaseAngle = cowboy.lassoAngle;
  round.attempts += 1;
  state.score.attempts += 1;
}

function startSpinning(state) {
  const { lasso: equippedLasso } = resolveLoadout(state.equipment);
  state.cowboy.stamina = getCowboyStamina(state.cowboy.level);
  const requiredBoleioPresses = getBoleioPresses(equippedLasso, state.cowboy.stamina);
  Object.assign(state.cowboy.lasso, {
    mode: 'spinning',
    progress: 0,
    boleioPresses: 1,
    requiredBoleioPresses,
    throwReady: requiredBoleioPresses === 1,
    spinStartupElapsed: 0,
  });
}

function continueSpinning(lasso) {
  if (lasso.throwReady) return;
  lasso.boleioPresses = Math.min(lasso.boleioPresses + 1, lasso.requiredBoleioPresses);
  lasso.throwReady = lasso.boleioPresses === lasso.requiredBoleioPresses;
}

function getBoleioTurnsPerSecond(lasso) {
  const totalSteps = Math.max(lasso.requiredBoleioPresses - 1, 1);
  const accelerationProgress = clamp((lasso.boleioPresses - 1) / totalSteps, 0, 1);
  if (accelerationProgress <= BOLEIO_RULES.accelerationThreshold) {
    const slowProgress = accelerationProgress / BOLEIO_RULES.accelerationThreshold;
    return BOLEIO_RULES.minTurnsPerSecond +
      (BOLEIO_RULES.preAccelerationTurnsPerSecond - BOLEIO_RULES.minTurnsPerSecond) * slowProgress;
  }

  const lateProgress = (
    (accelerationProgress - BOLEIO_RULES.accelerationThreshold) /
    (1 - BOLEIO_RULES.accelerationThreshold)
  );
  const easedAcceleration = lateProgress ** 2;
  return BOLEIO_RULES.preAccelerationTurnsPerSecond +
    (BOLEIO_RULES.maxTurnsPerSecond - BOLEIO_RULES.preAccelerationTurnsPerSecond) * easedAcceleration;
}

function updateBoleioAimSize(state) {
  const { lasso: equippedLasso } = resolveLoadout(state.equipment);
  const { lasso } = state.cowboy;
  const totalSteps = Math.max(lasso.requiredBoleioPresses - 1, 1);
  const progress = clamp((lasso.boleioPresses - 1) / totalSteps, 0, 1);
  const scale = BOLEIO_RULES.minAimScale + (1 - BOLEIO_RULES.minAimScale) * progress;
  const baseRadiusX = state.aim.baseEllipseRadiusX ||
    state.aim.ellipseRadiusX || getLassoAimRadius(equippedLasso);
  const baseRadiusY = state.aim.baseEllipseRadiusY ||
    state.aim.ellipseRadiusY || baseRadiusX * AIM_RULES.ellipseAspect;
  if (!state.aim.baseEllipseRadiusX) state.aim.baseEllipseRadiusX = baseRadiusX;
  if (!state.aim.baseEllipseRadiusY) state.aim.baseEllipseRadiusY = baseRadiusY;
  state.aim.ellipseRadiusX = baseRadiusX * scale;
  state.aim.ellipseRadiusY = baseRadiusY * scale;
}

function updateLasso(state, input, delta, random, riderTravel) {
  const { cowboy, round } = state;
  const { lasso } = cowboy;

  if (input.boleioPressed && round.elapsed >= ROUND_RULES.cowboyDelay) {
    if (lasso.mode === 'ready') {
      startSpinning(state);
    } else if (lasso.mode === 'spinning') {
      continueSpinning(lasso);
    }
  }

  if (input.lassoPressed && round.elapsed >= ROUND_RULES.cowboyDelay &&
      lasso.mode === 'spinning' && lasso.throwReady) {
    startThrow(state, random);
  }

  if (lasso.mode === 'spinning') {
    lasso.spinStartupElapsed = Math.min(
      lasso.spinStartupElapsed + delta,
      BOLEIO_RULES.startupDuration,
    );
  }

  const turnsPerSecond = lasso.mode === 'spinning'
    ? getBoleioTurnsPerSecond(lasso)
    : ({ throwing: 1.8, falling: 1.05 }[lasso.mode] ?? 0);
  if (turnsPerSecond) {
    cowboy.lassoAngle = (cowboy.lassoAngle + delta * Math.PI * 2 * turnsPerSecond) % (Math.PI * 2);
  }
  if (lasso.mode === 'spinning') {
    state.aim.knotOrbitAngle = cowboy.lassoAngle;
    updateBoleioAimSize(state);
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
        lasso.dragDistance = Math.min(LASSO_INITIAL_TRAIL, getMaxVisibleTrail(cowboy));
        lasso.dragTime = 0;
      }
    }
  } else if (lasso.mode === 'falling') {
    lasso.dragTime += delta;
    lasso.progress = Math.min(lasso.progress + delta / LASSO_FALL_DURATION, 1);
    if (lasso.progress === 1) {
      lasso.mode = 'dragging';
      lasso.progress = 0;
    }
  } else if (lasso.mode === 'dragging') {
    lasso.dragTime += delta;
    lasso.dragDistance = Math.min(
      lasso.dragDistance + Math.max(riderTravel, 0),
      getMaxVisibleTrail(cowboy),
    );
    if (input.reel || lasso.autoReel) lasso.mode = 'reeling';
  } else if (lasso.mode === 'reeling') {
    if (!input.reel && !lasso.autoReel) {
      lasso.mode = 'dragging';
    } else {
      lasso.dragTime += delta;
      const stretchedDistance = Math.min(
        lasso.dragDistance + Math.max(riderTravel, 0),
        getMaxVisibleTrail(cowboy),
      );
      lasso.dragDistance = Math.max(
        stretchedDistance - LASSO_REEL_SPEED * delta,
        0,
      );
      if (lasso.dragDistance === 0) cowboy.lasso = newLasso();
    }
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

  const previousRiderWorldX = state.cameraX + state.cowboy.x;
  updateRace(state, input, delta);
  updateAim(state, input, delta, random);
  const riderTravel = state.cameraX + state.cowboy.x - previousRiderWorldX;

  const bullFinished = state.bull.screenX > CANVAS.width + 18;
  if (bullFinished && ['falling', 'dragging', 'reeling'].includes(state.cowboy.lasso.mode)) {
    state.cowboy.lasso.autoReel = true;
  }

  updateLasso(state, input, delta, random, riderTravel);
  updateAnimation(state, delta);

  if (state.round.caughtTimer !== null) state.round.caughtTimer += delta;

  if (bullFinished &&
      !['falling', 'dragging', 'reeling'].includes(state.cowboy.lasso.mode)) {
    state.round.status = 'complete';
  }
}
