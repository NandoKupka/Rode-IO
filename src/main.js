import './style.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import { ART_SCALE, CANVAS } from './game/theme.js';
import { createInput } from './game/input.js';
import {
  AIM_RULES,
  createGameState,
  getAimChance,
  getAimColor,
  getAimStatus,
  resetRound,
  updateGame,
} from './game/state.js';
import { createSceneRenderer } from './game/scene-renderer.js';
import {
  buyLasso,
  DEFAULT_LOADOUT,
  DEFAULT_OWNED_LASSO_IDS,
  HORSES,
  LASSOS,
  resolveLoadout,
} from './game/equipment.js';

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
const aimCrosshair = document.querySelector('#aim-crosshair');
const aimKnot = document.querySelector('#aim-knot');
const toleranceInput = document.querySelector('#aim-tolerance');
const toleranceValue = document.querySelector('#aim-tolerance-value');
const staminaMeter = document.querySelector('#stamina-meter');
const lassoWeight = document.querySelector('#lasso-weight');
const roundModal = document.querySelector('[data-round-modal]');
const roundResultTitle = document.querySelector('#round-result-title');
const roundHitsValue = document.querySelector('#round-hits-value');
const roundAttemptsValue = document.querySelector('#round-attempts-value');
const totalHitsValue = document.querySelector('#total-hits-value');

canvas.width = CANVAS.width;
canvas.height = CANVAS.height;
aimCrosshair.style.setProperty('--aim-core-scale', String(1 / AIM_RULES.visualScale));
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

const loadedProfile = loadSelection();
const loadedEquipment = resolveLoadout(loadedProfile);
state.equipment = {
  horseId: loadedEquipment.horse.id,
  lassoId: loadedEquipment.lasso.id,
};
const loadedTolerance = Number(loadedProfile.aimTolerance);
state.settings.aimTolerance = Number.isFinite(loadedTolerance)
  ? Math.max(AIM_RULES.minTolerance, Math.min(AIM_RULES.maxTolerance, Math.round(loadedTolerance)))
  : AIM_RULES.defaultTolerance;
const savedOwnedLassos = Array.isArray(loadedProfile.ownedLassoIds)
  ? loadedProfile.ownedLassoIds.filter((id) => LASSOS.some((lasso) => lasso.id === id))
  : [];
state.inventory.ownedLassoIds = [...new Set([
  ...DEFAULT_OWNED_LASSO_IDS,
  ...savedOwnedLassos,
  state.equipment.lassoId,
])];

function saveSelection() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state.equipment,
      aimTolerance: state.settings.aimTolerance,
      ownedLassoIds: state.inventory.ownedLassoIds,
    }));
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
  const stars = (value) => `<span class="star-rating" aria-hidden="true"><b>${'★'.repeat(value)}</b><i>${'★'.repeat(5 - value)}</i></span>`;
  const stats = type === 'lasso'
    ? `<span class="equipment-stat">MIRA NV.${item.aimLevel} · ALCANCE ${item.lengthMeters}M · PESO ${item.weightKg.toFixed(1).replace('.', ',')}KG</span>`
    : `<span class="horse-ratings"><span aria-label="Velocidade: ${item.speedStars} de 5 estrelas">VELOCIDADE ${stars(item.speedStars)}</span><span aria-label="Estabilidade: ${item.stabilityStars} de 5 estrelas">ESTABILIDADE ${stars(item.stabilityStars)}</span></span>`;
  button.innerHTML = `<span class="${type}-preview" aria-hidden="true"></span><span class="equipment-copy"><strong>${item.name}</strong>${stats}</span><small></small>`;
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
    const isLasso = button.dataset.equipmentType === 'lasso';
    const owned = !isLasso || state.inventory.ownedLassoIds.includes(button.dataset.equipmentId);
    button.classList.toggle('is-selected', selected);
    button.classList.toggle('is-owned', owned);
    button.setAttribute('aria-pressed', String(selected));
    const item = isLasso ? LASSOS.find(({ id }) => id === button.dataset.equipmentId) : null;
    button.querySelector('small').textContent = selected
      ? 'EQUIPADO'
      : owned
        ? 'EQUIPAR'
        : `COMPRAR · R$ ${item.price.toLocaleString('pt-BR')}`;
  });

  const loadout = resolveLoadout(state.equipment);
  menuHorseName.textContent = loadout.horse.name;
  menuLassoName.textContent = `${loadout.lasso.name} · ${loadout.lasso.lengthMeters}M`;
  lastLassoMode = '';
}

const screenMeta = {
  menu: { title: 'Rodeio 8-bit', status: 'MENU' },
  equipment: { title: 'Equipamentos', status: 'EQUIPANDO' },
  settings: { title: 'Configurações', status: 'AJUSTANDO' },
  game: { title: 'Rodeio 8-bit', status: 'JOGANDO' },
};

const toleranceLabels = Object.freeze({
  1: 'MÍNIMA · DIFÍCIL',
  2: 'BAIXA',
  3: 'NORMAL',
  4: 'ALTA',
  5: 'MÁXIMA · FÁCIL',
});

function updateToleranceControl() {
  toleranceInput.value = String(state.settings.aimTolerance);
  toleranceValue.value = toleranceLabels[state.settings.aimTolerance];
  toleranceInput.setAttribute('aria-valuetext', toleranceLabels[state.settings.aimTolerance]);
}

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
  const lassoStatus = mode === 'spinning' && state.cowboy.lasso.throwReady ? 'armed' : mode;
  if (lassoStatus !== lastLassoMode) {
    lastLassoMode = lassoStatus;
    const label = {
      ready: 'PRONTO',
      spinning: 'GIRANDO',
      armed: 'LIBERADO',
      throwing: 'LANÇANDO',
      falling: 'CAINDO',
      dragging: 'ARRASTANDO',
      reeling: 'RECOLHENDO',
      caught: 'LAÇADO!',
    }[lassoStatus];
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

  const hideCrosshair = state.round.status === 'complete' || mode !== 'spinning';
  aimCrosshair.hidden = hideCrosshair;
  if (!hideCrosshair) {
    const aimX = state.bull.screenX + 39 * ART_SCALE.bull + state.aim.offsetX;
    const aimY = state.bull.y - 31 * ART_SCALE.bull + state.aim.offsetY;
    const displayX = aimX / CANVAS.width * canvas.clientWidth;
    const displayY = aimY / CANVAS.height * canvas.clientHeight;
    const displayScale = canvas.clientWidth / CANVAS.width;
    const ellipseWidth = state.aim.ellipseRadiusX * 2 * displayScale * AIM_RULES.visualScale;
    const ellipseHeight = state.aim.ellipseRadiusY * 2 * displayScale * AIM_RULES.visualScale;
    aimCrosshair.style.transform = `translate3d(${displayX}px, ${displayY}px, 0) translate(-50%, -50%)`;
    aimCrosshair.style.width = `${ellipseWidth}px`;
    aimCrosshair.style.height = `${ellipseHeight}px`;
    const knotX = Math.cos(state.aim.knotOrbitAngle) * ellipseWidth / 2;
    const knotY = Math.sin(state.aim.knotOrbitAngle) * ellipseHeight / 2;
    aimKnot.style.transform = `translate(-50%, -50%) translate(${knotX}px, ${knotY}px)`;
    const aimChance = getAimChance(state);
    aimCrosshair.dataset.status = getAimStatus(state);
    aimCrosshair.dataset.chance = String(Math.round(aimChance * 100));
    aimCrosshair.style.color = getAimColor(aimChance);
  }

  const isSpinning = mode === 'spinning';
  staminaMeter.hidden = !isSpinning;
  if (isSpinning) {
    const { lasso } = resolveLoadout(state.equipment);
    lassoWeight.textContent = `PESO ${lasso.weightKg.toFixed(1).replace('.', ',')}KG`;
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
  if (equipmentOption.dataset.equipmentType === 'lasso' &&
      !state.inventory.ownedLassoIds.includes(equipmentOption.dataset.equipmentId)) {
    const purchase = buyLasso(
      state.inventory.ownedLassoIds,
      equipmentOption.dataset.equipmentId,
      state.inventory.money,
    );
    if (!purchase.purchased) return;
    state.inventory.ownedLassoIds = purchase.ownedLassoIds;
    state.inventory.money = purchase.balance;
  }
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

toleranceInput.addEventListener('input', () => {
  state.settings.aimTolerance = Number(toleranceInput.value);
  updateToleranceControl();
  saveSelection();
});

renderEquipmentOptions();
updateToleranceControl();
updateHud();
renderer.render(state);
requestAnimationFrame(frame);

window.addEventListener('beforeunload', () => input.destroy(), { once: true });
