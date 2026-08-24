import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIM_RULES,
  createGameState,
  getAimChance,
  getAimColor,
  getAimStatus,
  getEffectiveStabilityLevel,
  getAimMovementRate,
  getAimWanderRadius,
  resetRound,
  ROUND_RULES,
  STABILITY_LEVELS,
  updateGame,
} from './state.js';
import { HORSES } from './equipment.js';
import { CANVAS, WORLD } from './theme.js';

const idleInput = Object.freeze({ up: false, down: false, left: false, right: false });

function runFor(state, seconds, input = idleInput) {
  const step = .02;
  for (let elapsed = 0; elapsed < seconds; elapsed += step) updateGame(state, input, step);
}

function prepareLasso(state, random = Math.random) {
  do {
    updateGame(state, { ...idleInput, boleioPressed: true }, 0, random);
  } while (!state.cowboy.lasso.throwReady);
}

function throwPreparedLasso(state, random = Math.random) {
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, random);
}

function throwAtDistance({ distance, lassoId = 'campestre', roll = .49 }) {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.equipment.lassoId = lassoId;
  state.bull.y = state.cowboy.y;
  state.bull.worldX = state.cameraX + state.cowboy.x + distance;
  state.bull.screenX = state.cowboy.x + distance;
  prepareLasso(state, () => roll);
  throwPreparedLasso(state, () => roll);
  return state;
}

test('starts both animals at the left and releases the bull before the horse', () => {
  const state = createGameState();
  const cowboyStartX = state.cowboy.x;

  assert.ok(state.bull.screenX < 30);
  assert.ok(state.cowboy.x < 20);
  updateGame(state, idleInput, ROUND_RULES.cowboyDelay / 2);

  assert.ok(state.bull.screenX > 40, 'the bull should already be crossing the arena');
  assert.equal(state.cowboy.x, cowboyStartX, 'the horse should still be waiting at the start');
  assert.equal(state.cameraX, 0, 'the camera should wait for the rider');

  runFor(state, ROUND_RULES.cowboyDelay);
  assert.equal(state.cowboy.x, cowboyStartX, 'the horse should stay fixed at its spawn point');
  assert.ok(state.cameraX > 0);
});

test('the bull crosses later at 80% speed while the scenery pace stays unchanged', () => {
  const state = createGameState();
  let elapsed = 0;

  while (state.round.status === 'running' && elapsed < 8) {
    updateGame(state, idleInput, .02);
    elapsed += .02;
  }

  assert.equal(state.round.status, 'complete');
  assert.ok(elapsed >= 6.4 && elapsed <= 7.2, `expected about 6.8 seconds, got ${elapsed}`);
  assert.ok(state.bull.screenX > CANVAS.width);
  assert.equal(ROUND_RULES.playerDefaultSpeed, WORLD.cameraSpeed);
});

test('right advances, left brakes, and released speed returns toward the default', () => {
  const regular = createGameState();
  const accelerated = createGameState();
  runFor(regular, 1.5);
  runFor(accelerated, 1.5, { ...idleInput, right: true });
  assert.equal(accelerated.cowboy.speed, ROUND_RULES.playerMaxSpeed);
  assert.equal(
    accelerated.cameraX,
    regular.cameraX,
    'accelerating the cowboy must not accelerate the whole scene',
  );
  assert.ok(accelerated.cowboy.x > regular.cowboy.x, 'the cowboy should advance along the track');
  assert.equal(
    accelerated.bull.screenX,
    regular.bull.screenX,
    'accelerating the cowboy must not move the bull or the scene',
  );

  const braking = createGameState();
  runFor(braking, 1.5, { ...idleInput, left: true });
  assert.ok(braking.cowboy.speed < WORLD.cameraSpeed);
  assert.equal(braking.cameraX, regular.cameraX, 'braking must not slow the whole scene');
  assert.ok(braking.cowboy.x <= regular.cowboy.x, 'braking should move the cowboy back');
  assert.equal(braking.bull.screenX, regular.bull.screenX, 'braking must not move the bull');

  const selectedSpeed = accelerated.cowboy.speed;
  const positionAtRelease = accelerated.cowboy.x;
  runFor(accelerated, .5, idleInput);
  assert.ok(accelerated.cowboy.speed < selectedSpeed);
  assert.ok(accelerated.cowboy.speed > ROUND_RULES.playerDefaultSpeed);
  assert.ok(accelerated.cowboy.x > positionAtRelease, 'the cowboy should coast forward while above cruise speed');
});

test('active braking is stronger than releasing acceleration', () => {
  const coasting = createGameState();
  const braking = createGameState();
  coasting.round.elapsed = ROUND_RULES.cowboyDelay;
  braking.round.elapsed = ROUND_RULES.cowboyDelay;
  coasting.cowboy.speed = 60;
  braking.cowboy.speed = 60;

  runFor(coasting, .25, idleInput);
  runFor(braking, .25, { ...idleInput, left: true });

  assert.ok(coasting.cowboy.speed < 60, 'releasing acceleration should slow the cowboy');
  assert.ok(coasting.cowboy.speed > ROUND_RULES.playerDefaultSpeed);
  assert.ok(braking.cowboy.speed < coasting.cowboy.speed, 'the back arrow should brake harder');
});

test('horse speed stars improve both acceleration and active braking', () => {
  const fastAcceleration = createGameState();
  const slowAcceleration = createGameState();
  fastAcceleration.equipment.horseId = 'trovao';
  slowAcceleration.equipment.horseId = 'areia';
  fastAcceleration.round.elapsed = ROUND_RULES.cowboyDelay;
  slowAcceleration.round.elapsed = ROUND_RULES.cowboyDelay;

  updateGame(fastAcceleration, { ...idleInput, right: true }, .2, () => .5);
  updateGame(slowAcceleration, { ...idleInput, right: true }, .2, () => .5);
  assert.ok(fastAcceleration.cowboy.speed > slowAcceleration.cowboy.speed);

  fastAcceleration.cowboy.speed = 60;
  slowAcceleration.cowboy.speed = 60;
  updateGame(fastAcceleration, { ...idleInput, left: true }, .2, () => .5);
  updateGame(slowAcceleration, { ...idleInput, left: true }, .2, () => .5);
  assert.ok(fastAcceleration.cowboy.speed < slowAcceleration.cowboy.speed);
});

test('stability stars reduce the crosshair area and movement speed', () => {
  const leastStable = HORSES.find(({ stabilityStars }) => stabilityStars === 1);
  const mostStable = HORSES.find(({ stabilityStars }) => stabilityStars === 5);
  assert.ok(getAimWanderRadius(mostStable) < getAimWanderRadius(leastStable));
  assert.ok(getAimMovementRate(mostStable) < getAimMovementRate(leastStable));
  assert.ok(
    getAimWanderRadius(leastStable) / getAimWanderRadius(mostStable) >= 1.75,
    'stability 1 should wander over a substantially larger area than stability 5',
  );
  assert.ok(
    getAimMovementRate(leastStable) / getAimMovementRate(mostStable) >= 3,
    'stability 1 should move at least three times faster than stability 5',
  );
  assert.ok(STABILITY_LEVELS[1].horseBob / STABILITY_LEVELS[5].horseBob >= 3);
  assert.deepEqual(Object.keys(STABILITY_LEVELS).filter((level) => Number(level) >= 1), ['1', '2', '3', '4', '5']);
  assert.ok(STABILITY_LEVELS[0]);
  assert.ok(STABILITY_LEVELS[-1]);
  assert.equal(getEffectiveStabilityLevel(leastStable, idleInput), 1);
  assert.equal(getEffectiveStabilityLevel(leastStable, { ...idleInput, right: true }), -1);

  const state = createGameState();
  state.equipment.horseId = leastStable.id;
  updateGame(state, idleInput, .02, () => 1);
  assert.equal(state.aim.effectiveStability, 1);
  updateGame(state, { ...idleInput, right: true }, .02, () => 1);
  assert.ok(state.aim.effectiveStability < 1 && state.aim.effectiveStability > -1);
  assert.ok(AIM_RULES.pulseDepth > 0);
});

test('the elliptical aim sweeps sideways, pulses, and moves its knot with lasso level', () => {
  const starter = createGameState();
  const advanced = createGameState();
  advanced.equipment.lassoId = 'ouro-velho';
  const starterRadii = [];
  const advancedRadii = [];
  const knotAngles = [];
  const horizontalOffsets = [];
  const verticalOffsets = [];

  for (let frame = 0; frame < 80; frame += 1) {
    updateGame(starter, idleInput, .02, () => 0);
    updateGame(advanced, idleInput, .02, () => 0);
    starterRadii.push(starter.aim.ellipseRadiusX);
    advancedRadii.push(advanced.aim.ellipseRadiusX);
    knotAngles.push(starter.aim.knotOrbitAngle);
    horizontalOffsets.push(Math.abs(starter.aim.offsetX));
    verticalOffsets.push(Math.abs(starter.aim.offsetY));
  }

  assert.ok(Math.max(...starterRadii) > Math.min(...starterRadii), 'the ellipse should pulse');
  assert.ok(Math.min(...advancedRadii) > Math.min(...starterRadii));
  assert.ok(Math.max(...advancedRadii) > Math.max(...starterRadii));
  assert.ok(starter.aim.ellipseRadiusY < starter.aim.ellipseRadiusX);
  assert.ok(knotAngles.at(-1) > knotAngles[0], 'the knot should orbit continuously');
  assert.ok(Math.max(...horizontalOffsets) > Math.max(...verticalOffsets) * 2);
});

test('the aim knot orbits at the same speed as the cowboy lasso while spinning', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  updateGame(state, idleInput, .02, () => .5);
  updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .5);
  const previousKnotAngle = state.aim.knotOrbitAngle;
  const previousLassoAngle = state.cowboy.lassoAngle;

  updateGame(state, idleInput, .1, () => .5);

  const knotRotation = state.aim.knotOrbitAngle - previousKnotAngle;
  const lassoRotation = state.cowboy.lassoAngle - previousLassoAngle;
  assert.ok(Math.abs(knotRotation - lassoRotation) < 1e-10);
});

test('speed below the default recovers smoothly after releasing the brake', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.cowboy.speed = 18;

  runFor(state, .25, idleInput);

  assert.ok(state.cowboy.speed > 18);
  assert.ok(state.cowboy.speed <= ROUND_RULES.playerDefaultSpeed);
});

test('the cowboy stays at the spawn until the player accelerates', () => {
  const state = createGameState();
  const startX = state.cowboy.x;

  runFor(state, 1);
  assert.equal(state.cowboy.x, startX);

  runFor(state, .5, { ...idleInput, right: true });
  assert.ok(state.cowboy.x > startX);
});

test('quick acceleration taps change pace gradually without jumping forward', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  const startX = state.cowboy.x;
  const startSpeed = state.cowboy.speed;

  for (let tap = 0; tap < 5; tap += 1) {
    updateGame(state, { ...idleInput, rightPressed: true }, 1 / 60);
    updateGame(state, idleInput, 1 / 60);
  }

  assert.ok(
    state.cowboy.speed - startSpeed <= 10,
    `five taps accelerated by ${state.cowboy.speed - startSpeed} km/h`,
  );
  assert.ok(
    state.cowboy.x - startX <= 2,
    `five taps jumped ${state.cowboy.x - startX}px`,
  );
});

test('vertical steering starts slowly instead of snapping between lanes', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  const startY = state.cowboy.y;

  updateGame(state, { ...idleInput, up: true }, .1);

  assert.ok(state.cowboy.y < startY);
  assert.ok(startY - state.cowboy.y <= 3, `vertical movement jumped ${startY - state.cowboy.y}px`);
  assert.ok(Math.abs(state.cowboy.verticalSpeed) <= ROUND_RULES.playerVerticalMaxSpeed);
});

test('normalizes simultaneous arrow input for smooth diagonal movement', () => {
  const vertical = createGameState();
  const diagonal = createGameState();
  vertical.round.elapsed = ROUND_RULES.cowboyDelay;
  diagonal.round.elapsed = ROUND_RULES.cowboyDelay;

  updateGame(vertical, { ...idleInput, up: true }, .2);
  updateGame(diagonal, { ...idleInput, up: true, right: true }, .2);

  assert.ok(diagonal.cowboy.x > WORLD.cowboyX);
  assert.ok(diagonal.cowboy.y < WORLD.cowboyBaseY);
  assert.ok(
    Math.abs(diagonal.cowboy.y - WORLD.cowboyBaseY) < Math.abs(vertical.cowboy.y - WORLD.cowboyBaseY),
    'the diagonal vector should split its strength across both axes',
  );
});

test('repeated A presses prepare the lasso and space launches only after it is released', () => {
  const state = createGameState();
  runFor(state, .7);

  assert.equal(state.cowboy.lasso.mode, 'ready');
  updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .49);
  assert.equal(state.cowboy.lasso.mode, 'spinning');
  assert.equal(state.cowboy.lasso.boleioPresses, 1);
  assert.equal(state.cowboy.lasso.requiredBoleioPresses, 12);
  assert.equal(state.cowboy.lasso.throwReady, false);
  assert.deepEqual(state.score, { attempts: 0, hits: 0 });

  updateGame(state, { ...idleInput, lassoPressed: true }, 0);
  assert.equal(state.cowboy.lasso.mode, 'spinning', 'space must be ignored before boleio is complete');
  assert.deepEqual(state.score, { attempts: 0, hits: 0 });

  for (let press = 2; press <= 12; press += 1) {
    updateGame(state, { ...idleInput, boleioPressed: true }, 0);
  }
  assert.equal(state.cowboy.lasso.throwReady, true);

  updateGame(state, { ...idleInput, lassoPressed: true }, 0);
  assert.equal(state.cowboy.lasso.mode, 'throwing');
  assert.deepEqual(state.score, { attempts: 1, hits: 0 });
});

test('boleio stays active without a timer after the first A press', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;

  updateGame(state, { ...idleInput, boleioPressed: true }, 0);
  runFor(state, 2);
  assert.equal(state.cowboy.lasso.mode, 'spinning');
  assert.equal(state.cowboy.lasso.boleioPresses, 1);
  assert.equal(state.cowboy.lasso.throwReady, false);
  assert.deepEqual(state.score, { attempts: 0, hits: 0 });
});

test('spin stays very slow through 70% then accelerates while the crosshair keeps expanding', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  updateGame(state, idleInput, .02, () => .5);
  const rotationSince = (angle) =>
    (state.cowboy.lassoAngle - angle + Math.PI * 2) % (Math.PI * 2);

  updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .5);
  const tinyRadius = state.aim.ellipseRadiusX;
  const firstAngle = state.cowboy.lassoAngle;
  updateGame(state, idleInput, .1, () => .5);
  const initialRotation = rotationSince(firstAngle);

  for (let press = 2; press <= 8; press += 1) {
    updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .5);
  }
  const earlyAngle = state.cowboy.lassoAngle;
  updateGame(state, idleInput, .1, () => .5);
  const earlyRotation = rotationSince(earlyAngle);

  for (let press = 9; press < 12; press += 1) {
    updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .5);
  }
  const almostReadyRadius = state.aim.ellipseRadiusX;
  const lateAngle = state.cowboy.lassoAngle;
  updateGame(state, idleInput, .1, () => .5);
  const lateRotation = rotationSince(lateAngle);

  updateGame(state, { ...idleInput, boleioPressed: true }, 0, () => .5);

  assert.ok(tinyRadius < almostReadyRadius * .15, 'the first crosshair should be almost a point');
  assert.ok(
    earlyRotation < initialRotation * 2.1,
    'the spin should gain very little speed before 70% progress',
  );
  assert.ok(
    lateRotation > earlyRotation * 3,
    'the spin should become visibly faster only in the final part',
  );
  assert.equal(state.cowboy.lasso.throwReady, true);
  assert.ok(Math.abs(state.aim.ellipseRadiusX - state.aim.baseEllipseRadiusX) < 1e-10);
  assert.ok(Math.abs(state.aim.ellipseRadiusY - state.aim.baseEllipseRadiusY) < 1e-10);
});

test('a lighter lasso requires fewer A presses', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.equipment.lassoId = 'sereno';

  prepareLasso(state);
  assert.equal(state.cowboy.lasso.requiredBoleioPresses, 6);
  assert.equal(state.cowboy.lasso.boleioPresses, 6);
  assert.equal(state.cowboy.lasso.throwReady, true);
});

test('a well-timed throw catches but only ends after the bull leaves the screen', () => {
  const state = createGameState();
  runFor(state, .7);
  prepareLasso(state, () => .49);
  state.aim.offsetX = 0;
  state.aim.offsetY = 0;
  throwPreparedLasso(state, () => .49);

  assert.equal(state.cowboy.lasso.willCatch, true);
  runFor(state, .5);
  assert.equal(state.cowboy.lasso.mode, 'caught');
  assert.deepEqual(state.score, { attempts: 1, hits: 1 });

  runFor(state, ROUND_RULES.caughtResultDelay);
  assert.equal(state.round.status, 'running');

  state.bull.worldX = state.cameraX + CANVAS.width + 20;
  state.bull.screenX = CANVAS.width + 20;
  updateGame(state, idleInput, .02);
  assert.equal(state.round.status, 'complete');
});

test('after a catch the cowboy automatically matches the bull speed until the end', () => {
  const state = createGameState();
  runFor(state, .7);
  prepareLasso(state, () => 0);
  state.aim.offsetX = 0;
  state.aim.offsetY = 0;
  throwPreparedLasso(state, () => 0);
  runFor(state, .5);

  assert.equal(state.cowboy.lasso.mode, 'caught');
  const initialGap = state.bull.screenX - state.cowboy.x;
  updateGame(state, { ...idleInput, left: true }, .2);

  assert.equal(state.cowboy.speed, state.bull.speed);
  assert.ok(
    Math.abs(state.bull.screenX - state.cowboy.x - initialGap) < 1e-10,
    'braking must not change the distance after a catch',
  );

  updateGame(state, { ...idleInput, right: true }, .2);
  assert.equal(state.cowboy.speed, state.bull.speed);
  assert.ok(
    Math.abs(state.bull.screenX - state.cowboy.x - initialGap) < 1e-10,
    'accelerating must not change the distance after a catch',
  );
});

test('each lasso uses its own maximum reach at release time', () => {
  const shortLasso = throwAtDistance({ distance: 110, lassoId: 'campestre', roll: 0 });
  const longLasso = throwAtDistance({ distance: 110, lassoId: 'sereno', roll: .49 });

  assert.equal(shortLasso.cowboy.lasso.maxRange, 96);
  assert.equal(shortLasso.cowboy.lasso.withinRange, false);
  assert.equal(shortLasso.cowboy.lasso.willCatch, false);
  assert.equal(longLasso.cowboy.lasso.maxRange, 120);
  assert.equal(longLasso.cowboy.lasso.withinRange, true);
  assert.equal(longLasso.cowboy.lasso.willCatch, true);
});

test('reach uses the diagonal distance without a separate vertical cutoff', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.bull.y = state.cowboy.y + 25;
  state.bull.worldX = state.cameraX + state.cowboy.x + 70;
  state.bull.screenX = state.cowboy.x + 70;

  prepareLasso(state, () => 0);
  throwPreparedLasso(state, () => 0);

  assert.ok(Math.hypot(70, 25) < 96);
  assert.equal(state.cowboy.lasso.withinRange, true);
  assert.equal(state.cowboy.lasso.willCatch, true);
});

test('a bull at or behind the cowboy cannot be caught even inside rope reach', () => {
  const state = throwAtDistance({ distance: -1, roll: 0 });

  assert.equal(state.cowboy.lasso.withinRange, false);
  assert.equal(state.cowboy.lasso.releaseChance, 0);
  assert.equal(state.cowboy.lasso.willCatch, false);
});

test('a throw inside reach always catches after the required boleio presses', () => {
  const firstThrow = throwAtDistance({ distance: 70, lassoId: 'brasa', roll: .9999 });
  let rollsOutsideRange = 0;
  const outside = createGameState();
  outside.round.elapsed = ROUND_RULES.cowboyDelay;
  outside.equipment.lassoId = 'brasa';
  outside.bull.y = outside.cowboy.y;
  outside.bull.worldX = outside.cowboy.x + 81;
  outside.bull.screenX = outside.cowboy.x + 81;
  prepareLasso(outside, () => { rollsOutsideRange += 1; return 0; });
  throwPreparedLasso(outside, () => { rollsOutsideRange += 1; return 0; });

  assert.equal(firstThrow.cowboy.lasso.releaseChance, 1);
  assert.equal(firstThrow.cowboy.lasso.willCatch, true);
  assert.equal(outside.cowboy.lasso.withinRange, false);
  assert.equal(outside.cowboy.lasso.releaseChance, 0);
  assert.equal(outside.cowboy.lasso.willCatch, false);
  assert.equal(rollsOutsideRange, 0, 'a throw outside reach must have zero chance without rolling');
});

test('crosshair color and catch chance transition continuously with tolerance', () => {
  const red = createGameState();
  red.round.elapsed = ROUND_RULES.cowboyDelay;
  red.bull.y = red.cowboy.y;
  red.bull.worldX = red.cowboy.x + 110;
  red.bull.screenX = red.cowboy.x + 110;
  assert.equal(getAimStatus(red), 'red');
  assert.equal(getAimChance(red), 0);
  assert.equal(getAimColor(getAimChance(red)), 'rgb(199, 70, 59)');
  prepareLasso(red);
  throwPreparedLasso(red);
  assert.equal(red.cowboy.lasso.releaseChance, 0);
  assert.equal(red.cowboy.lasso.willCatch, false);

  const makeTransitionState = (tolerance = AIM_RULES.defaultTolerance) => {
    const state = createGameState();
    state.round.elapsed = ROUND_RULES.cowboyDelay;
    state.settings.aimTolerance = tolerance;
    state.bull.y = state.cowboy.y;
    state.bull.worldX = state.cowboy.x + 70;
    state.bull.screenX = state.cowboy.x + 70;
    state.aim.offsetX = 8;
    return state;
  };
  const lowToleranceChance = getAimChance(makeTransitionState(1));
  const normalToleranceChance = getAimChance(makeTransitionState(3));
  const highToleranceChance = getAimChance(makeTransitionState(5));
  assert.ok(lowToleranceChance < normalToleranceChance);
  assert.ok(normalToleranceChance < highToleranceChance);
  assert.ok(normalToleranceChance > 0 && normalToleranceChance < 1);
  assert.equal(getAimStatus(makeTransitionState(3)), 'yellow');
  assert.notEqual(getAimColor(normalToleranceChance), getAimColor(0));
  assert.notEqual(getAimColor(normalToleranceChance), getAimColor(1));

  const transitionHit = makeTransitionState(3);
  prepareLasso(transitionHit);
  throwPreparedLasso(transitionHit, () => normalToleranceChance - .01);
  assert.equal(transitionHit.cowboy.lasso.releaseChance, normalToleranceChance);
  assert.equal(transitionHit.cowboy.lasso.willCatch, true);

  const transitionMiss = makeTransitionState(3);
  prepareLasso(transitionMiss);
  throwPreparedLasso(transitionMiss, () => normalToleranceChance);
  assert.equal(transitionMiss.cowboy.lasso.releaseChance, normalToleranceChance);
  assert.equal(transitionMiss.cowboy.lasso.willCatch, false);

  const green = createGameState();
  green.round.elapsed = ROUND_RULES.cowboyDelay;
  green.bull.y = green.cowboy.y;
  green.bull.worldX = green.cowboy.x + 70;
  green.bull.screenX = green.cowboy.x + 70;
  assert.equal(getAimStatus(green), 'green');
  assert.equal(getAimChance(green), 1);
  assert.equal(getAimColor(getAimChance(green)), 'rgb(98, 186, 83)');
  prepareLasso(green);
  throwPreparedLasso(green);
  assert.equal(green.cowboy.lasso.releaseChance, 1);
  assert.equal(green.cowboy.lasso.willCatch, true);
});

test('the ellipse keeps fixed axes while only its knot orbits', () => {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.bull.y = state.cowboy.y;
  state.bull.worldX = state.cowboy.x + 70;
  state.bull.screenX = state.cowboy.x + 70;
  state.aim.ellipseRadiusX = 6;
  state.aim.ellipseRadiusY = 3;
  state.aim.knotOrbitAngle = 0;
  state.aim.offsetX = 5;
  state.aim.offsetY = 0;

  assert.equal(AIM_RULES.ellipseAspect, .544, 'the ellipse should be 20% flatter than before');
  assert.equal(AIM_RULES.visualScale, 2, 'only the visual crosshair should be twice as large');

  assert.equal(getAimChance(state), 1, 'the long horizontal axis should guarantee the hit');

  state.aim.offsetX = 0;
  state.aim.offsetY = 4;
  const shortAxisChance = getAimChance(state);
  assert.ok(shortAxisChance > 0 && shortAxisChance < 1, 'outside the short axis should only be a chance');

  state.aim.offsetY = 5;
  const verticalChance = getAimChance(state);
  state.aim.knotOrbitAngle = Math.PI / 2;
  assert.equal(getAimChance(state), verticalChance, 'the moving knot must not rotate the hit area');
});

test('a throw beyond the equipped lasso reach falls and stays dragging on the ground', () => {
  const state = createGameState();
  runFor(state, 3);
  prepareLasso(state);
  throwPreparedLasso(state);

  assert.equal(state.cowboy.lasso.willCatch, false);
  runFor(state, .5);
  assert.equal(state.cowboy.lasso.mode, 'falling');
  runFor(state, .4);
  assert.equal(state.cowboy.lasso.mode, 'dragging');
  const landingDragTime = state.cowboy.lasso.dragTime;
  const cameraAtLanding = state.cameraX;
  runFor(state, .5);
  assert.equal(state.cowboy.lasso.mode, 'dragging', 'the short lasso must remain on the ground');
  assert.ok(state.cowboy.lasso.dragTime > landingDragTime, 'the grounded loop should keep scraping along');
  assert.ok(state.cameraX > cameraAtLanding, 'the cowboy should keep advancing after the miss');
  assert.ok(
    state.cowboy.x + WORLD.lassoGroundLead - state.cowboy.lasso.dragDistance >= WORLD.lassoGroundMargin,
    'the grounded loop should remain visible when the cowboy is near the left edge',
  );
  assert.deepEqual(state.score, { attempts: 1, hits: 0 });
});

test('only holding control reels an out-of-range lasso back to ready', () => {
  const state = throwAtDistance({ distance: 110, lassoId: 'campestre', roll: 0 });
  runFor(state, .9);
  assert.equal(state.cowboy.lasso.mode, 'dragging');

  const draggedDistance = state.cowboy.lasso.dragDistance;
  runFor(state, .1);
  assert.equal(state.cowboy.lasso.mode, 'dragging');
  assert.ok(state.cowboy.lasso.dragDistance >= draggedDistance);

  runFor(state, .1, { ...idleInput, reel: true });
  assert.equal(state.cowboy.lasso.mode, 'reeling');
  assert.ok(state.cowboy.lasso.dragDistance < draggedDistance);

  updateGame(state, idleInput, 0);
  assert.equal(state.cowboy.lasso.mode, 'dragging', 'releasing control must pause retrieval');

  runFor(state, 1, { ...idleInput, reel: true });
  assert.equal(state.cowboy.lasso.mode, 'ready');
  assert.equal(state.cowboy.lasso.dragDistance, 0);
});

test('the round automatically reels a grounded lasso at normal speed before ending', () => {
  const state = throwAtDistance({ distance: 110, lassoId: 'campestre', roll: 0 });
  runFor(state, .9);
  state.bull.worldX = state.cameraX + CANVAS.width + 24;
  state.bull.screenX = CANVAS.width + 24;

  updateGame(state, idleInput, .02);
  assert.equal(state.round.status, 'running');
  assert.equal(state.cowboy.lasso.mode, 'reeling');
  assert.equal(state.cowboy.lasso.autoReel, true);
  const distanceAtAutoReel = state.cowboy.lasso.dragDistance;

  runFor(state, .1, idleInput);
  assert.ok(state.cowboy.lasso.dragDistance < distanceAtAutoReel);

  runFor(state, 1, idleInput);
  assert.equal(state.cowboy.lasso.mode, 'ready');
  assert.equal(state.round.status, 'complete');
});

test('next round resets positions while preserving the tournament score', () => {
  const state = createGameState();
  state.score = { attempts: 3, hits: 1 };
  state.round.status = 'complete';
  state.cameraX = 120;

  resetRound(state);

  assert.equal(state.round.number, 2);
  assert.equal(state.round.status, 'running');
  assert.equal(state.cameraX, 0);
  assert.equal(state.cowboy.lasso.mode, 'ready');
  assert.equal(state.cowboy.level, 1);
  assert.equal(state.cowboy.stamina, 1);
  assert.deepEqual(state.score, { attempts: 3, hits: 1 });
});
