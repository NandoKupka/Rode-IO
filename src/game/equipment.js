import { PALETTE } from './theme.js';

export const HORSES = Object.freeze([
  Object.freeze({
    id: 'faisca',
    name: 'Faísca',
    variant: 'star',
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
    colors: Object.freeze({ main: '#3f4650', light: '#727b83', dark: '#22272d', marking: '#d8d1c0', saddle: '#b44932' }),
  }),
  Object.freeze({
    id: 'areia',
    name: 'Areia',
    variant: 'socks',
    colors: Object.freeze({ main: '#b77b45', light: '#dba66b', dark: '#5e3b27', marking: '#ede0bd', saddle: '#527080' }),
  }),
  Object.freeze({
    id: 'lua-clara',
    name: 'Lua Clara',
    variant: 'pinto',
    colors: Object.freeze({ main: '#d7c7a6', light: '#f0dfb9', dark: '#746653', marking: '#72513b', saddle: '#9a3f31' }),
  }),
]);

export const LASSOS = Object.freeze([
  Object.freeze({
    id: 'campestre',
    name: 'Campestre',
    variant: 'plain',
    lengthMeters: 12,
    maxRange: 96,
    colors: Object.freeze({ main: PALETTE.rope, light: PALETTE.ropeLight, accent: PALETTE.cream, width: 4 }),
  }),
  Object.freeze({
    id: 'brasa',
    name: 'Brasa',
    variant: 'thick',
    lengthMeters: 10,
    maxRange: 80,
    colors: Object.freeze({ main: '#b44932', light: '#e88455', accent: '#f6c474', width: 5 }),
  }),
  Object.freeze({
    id: 'sereno',
    name: 'Sereno',
    variant: 'wrapped',
    lengthMeters: 15,
    maxRange: 120,
    colors: Object.freeze({ main: '#557a87', light: '#8fb6bb', accent: '#d9e1d1', width: 3 }),
  }),
  Object.freeze({
    id: 'ouro-velho',
    name: 'Ouro Velho',
    variant: 'double-knot',
    lengthMeters: 18,
    maxRange: 144,
    colors: Object.freeze({ main: '#b28a36', light: '#eed071', accent: '#fff3d6', width: 4 }),
  }),
]);

export const DEFAULT_LOADOUT = Object.freeze({ horseId: HORSES[0].id, lassoId: LASSOS[0].id });

export function resolveLoadout(selection = DEFAULT_LOADOUT) {
  return {
    horse: HORSES.find(({ id }) => id === selection.horseId) ?? HORSES[0],
    lasso: LASSOS.find(({ id }) => id === selection.lassoId) ?? LASSOS[0],
  };
}
