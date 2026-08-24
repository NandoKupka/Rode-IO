import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from './input.js';

function createTarget() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
}

test('queues each quick space press for exactly one game frame', () => {
  const target = createTarget();
  const input = createInput(target);
  const event = { code: 'Space', key: ' ', repeat: false, preventDefault() {} };

  target.listeners.get('keydown')(event);
  target.listeners.get('keyup')(event);

  assert.equal(input.getState().lassoPressed, true);
  assert.equal(input.getState().lassoPressed, false);

  target.listeners.get('keydown')(event);
  target.listeners.get('keyup')(event);
  assert.equal(input.getState().lassoPressed, true);
});

test('ignores keyboard repeat while space remains held', () => {
  const target = createTarget();
  const input = createInput(target);
  const first = { code: 'Space', key: ' ', repeat: false, preventDefault() {} };
  const repeated = { ...first, repeat: true };

  target.listeners.get('keydown')(first);
  assert.equal(input.getState().lassoPressed, true);
  target.listeners.get('keydown')(repeated);
  assert.equal(input.getState().lassoPressed, false);
});

test('tracks the speed arrows and clears held controls on blur', () => {
  const target = createTarget();
  const input = createInput(target);
  const left = { code: 'ArrowLeft', key: 'ArrowLeft', preventDefault() {} };
  const right = { code: 'ArrowRight', key: 'ArrowRight', preventDefault() {} };

  target.listeners.get('keydown')(left);
  assert.equal(input.getState().left, true);
  target.listeners.get('keyup')(left);
  assert.equal(input.getState().left, false);

  target.listeners.get('keydown')(right);
  target.listeners.get('blur')();
  assert.equal(input.getState().right, false);
});

test('queues a quick speed-control tap for the next game frame', () => {
  const target = createTarget();
  const input = createInput(target);
  const right = { code: 'ArrowRight', key: 'ArrowRight', repeat: false, preventDefault() {} };

  target.listeners.get('keydown')(right);
  target.listeners.get('keyup')(right);

  assert.equal(input.getState().rightPressed, true);
  assert.equal(input.getState().rightPressed, false);
});

test('queues quick vertical taps through the same arrow-control path', () => {
  const target = createTarget();
  const input = createInput(target);
  const up = { code: 'ArrowUp', key: 'ArrowUp', repeat: false, preventDefault() {} };

  target.listeners.get('keydown')(up);
  target.listeners.get('keyup')(up);

  assert.equal(input.getState().upPressed, true);
  assert.equal(input.getState().upPressed, false);
});

test('exposes speed controls for the on-screen buttons', () => {
  const target = createTarget();
  const input = createInput(target);

  input.setControl('right', true);
  assert.equal(input.getState().right, true);
  input.setControl('right', false);
  assert.equal(input.getState().right, false);
});
