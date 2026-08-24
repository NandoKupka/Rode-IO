import { ART_SCALE, CANVAS, CROWD_COLORS, PALETTE, WORLD } from './theme.js';
import { hash, mod } from './math.js';
import { drawBull, drawCaughtLasso, drawCowboy, drawSpectator } from './pixel-art.js';
import { rect } from './draw-utils.js';
import { resolveLoadout } from './equipment.js';

function drawCloud(ctx, x, y, size = 1) {
  rect(ctx, x, y + 4 * size, 24 * size, 4 * size, PALETTE.skyLight);
  rect(ctx, x + 5 * size, y, 13 * size, 8 * size, PALETTE.skyLight);
  rect(ctx, x + 11 * size, y - 3 * size, 7 * size, 7 * size, PALETTE.skyLight);
}

function drawBackground(ctx, cameraX) {
  rect(ctx, 0, 0, CANVAS.width, CANVAS.height, PALETTE.sky);
  rect(ctx, 0, WORLD.horizonY, CANVAS.width, CANVAS.height - WORLD.horizonY, PALETTE.ground);
  drawCloud(ctx, 18 - mod(cameraX * .18, 160), 17);
  drawCloud(ctx, 220 - mod(cameraX * .12, 190), 30, .75);

  ctx.fillStyle = PALETTE.distant;
  ctx.beginPath();
  ctx.moveTo(0, 63);
  for (let x = -40; x <= CANVAS.width + 40; x += 40) {
    const height = 8 + mod(x + Math.floor(cameraX * .25), 17);
    ctx.lineTo(x, 63 - height);
    ctx.lineTo(x + 20, 55 - height);
    ctx.lineTo(x + 40, 67 - height);
  }
  ctx.lineTo(CANVAS.width, 78);
  ctx.lineTo(0, 78);
  ctx.closePath();
  ctx.fill();
  rect(ctx, 0, 71, CANVAS.width, 3, PALETTE.trackDark);
}

function drawAudienceRows(ctx, cameraX, rows) {
  for (const row of rows) {
    const first = Math.floor(cameraX / row.spacing) * row.spacing - row.spacing;
    for (let worldX = first; worldX < cameraX + CANVAS.width + row.spacing; worldX += row.spacing) {
      const screenX = worldX - cameraX;
      const variant = Math.floor(worldX / row.spacing);
      drawSpectator(
        ctx,
        screenX,
        row.feetY,
        CROWD_COLORS[mod(variant, CROWD_COLORS.length)],
        Math.abs(variant),
      );
    }
  }
}

function drawUpperAudience(ctx, cameraX) {
  drawAudienceRows(ctx, cameraX, [
    { feetY: WORLD.backFenceY + 10, spacing: WORLD.crowdSpacing },
  ]);
}

function drawLowerAudience(ctx, cameraX) {
  drawAudienceRows(ctx, cameraX, [
    { feetY: WORLD.frontFenceY + 14, spacing: WORLD.crowdSpacing },
  ]);
}

function drawFenceLine(ctx, cameraX, y, railColor, postColor, spacing) {
  rect(ctx, 0, y, CANVAS.width, 3, railColor);
  rect(ctx, 0, y + 7, CANVAS.width, 2, postColor);
  const first = -mod(cameraX, spacing) - spacing;
  for (let x = first; x < CANVAS.width + spacing; x += spacing) {
    rect(ctx, x - 2, y - 5, 4, 16, postColor);
  }
}

function drawCorridor(ctx, cameraX) {
  rect(ctx, 0, WORLD.trackTop, CANVAS.width, 74, PALETTE.track);
  rect(ctx, 0, 82, CANVAS.width, 64, PALETTE.trackLight);

  for (let x = -mod(cameraX, 24) - 24; x < CANVAS.width + 24; x += 24) {
    rect(ctx, x, 126, 11, 2, PALETTE.trackDark);
    rect(ctx, x + 8, 93, 7, 1, PALETTE.trackDark);
  }
}

function drawBoleioProgress(ctx, cowboyX, cowboyY, lasso) {
  if (lasso.mode !== 'spinning' || !lasso.requiredBoleioPresses) return;
  const outerWidth = 38;
  const innerWidth = 34;
  const x = Math.min(Math.max(cowboyX - 14, 3), CANVAS.width - outerWidth - 3);
  const y = cowboyY - 32;
  const progress = Math.min(lasso.boleioPresses / lasso.requiredBoleioPresses, 1);

  rect(ctx, x, y, outerWidth, 7, PALETTE.outline);
  rect(ctx, x + 1, y + 1, outerWidth - 2, 5, PALETTE.cream);
  rect(ctx, x + 2, y + 2, innerWidth, 3, PALETTE.blueDark);
  rect(ctx, x + 2, y + 2, innerWidth * progress, 3, PALETTE.yellow);
}

export function createSceneRenderer(ctx) {
  return {
    render(state) {
      const bullY = state.bull.y ?? 108;
      const bullX = state.bull.screenX ?? WORLD.bullX;
      const cowboyX = state.cowboy.x ?? WORLD.cowboyX;
      const lasso = state.cowboy.lasso ?? { mode: 'ready', progress: 0, willCatch: null };
      const equipment = resolveLoadout(state.equipment);
      const horn = {
        x: bullX + 39 * ART_SCALE.bull,
        y: bullY - 31 * ART_SCALE.bull,
      };
      const aim = state.aim ?? { offsetX: 0, offsetY: 0 };
      const crosshair = {
        x: horn.x + aim.offsetX,
        y: horn.y + aim.offsetY,
      };
      const lassoTarget = lasso.releaseAimX === null || lasso.releaseAimX === undefined
        ? crosshair
        : {
            x: horn.x + lasso.releaseAimX,
            y: horn.y + lasso.releaseAimY,
          };
      drawBackground(ctx, state.cameraX);
      drawCorridor(ctx, state.cameraX);
      drawUpperAudience(ctx, state.cameraX);
      drawFenceLine(ctx, state.cameraX, WORLD.backFenceY, PALETTE.woodLight, PALETTE.wood, WORLD.fenceSpacing);
      drawFenceLine(ctx, state.cameraX, WORLD.frontFenceY, PALETTE.wood, PALETTE.woodLight, 28);
      drawLowerAudience(ctx, state.cameraX);
      drawCowboy(
        ctx,
        cowboyX,
        state.cowboy.y,
        state.cowboy.frame,
        state.cowboy.lassoAngle,
        lasso,
        lassoTarget,
        equipment,
      );
      drawBull(ctx, bullX, bullY, state.bull.frame);
      if (lasso.mode === 'caught') {
        drawCaughtLasso(ctx, horn.x, horn.y, equipment.lasso.colors);
      }
      drawBoleioProgress(ctx, cowboyX, state.cowboy.y, lasso);
    },
  };
}
