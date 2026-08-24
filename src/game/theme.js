export const CANVAS = Object.freeze({
  width: 320,
  height: 180,
});

export const WORLD = Object.freeze({
  horizonY: 59,
  trackTop: 74,
  backFenceY: 72,
  frontFenceY: 143,
  cameraSpeed: 30,
  cowboyX: 14,
  cowboyBaseY: 104,
  bullX: 166,
  laneOffset: 18,
  propSpacing: 128,
  fenceSpacing: 10,
  crowdSpacing: 9,
});

export const ART_SCALE = Object.freeze({
  cowboy: .2,
  bull: .24,
  spectator: .5,
});

export const PALETTE = Object.freeze({
  sky: '#7195c7',
  skyLight: '#d9e7e7',
  distant: '#9b543f',
  ground: '#4d7a3d',
  track: '#b9774e',
  trackLight: '#c98b5b',
  trackDark: '#82503d',
  wood: '#51311f',
  woodLight: '#7f512f',
  outline: '#21191c',
  red: '#c7463b',
  blue: '#38669c',
  blueDark: '#293f6d',
  horse: '#914c2d',
  horseLight: '#bd7040',
  horseDark: '#3b241b',
  bull: '#654331',
  bullLight: '#98633e',
  yellow: '#efca4b',
  rope: '#bd7b3d',
  ropeLight: '#f2c37e',
  cream: '#fff5dc',
  skin: '#d18a61',
  skinLight: '#efb188',
});

export const CROWD_COLORS = Object.freeze([
  PALETTE.red,
  PALETTE.blue,
  '#d09a40',
  '#718a5d',
  '#5e4c82',
]);
