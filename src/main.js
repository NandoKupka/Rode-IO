import './style.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { CANVAS } from './game/theme.js';
import { createInput } from './game/input.js';
import { createGameState, resetRound, updateGame } from './game/state.js';
import { createSceneRenderer } from './game/scene-renderer.js';
import { DEFAULT_LOADOUT, HORSES, LASSOS, resolveLoadout } from './game/equipment.js';

const STORAGE_KEY = 'rodeio-8bit-loadout';
const canvas = document.querySelector('#game-canvas');
const gameCard = document.querySelector('.game-card');
const context = canvas.getContext('2d', { alpha: false });
const screens = [...document.querySelectorAll('[data-screen]')];
const gameUi = document.querySelector('[data-game-ui]');
const sectionTitle = document.querySelector('#section-title');
const statusPill = document.querySelector('#status-pill');
const menuHorseName = document.querySelector('#menu-horse-name');
const menuLassoName = document.querySelector('#menu-lasso-name');
const lassoValue = document.querySelector('#lasso-value');
const attemptsValue = document.querySelector('#attempts-value');
const hitsValue = document.querySelector('#hits-value');
const roundValue = document.querySelector('#round-value');
const speedValue = document.querySelector('#speed-value');
const roundModal = document.querySelector('[data-round-modal]');
const roundResultTitle = document.querySelector('#round-result-title');
const roundHitsValue = document.querySelector('#round-hits-value');
const roundAttemptsValue = document.querySelector('#round-attempts-value');
const totalHitsValue = document.querySelector('#total-hits-value');

canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
context.imageSmoothingEnabled = false;

const input = createInput(window);
const state = createGameState();
const renderer = createSceneRenderer(context);
const clock = { last: performance.now() };
let activeScreen = 'menu';
let lastLassoMode = '';
let lastAttempts = -1;
let lastHits = -1;
let lastRound = -1;
let lastSpeed = -1;
let resultShownForRound = null;

function loadSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch {
    // A blocked or malformed local preference should never prevent the game from loading.
  }
  return DEFAULT_LOADOUT;
}

const loadedEquipment = resolveLoadout(loadSelection());
state.equipment = {
  horseId: loadedEquipment.horse.id,
  lassoId: loadedEquipment.lasso.id,
};

function saveSelection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.equipment));
  } catch {
    // The current session still keeps the selection when persistent storage is unavailable.
  }
}

function equipmentButton(item, type) {
  const button = document.createElement('button');
  const color = item.colors.main;
  const light = item.colors.light;
  const dark = item.colors.dark ?? item.colors.main;
  button.type = 'button';
  button.className = 'equipment-option';
  button.dataset.equipmentType = type;
  button.dataset.equipmentId = item.id;
  button.dataset.variant = item.variant;
  button.style.setProperty('--item-main', color);
  button.style.setProperty('--item-light', light);
  button.style.setProperty('--item-dark', dark);
  const range = type === 'lasso'
    ? `<span class="equipment-stat">ALCANCE ${item.lengthMeters}M</span>`
    : '';
  button.innerHTML = `<span class="${type}-preview" aria-hidden="true"></span><span class="equipment-copy"><strong>${item.name}</strong>${range}</span><small>EQUIPADO</small>`;
  return button;
}

function renderEquipmentOptions() {
  const horseContainer = document.querySelector('#horse-options');
  const lassoContainer = document.querySelector('#lasso-options');
  horseContainer.replaceChildren(...HORSES.map((item) => equipmentButton(item, 'horse')));
  lassoContainer.replaceChildren(...LASSOS.map((item) => equipmentButton(item, 'lasso')));
  updateEquipmentSelection();
}

function updateEquipmentSelection() {
  document.querySelectorAll('[data-equipment-type]').forEach((button) => {
    const selectionKey = `${button.dataset.equipmentType}Id`;
    const selected = state.equipment[selectionKey] === button.dataset.equipmentId;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  const loadout = resolveLoadout(state.equipment);
  menuHorseName.textContent = loadout.horse.name;
  menuLassoName.textContent = `${loadout.lasso.name} · ${loadout.lasso.lengthMeters}M`;
  lastLassoMode = '';
}

const screenMeta = {
  menu: { title: 'Rodeio 8-bit', status: 'MENU' },
  equipment: { title: 'Equipamentos', status: 'EQUIPANDO' },
  settings: { title: 'Configurações', status: 'EM BREVE' },
  game: { title: 'Rodeio 8-bit', status: 'JOGANDO' },
};

function showScreen(name) {
  activeScreen = name;
  const isPlaying = name === 'game';
  gameCard.dataset.activeScreen = name;
  gameCard.classList.toggle('is-playing', isPlaying);
  gameUi.hidden = !isPlaying;
  screens.forEach((screen) => {
    screen.hidden = screen.dataset.screen !== name;
  });

  const meta = screenMeta[name];
  sectionTitle.textContent = meta.title;
  statusPill.lastChild.textContent = ` ${meta.status}`;
  clock.last = performance.now();

  if (!isPlaying) {
    roundModal.hidden = true;
    const active = document.querySelector(`[data-screen="${name}"]`);
    active?.querySelector('button')?.focus({ preventScroll: true });
  } else {
    canvas.focus({ preventScroll: true });
  }
}

function startNewGame() {
  resetRound(state, { number: 1, resetScore: true });
  resultShownForRound = null;
  roundModal.hidden = true;
  showScreen('game');
}

function showRoundResult() {
  if (resultShownForRound === state.round.number) return;
  resultShownForRound = state.round.number;
  roundResultTitle.textContent = state.round.hits ? 'LAÇADA CERTEIRA!' : 'FIM DA ARMADA';
  roundHitsValue.textContent = String(state.round.hits);
  roundAttemptsValue.textContent = String(state.round.attempts);
  totalHitsValue.textContent = String(state.score.hits);
  roundModal.hidden = false;
  roundModal.querySelector('[data-next-round]').focus({ preventScroll: true });
}

function updateHud() {
  const { mode } = state.cowboy.lasso;
  if (mode !== lastLassoMode) {
    lastLassoMode = mode;
    const label = {
      ready: 'PRONTO',
      spinning: 'GIRANDO',
      throwing: 'LANÇANDO',
      falling: 'CAINDO',
      caught: 'LAÇADO!',
    }[mode];
    const { lasso } = resolveLoadout(state.equipment);
    lassoValue.textContent = `${label} · ${lasso.lengthMeters}M`;
  }

  if (state.score.attempts !== lastAttempts) {
    lastAttempts = state.score.attempts;
    attemptsValue.textContent = String(lastAttempts);
  }
  if (state.score.hits !== lastHits) {
    lastHits = state.score.hits;
    hitsValue.textContent = String(lastHits);
  }

  if (state.round.number !== lastRound) {
    lastRound = state.round.number;
    roundValue.textContent = String(lastRound).padStart(2, '0');
  }
  const speed = Math.round(state.cowboy.speed);
  if (speed !== lastSpeed) {
    lastSpeed = speed;
    speedValue.textContent = String(speed);
  }
}

function frame(now) {
  const delta = Math.min((now - clock.last) / 1000, .05);
  clock.last = now;
  if (activeScreen === 'game') {
    updateGame(state, input.getState(), delta);
    if (state.round.status === 'complete') showRoundResult();
  }
  renderer.render(state);
  updateHud();
  requestAnimationFrame(frame);
}

document.addEventListener('click', (event) => {
  const navigationButton = event.target.closest('[data-go]');
  if (navigationButton) {
    if (navigationButton.dataset.go === 'game') startNewGame();
    else showScreen(navigationButton.dataset.go);
  }

  if (event.target.closest('[data-next-round]')) {
    resetRound(state);
    resultShownForRound = null;
    roundModal.hidden = true;
    clock.last = performance.now();
    canvas.focus({ preventScroll: true });
  }

  const equipmentOption = event.target.closest('[data-equipment-type]');
  if (!equipmentOption) return;
  const selectionKey = `${equipmentOption.dataset.equipmentType}Id`;
  state.equipment[selectionKey] = equipmentOption.dataset.equipmentId;
  updateEquipmentSelection();
  saveSelection();
});

window.addEventListener('keydown', (event) => {
  if (activeScreen === 'menu' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    const options = [...document.querySelectorAll('.menu-option')];
    const current = Math.max(options.indexOf(document.activeElement), 0);
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = (current + direction + options.length) % options.length;
    event.preventDefault();
    options[next].focus();
    return;
  }

  if (event.key !== 'Escape' || activeScreen === 'menu') return;
  event.preventDefault();
  showScreen('menu');
});

document.querySelectorAll('[data-control]').forEach((button) => {
  const control = button.dataset.control;
  const release = () => {
    input.setControl(control, false);
    button.classList.remove('is-active');
  };

  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    input.setControl(control, true);
    button.classList.add('is-active');
    canvas.focus({ preventScroll: true });
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    input.setControl(control, true);
    input.setControl(control, false);
  });
});

renderEquipmentOptions();
updateHud();
renderer.render(state);
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => input.destroy(), { once: true });
