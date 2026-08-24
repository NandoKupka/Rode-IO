import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState, resetRound, ROUND_RULES, updateGame } from './state.js';
import { CANVAS, WORLD } from './theme.js';

const idleInput = Object.freeze({ up: false, down: false, left: false, right: false });

function runFor(state, seconds, input = idleInput) {
  const step = .02;
  for (let elapsed = 0; elapsed < seconds; elapsed += step) updateGame(state, input, step);
}

function throwAtDistance({ distance, lassoId = 'campestre', roll = .49 }) {
  const state = createGameState();
  state.round.elapsed = ROUND_RULES.cowboyDelay;
  state.equipment.lassoId = lassoId;
  state.bull.y = state.cowboy.y;
  state.bull.worldX = state.cameraX + state.cowboy.x + distance;
  state.bull.screenX = state.cowboy.x + distance;
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, () => roll);
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, () => roll);
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

test('the bull crosses the screen in about five seconds at the default pace', () => {
  const state = createGameState();
  let elapsed = 0;

  while (state.round.status === 'running' && elapsed < 7) {
    updateGame(state, idleInput, .02);
    elapsed += .02;
  }

  assert.equal(state.round.status, 'complete');
  assert.ok(elapsed >= 4.5 && elapsed <= 5.5, `expected about 5 seconds, got ${elapsed}`);
  assert.ok(state.bull.screenX > CANVAS.width);
});

test('right advances, left brakes, and the selected speed persists after release', () => {
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
  assert.equal(accelerated.cowboy.speed, selectedSpeed);
  assert.ok(accelerated.cowboy.x > positionAtRelease, 'the cowboy should keep advancing at the selected speed');
});

test('the cowboy stays at the spawn until the player accelerates', () => {
  const state = createGameState();
  const startX = state.cowboy.x;

  runFor(state, 1);
  assert.equal(state.cowboy.x, startX);

  runFor(state, .5, { ...idleInput, right: true });
  assert.ok(state.cowboy.x > startX);
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

test('the first space press starts bolearing and the second launches', () => {
  const state = createGameState();
  runFor(state, .7);

  assert.equal(state.cowboy.lasso.mode, 'ready');
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, () => .49);
  assert.equal(state.cowboy.lasso.mode, 'spinning');
  assert.deepEqual(state.score, { attempts: 0, hits: 0 });

  updateGame(state, { ...idleInput, lassoPressed: true }, 0);
  assert.equal(state.cowboy.lasso.mode, 'throwing');
  assert.deepEqual(state.score, { attempts: 1, hits: 0 });
});

test('a well-timed throw catches based on range and ends the round', () => {
  const state = createGameState();
  runFor(state, .7);
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, () => .49);
  updateGame(state, { ...idleInput, lassoPressed: true }, 0, () => .49);

  assert.equal(state.cowboy.lasso.willCatch, true);
  runFor(state, .5);
  assert.equal(state.cowboy.lasso.mode, 'caught');
  assert.deepEqual(state.score, { attempts: 1, hits: 1 });

  runFor(state, ROUND_RULES.caughtResultDelay);
  assert.equal(state.round.status, 'complete');
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

test('a throw inside reach has exactly a 50 percent chance to catch', () => {
  const hit = throwAtDistance({ distance: 70, lassoId: 'brasa', roll: .4999 });
  const miss = throwAtDistance({ distance: 70, lassoId: 'brasa', roll: .5 });
  let rollsOutsideRange = 0;
  const outside = createGameState();
  outside.round.elapsed = ROUND_RULES.cowboyDelay;
  outside.equipment.lassoId = 'brasa';
  outside.bull.y = outside.cowboy.y;
  outside.bull.worldX = outside.cowboy.x + 81;
  outside.bull.screenX = outside.cowboy.x + 81;
  updateGame(outside, { ...idleInput, lassoPressed: true }, 0, () => { rollsOutsideRange += 1; return 0; });
  updateGame(outside, { ...idleInput, lassoPressed: true }, 0, () => { rollsOutsideRange += 1; return 0; });

  assert.equal(hit.cowboy.lasso.willCatch, true);
  assert.equal(miss.cowboy.lasso.willCatch, false);
  assert.equal(outside.cowboy.lasso.withinRange, false);
  assert.equal(outside.cowboy.lasso.willCatch, false);
  assert.equal(rollsOutsideRange, 0, 'a throw outside reach must have zero chance without rolling');
});

test('a throw outside the catch range misses and resets the lasso', () => {
  const state = createGameState();
  runFor(state, 3);
  updateGame(state, { ...idleInput, lassoPressed: true }, 0);
  updateGame(state, { ...idleInput, lassoPressed: true }, 0);

  assert.equal(state.cowboy.lasso.willCatch, false);
  runFor(state, .5);
  assert.equal(state.cowboy.lasso.mode, 'falling');
  runFor(state, .4);
  assert.equal(state.cowboy.lasso.mode, 'ready');
  assert.deepEqual(state.score, { attempts: 1, hits: 0 });
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
  assert.deepEqual(state.score, { attempts: 3, hits: 1 });
});
