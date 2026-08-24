import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOADOUT, HORSES, LASSOS, resolveLoadout } from './equipment.js';

test('offers four horses and four lassos with unique ids', () => {
  assert.equal(HORSES.length, 4);
  assert.equal(LASSOS.length, 4);
  assert.equal(new Set(HORSES.map(({ id }) => id)).size, 4);
  assert.equal(new Set(LASSOS.map(({ id }) => id)).size, 4);
});

test('gives every lasso a distinct realistic reach', () => {
  const lengths = LASSOS.map(({ lengthMeters }) => lengthMeters);
  const ranges = LASSOS.map(({ maxRange }) => maxRange);

  assert.equal(new Set(lengths).size, LASSOS.length);
  assert.equal(new Set(ranges).size, LASSOS.length);
  assert.ok(lengths.every((length) => length >= 10 && length <= 18));
  assert.ok(LASSOS.every(({ lengthMeters, maxRange }) => maxRange === lengthMeters * 8));
});

test('falls back to the default loadout when a saved selection is invalid', () => {
  const loadout = resolveLoadout({ horseId: 'missing', lassoId: 'missing' });

  assert.equal(loadout.horse.id, DEFAULT_LOADOUT.horseId);
  assert.equal(loadout.lasso.id, DEFAULT_LOADOUT.lassoId);
});
