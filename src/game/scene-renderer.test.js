import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneRenderer } from './scene-renderer.js';
import { PALETTE, WORLD } from './theme.js';

function createTraceContext() {
  const calls = [];
  return {
    calls,
    fillStyle: '',
    fillRect(...args) {
      calls.push(['fillRect', ...args, this.fillStyle]);
    },
    beginPath() { calls.push(['beginPath']); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    bezierCurveTo(...args) { calls.push(['bezierCurveTo', ...args]); },
    closePath() { calls.push(['closePath']); },
    fill() { calls.push(['fill']); },
    stroke() { calls.push(['stroke']); },
    ellipse(...args) { calls.push(['ellipse', ...args]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
  };
}

function findCall(calls, predicate) {
  return calls.findIndex(predicate);
}

function renderLassoLoopAt(progress) {
  const ctx = createTraceContext();
  createSceneRenderer(ctx).render({
    cameraX: 0,
    equipment: {},
    cowboy: {
      y: WORLD.cowboyBaseY,
      frame: 0,
      lassoAngle: 0,
      lasso: { mode: 'throwing', progress, willCatch: true },
    },
    bull: { frame: 0 },
  });

  const loop = ctx.calls.find((call) => call[0] === 'ellipse' && call[3] > 20);
  assert.ok(loop, 'the travelling lasso loop should be rendered');
  return { x: loop[1], y: loop[2], radiusX: loop[3], radiusY: loop[4] };
}

test('renders each audience section on the correct side of its fence', () => {
  const ctx = createTraceContext();
  createSceneRenderer(ctx).render({
    cameraX: 0,
    cowboy: { y: WORLD.cowboyBaseY, frame: 0 },
    bull: { frame: 0 },
  });

  const trackIndex = findCall(ctx.calls, (call) =>
    call[0] === 'fillRect' && call[1] === 0 && call[2] === WORLD.trackTop &&
    call[3] === 320 && call[4] === 74 && call[5] === PALETTE.track,
  );
  const audienceIndex = findCall(ctx.calls, (call) =>
    call[0] === 'fillRect' && call[1] === -4 && call[2] === -8 &&
    call[3] === 3 && call[4] === 8 && call[5] === PALETTE.outline,
  );
  const upperAudienceIndex = findCall(ctx.calls, (call) =>
    call[0] === 'translate' && call[2] === WORLD.backFenceY + 10,
  );
  const backFenceIndex = findCall(ctx.calls, (call) =>
    call[0] === 'fillRect' && call[1] === 0 && call[2] === WORLD.backFenceY &&
    call[3] === 320 && call[4] === 3 && call[5] === PALETTE.woodLight,
  );
  const lowerAudienceIndex = findCall(ctx.calls, (call) =>
    call[0] === 'translate' && call[2] === WORLD.frontFenceY + 14,
  );
  const frontFenceIndex = findCall(ctx.calls, (call) =>
    call[0] === 'fillRect' && call[1] === 0 && call[2] === WORLD.frontFenceY &&
    call[3] === 320 && call[4] === 3 && call[5] === PALETTE.wood,
  );

  assert.ok(trackIndex >= 0, 'track surface should be rendered');
  assert.ok(audienceIndex >= 0, 'audience should be rendered');
  assert.ok(upperAudienceIndex >= 0, 'upper audience feet should align with the back fence base');
  assert.ok(backFenceIndex >= 0, 'back fence should be rendered');
  assert.ok(lowerAudienceIndex >= 0, 'lower audience should be rendered');
  assert.ok(frontFenceIndex >= 0, 'front fence should be rendered');
  assert.ok(trackIndex < audienceIndex, 'audience should be in front of the track fill');
  assert.ok(audienceIndex < backFenceIndex, 'back fence should cover the audience');
  assert.ok(frontFenceIndex < lowerAudienceIndex, 'lower audience should cover the front fence');
});

test('throws the lasso through a visible ballistic arc instead of a straight line', () => {
  const start = renderLassoLoopAt(0);
  const middle = renderLassoLoopAt(.5);
  const end = renderLassoLoopAt(1);
  const lineYAtMiddle = start.y + (end.y - start.y) * ((middle.x - start.x) / (end.x - start.x));

  assert.ok(
    middle.y < lineYAtMiddle - 18,
    `the middle of the throw should rise above its straight chord (arc=${lineYAtMiddle - middle.y})`,
  );
});

test('opens the loop around the apex before it tightens on the target', () => {
  const start = renderLassoLoopAt(0);
  const apex = renderLassoLoopAt(.5);
  const end = renderLassoLoopAt(1);

  assert.ok(apex.radiusX > start.radiusX, 'the loop should flare open as it catches air');
  assert.ok(end.radiusX < apex.radiusX, 'the loop should tighten as it reaches the horns');
  assert.ok(apex.radiusY > end.radiusY, 'the airborne loop should not look like a rigid flat ring');
});

test('renders a missed lasso flattened on the ground behind the cowboy', () => {
  const ctx = createTraceContext();
  createSceneRenderer(ctx).render({
    cameraX: 120,
    equipment: {},
    cowboy: {
      y: WORLD.cowboyBaseY,
      frame: 0,
      lassoAngle: 0,
      lasso: {
        mode: 'dragging',
        progress: 0,
        willCatch: false,
        dragDistance: 60,
        dragTime: .5,
      },
    },
    bull: { frame: 0 },
  });

  const loop = ctx.calls.find((call) => call[0] === 'ellipse' && call[3] > 20);
  assert.ok(loop, 'the dragged loop should still be visible');
  assert.ok(loop[1] < -200, 'the loop should trail well behind the rider');
  assert.ok(loop[2] > 15, 'the loop should lie below the horse on the track');
  assert.ok(loop[4] <= 8, 'contact with the ground should flatten the loop');
});

test('renders the lasso coiled by the cowboy hand before bolearing', () => {
  const ctx = createTraceContext();
  createSceneRenderer(ctx).render({
    cameraX: 0,
    equipment: {},
    cowboy: {
      x: WORLD.cowboyX,
      y: WORLD.cowboyBaseY,
      frame: 0,
      lassoAngle: 0,
      lasso: { mode: 'ready', progress: 0, willCatch: null },
    },
    bull: { screenX: WORLD.bullX, y: 108, frame: 0 },
  });

  const handCoil = ctx.calls.find((call) =>
    call[0] === 'ellipse' && call[2] < -40 && call[3] <= 15,
  );
  assert.ok(handCoil, 'a small rope coil should remain visible next to the roping hand');
});

test('visually limits a thrown loop to the equipped lasso reach', () => {
  const ctx = createTraceContext();
  createSceneRenderer(ctx).render({
    cameraX: 0,
    equipment: {},
    cowboy: {
      x: WORLD.cowboyX,
      y: WORLD.cowboyBaseY,
      frame: 0,
      lassoAngle: 0,
      lasso: {
        mode: 'throwing',
        progress: 1,
        willCatch: false,
        withinRange: false,
        maxRange: 80,
      },
    },
    bull: { screenX: 290, y: 108, frame: 0 },
  });

  const loop = ctx.calls.find((call) => call[0] === 'ellipse' && call[3] > 20);
  assert.ok(loop);
  assert.ok(loop[1] < 450, `the short lasso should stop before the distant bull (x=${loop[1]})`);
});
