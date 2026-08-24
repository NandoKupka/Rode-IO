import { PALETTE } from './theme.js';

export const HORSES = Object.freeze([
  Object.freeze({
    id: 'faisca',
    name: 'Faísca',
    variant: 'star',
    speedStars: 3,
    stabilityStars: 3,
    colors: Object.freeze({
      main: PALETTE.horse,
      light: PALETTE.horseLight,
      dark: PALETTE.horseDark,
      marking: PALETTE.cream,
      saddle: PALETTE.yellow,
    }),
  }),
  Object.freeze({
    id: 'trovao',
    name: 'Trovão',
    variant: 'blaze',
    speedStars: 5,
    stabilityStars: 1,
    colors: Object.freeze({ main: '#3f4650', light: '#727b83', dark: '#22272d', marking: '#d8d1c0', saddle: '#b44932' }),
  }),
  Object.freeze({
    id: 'areia',
    name: 'Areia',
    variant: 'socks',
    speedStars: 2,
    stabilityStars: 5,
    colors: Object.freeze({ main: '#b77b45', light: '#dba66b', dark: '#5e3b27', marking: '#ede0bd', saddle: '#527080' }),
  }),
  Object.freeze({
    id: 'lua-clara',
    name: 'Lua Clara',
    variant: 'pinto',
    speedStars: 3,
    stabilityStars: 4,
    colors: Object.freeze({ main: '#d7c7a6', light: '#f0dfb9', dark: '#746653', marking: '#72513b', saddle: '#9a3f31' }),
  }),
  Object.freeze({
    id: 'ventania',
    name: 'Ventania',
    variant: 'midnight',
    speedStars: 4,
    stabilityStars: 2,
    colors: Object.freeze({ main: '#273e4f', light: '#52758b', dark: '#15232d', marking: '#b9d0d3', saddle: '#d09a40' }),
  }),
  Object.freeze({
    id: 'imperial',
    name: 'Imperial',
    variant: 'champion',
    speedStars: 5,
    stabilityStars: 5,
    colors: Object.freeze({ main: '#6b3327', light: '#b85e3f', dark: '#321d1a', marking: '#fff0c7', saddle: '#efca4b' }),
  }),
]);

export const COWBOY_LEVEL = 1;

// A stamina pertence ao cowboy, não ao laço. Cada nível aumenta a força
// aplicada por aperto; por enquanto o jogo mantém o cowboy fixo no nível 1.
export function getCowboyStamina(level = COWBOY_LEVEL) {
  return Math.max(1, Math.floor(level));
}

const BOLEIO_PRESS_WEIGHT_SCALE = 2.5;

export function getBoleioPresses(lassoOrWeight, stamina = getCowboyStamina()) {
  const weightKg = typeof lassoOrWeight === 'number' ? lassoOrWeight : lassoOrWeight.weightKg;
  return Math.max(1, Math.ceil(weightKg * BOLEIO_PRESS_WEIGHT_SCALE / stamina));
}

export function getLassoAimRadius(lassoOrLevel) {
  const level = typeof lassoOrLevel === 'number' ? lassoOrLevel : lassoOrLevel.aimLevel;
  return (4 + level * .8) * .75 * .8;
}

export const LASSOS = Object.freeze([
  Object.freeze({
    id: 'campestre',
    name: 'Campestre',
    variant: 'plain',
    aimLevel: 1,
    lengthMeters: 12,
    maxRange: 96,
    weightKg: 4.8,
    price: 0,
    colors: Object.freeze({ main: PALETTE.rope, light: PALETTE.ropeLight, accent: PALETTE.cream, width: 4 }),
  }),
  Object.freeze({
    id: 'brasa',
    name: 'Brasa',
    variant: 'thick',
    aimLevel: 2,
    lengthMeters: 10,
    maxRange: 80,
    weightKg: 4,
    price: 450,
    colors: Object.freeze({ main: '#b44932', light: '#e88455', accent: '#f6c474', width: 5 }),
  }),
  Object.freeze({
    id: 'raizeiro',
    name: 'Raizeiro',
    variant: 'braided',
    aimLevel: 3,
    lengthMeters: 14,
    maxRange: 112,
    weightKg: 3.2,
    price: 900,
    colors: Object.freeze({ main: '#786044', light: '#c19a68', accent: '#ecd6aa', width: 4 }),
  }),
  Object.freeze({
    id: 'sereno',
    name: 'Sereno',
    variant: 'wrapped',
    aimLevel: 4,
    lengthMeters: 15,
    maxRange: 120,
    weightKg: 2.4,
    price: 1500,
    colors: Object.freeze({ main: '#557a87', light: '#8fb6bb', accent: '#d9e1d1', width: 3 }),
  }),
  Object.freeze({
    id: 'horizonte',
    name: 'Horizonte',
    variant: 'fine',
    aimLevel: 5,
    lengthMeters: 17,
    maxRange: 136,
    weightKg: 2,
    price: 2400,
    colors: Object.freeze({ main: '#7462a7', light: '#b3a1e2', accent: '#f2e9ff', width: 3 }),
  }),
  Object.freeze({
    id: 'ouro-velho',
    name: 'Ouro Velho',
    variant: 'double-knot',
    aimLevel: 6,
    lengthMeters: 18,
    maxRange: 144,
    weightKg: 1.6,
    price: 3600,
    colors: Object.freeze({ main: '#b28a36', light: '#eed071', accent: '#fff3d6', width: 4 }),
  }),
]);

export const DEFAULT_LOADOUT = Object.freeze({ horseId: HORSES[0].id, lassoId: LASSOS[0].id });
export const DEFAULT_OWNED_LASSO_IDS = Object.freeze([DEFAULT_LOADOUT.lassoId]);
export const INFINITE_MONEY = Number.POSITIVE_INFINITY;

export function resolveLoadout(selection = DEFAULT_LOADOUT) {
  return {
    horse: HORSES.find(({ id }) => id === selection.horseId) ?? HORSES[0],
    lasso: LASSOS.find(({ id }) => id === selection.lassoId) ?? LASSOS[0],
  };
}

export function buyLasso(ownedLassoIds, lassoId, balance = INFINITE_MONEY) {
  const lasso = LASSOS.find(({ id }) => id === lassoId);
  const owned = new Set(ownedLassoIds);
  if (!lasso || owned.has(lassoId) || balance < lasso.price) {
    return { purchased: false, ownedLassoIds: [...owned], balance };
  }

  owned.add(lassoId);
  return {
    purchased: true,
    ownedLassoIds: [...owned],
    balance: Number.isFinite(balance) ? balance - lasso.price : balance,
  };
}
