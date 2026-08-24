import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buyLasso,
  COWBOY_LEVEL,
  DEFAULT_LOADOUT,
  DEFAULT_OWNED_LASSO_IDS,
  getBoleioPresses,
  getCowboyStamina,
  getLassoAimRadius,
  HORSES,
  INFINITE_MONEY,
  LASSOS,
  resolveLoadout,
} from './equipment.js';

test('offers six rated horses and six lassos with unique ids', () => {
  assert.equal(HORSES.length, 6);
  assert.equal(LASSOS.length, 6);
  assert.equal(new Set(HORSES.map(({ id }) => id)).size, 6);
  assert.equal(new Set(LASSOS.map(({ id }) => id)).size, 6);
  assert.ok(HORSES.every(({ speedStars, stabilityStars }) =>
    speedStars >= 1 && speedStars <= 5 && stabilityStars >= 1 && stabilityStars <= 5));
  assert.ok(HORSES.some(({ speedStars, stabilityStars }) =>
    speedStars === 5 && stabilityStars === 5));
  assert.deepEqual(
    [...new Set(HORSES.map(({ stabilityStars }) => stabilityStars))].sort(),
    [1, 2, 3, 4, 5],
  );
});

test('gives every lasso a distinct realistic reach', () => {
  const lengths = LASSOS.map(({ lengthMeters }) => lengthMeters);
  const ranges = LASSOS.map(({ maxRange }) => maxRange);

  assert.equal(new Set(lengths).size, LASSOS.length);
  assert.equal(new Set(ranges).size, LASSOS.length);
  assert.ok(lengths.every((length) => length >= 10 && length <= 18));
  assert.ok(LASSOS.every(({ lengthMeters, maxRange }) => maxRange === lengthMeters * 8));
});

test('lasso levels keep their progression after the additional 20% aim reduction', () => {
  const levels = LASSOS.map(({ aimLevel }) => aimLevel);
  const radii = LASSOS.map(getLassoAimRadius);

  assert.deepEqual(levels, [1, 2, 3, 4, 5, 6]);
  assert.ok(Math.abs(radii[0] - 2.88) < 1e-10);
  assert.ok(Math.abs(radii.at(-1) - 5.28) < 1e-10);
  assert.ok(radii.every((radius, index) => index === 0 || radius > radii[index - 1]));
  assert.ok(LASSOS.every((lasso, index) =>
    index === 0 || lasso.price > LASSOS[index - 1].price));
});

test('heavier lassos require more A presses with the global level-1 cowboy stamina', () => {
  const stamina = getCowboyStamina(COWBOY_LEVEL);
  const presses = LASSOS.map((lasso) => getBoleioPresses(lasso, stamina));

  assert.equal(COWBOY_LEVEL, 1);
  assert.equal(stamina, 1);
  assert.deepEqual(presses, [12, 10, 8, 6, 5, 4]);
  assert.ok(LASSOS.every(({ weightKg, price }) => weightKg > 0 && price >= 0));
  assert.ok(presses.every((count, index) => index === 0 || count <= presses[index - 1]));
});

test('buys a priced lasso while preserving infinite money', () => {
  const result = buyLasso(DEFAULT_OWNED_LASSO_IDS, 'sereno', INFINITE_MONEY);

  assert.equal(result.purchased, true);
  assert.ok(result.ownedLassoIds.includes('sereno'));
  assert.equal(result.balance, INFINITE_MONEY);
});

test('does not buy a lasso when a finite balance is below its price', () => {
  const result = buyLasso(DEFAULT_OWNED_LASSO_IDS, 'ouro-velho', 100);

  assert.equal(result.purchased, false);
  assert.deepEqual(result.ownedLassoIds, [...DEFAULT_OWNED_LASSO_IDS]);
  assert.equal(result.balance, 100);
});

test('falls back to the default loadout when a saved selection is invalid', () => {
  const loadout = resolveLoadout({ horseId: 'missing', lassoId: 'missing' });

  assert.equal(loadout.horse.id, DEFAULT_LOADOUT.horseId);
  assert.equal(loadout.lasso.id, DEFAULT_LOADOUT.lassoId);
});
