import { ART_SCALE, PALETTE, WORLD } from './theme.js';
import { rect } from './draw-utils.js';

export function drawSpectator(ctx, x, feetY, color, variant) {
  const skin = variant % 2 === 0 ? '#e0a16e' : '#b86f52';
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feetY));
  ctx.scale(ART_SCALE.spectator, ART_SCALE.spectator);
  rect(ctx, -4, -8, 3, 8, PALETTE.outline);
  rect(ctx, 1, -8, 3, 8, PALETTE.outline);
  rect(ctx, -6, -17, 12, 10, PALETTE.outline);
  rect(ctx, -4, -16, 8, 7, color);
  rect(ctx, -4, -25, 8, 8, PALETTE.outline);
  rect(ctx, -2, -24, 5, 5, skin);
  rect(ctx, -7, -28, 14, 3, PALETTE.outline);
  rect(ctx, -4, -31, 8, 3, variant % 3 === 0 ? PALETTE.wood : '#6c4930');
  ctx.restore();
}

function strokeRope(ctx, width, color) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function traceLassoLoop(ctx, centerX, centerY, radiusX, radiusY, tilt) {
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, tilt, 0, Math.PI * 2);
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function spinStartupProgress(lasso) {
  if (lasso.mode !== 'spinning') return 1;
  const duration = .18;
  const progress = Math.min(Math.max((lasso.spinStartupElapsed ?? duration) / duration, 0), 1);
  return 1 - (1 - progress) ** 3;
}

function spinningLoopPose(angle) {
  const orbitX = Math.cos(angle) * 7;
  const orbitY = Math.sin(angle) * 3;
  return {
    centerX: 14 + orbitX,
    centerY: -79 + orbitY,
    radiusX: 48 + Math.sin(angle) * 4,
    radiusY: 15 + Math.cos(angle) * 3,
    tilt: -.08 + Math.sin(angle) * .12,
  };
}

function traceRopeTail(ctx, handX, handY, centerX, centerY, radiusX, radiusY, slack = 0) {
  const attachmentSide = centerX >= handX ? -1 : 1;
  const joinX = centerX + radiusX * .76 * attachmentSide;
  const joinY = centerY + radiusY * .2;
  const travelX = joinX - handX;
  const travelY = joinY - handY;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.bezierCurveTo(
    handX + travelX * .25,
    handY + travelY * .12 + slack,
    handX + travelX * .7,
    handY + travelY * .8 + slack * .45,
    joinX,
    joinY,
  );
}

function groundLoopPose(lasso) {
  const scrape = Math.abs(Math.sin(lasso.dragTime * 11));
  return {
    centerX: (WORLD.lassoGroundLead - lasso.dragDistance) / ART_SCALE.cowboy,
    centerY: 28 - scrape * 4,
    radiusX: 38 + Math.sin(lasso.dragTime * 9) * 2,
    radiusY: 6 + scrape,
    tilt: -.04 + Math.sin(lasso.dragTime * 7) * .08,
    slack: 34 + scrape * 12,
  };
}

function limitLassoDestination(handX, handY, destination, maxRange) {
  if (!maxRange) return destination;
  const range = maxRange / ART_SCALE.cowboy;
  const distanceX = destination.x - handX;
  const distanceY = destination.y - handY;
  const distance = Math.hypot(distanceX, distanceY);
  if (distance <= range) return destination;
  const scale = range / distance;
  return {
    x: handX + distanceX * scale,
    y: handY + distanceY * scale,
  };
}

function drawLasso(ctx, angle, handX, handY, lasso, target, colors) {
  const ropeWidth = colors.width ?? 4;
  const outlineWidth = ropeWidth + 4;

  if (lasso.mode === 'ready') {
    const coilX = handX + 14;
    const coilY = handY + 13;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(coilX - 8, coilY - 5);
    strokeRope(ctx, outlineWidth, PALETTE.outline);
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(coilX - 8, coilY - 5);
    strokeRope(ctx, ropeWidth, colors.main);
    traceLassoLoop(ctx, coilX, coilY, 12, 8, .18);
    strokeRope(ctx, outlineWidth, PALETTE.outline);
    traceLassoLoop(ctx, coilX, coilY, 12, 8, .18);
    strokeRope(ctx, ropeWidth, colors.light);
    rect(ctx, coilX - 3, coilY - 3, 6, 6, colors.accent ?? PALETTE.cream);
    return;
  }

  let start = spinningLoopPose(lasso.releaseAngle ?? angle);
  if (lasso.mode === 'spinning') {
    const startup = spinStartupProgress(lasso);
    start = {
      centerX: lerp(handX + 11, start.centerX, startup),
      centerY: lerp(handY + 10, start.centerY, startup),
      radiusX: lerp(12, start.radiusX, startup),
      radiusY: lerp(8, start.radiusY, startup),
      tilt: lerp(.18, start.tilt, startup),
      slack: lerp(4, 0, startup),
    };
  }

  if (lasso.mode === 'caught') {
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.bezierCurveTo(
      handX + (target.x - handX) * .32,
      handY + 8,
      handX + (target.x - handX) * .72,
      target.y + 12,
      target.x,
      target.y,
    );
    strokeRope(ctx, outlineWidth, PALETTE.outline);
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.bezierCurveTo(
      handX + (target.x - handX) * .32,
      handY + 8,
      handX + (target.x - handX) * .72,
      target.y + 12,
      target.x,
      target.y,
    );
    strokeRope(ctx, ropeWidth, colors.light);
    return;
  }

  let pose = start;
  if (lasso.mode === 'throwing') {
    const destination = limitLassoDestination(handX, handY, {
      x: target.x,
      y: target.y + (lasso.willCatch ? 0 : -82),
    }, lasso.maxRange);
    const phase = lasso.progress;
    const outward = phase;
    const verticalForce = Math.sin(Math.PI * phase) * -58;
    const loopFlex = Math.sin(Math.PI * phase);
    pose = {
      centerX: lerp(start.centerX, destination.x, outward),
      centerY: lerp(start.centerY, destination.y, outward) + verticalForce,
      radiusX: lerp(start.radiusX, lasso.willCatch ? 24 : 34, outward) + loopFlex * 18,
      radiusY: lerp(start.radiusY, lasso.willCatch ? 12 : 9, outward) + loopFlex * 6,
      tilt: lerp(start.tilt, .12, outward) + Math.sin(Math.PI * 2 * phase) * .08,
      slack: loopFlex * 16,
    };
  } else if (lasso.mode === 'falling') {
    const phase = lasso.progress;
    const destination = groundLoopPose(lasso);
    const missDestination = limitLassoDestination(
      handX,
      handY,
      { x: target.x, y: target.y - 82 },
      lasso.maxRange,
    );
    const miss = { ...missDestination, radiusX: 34, radiusY: 9, tilt: .12 };
    const horizontalProgress = easeInOutSine(phase);
    const fallProgress = phase ** 2;
    pose = {
      centerX: lerp(miss.x, destination.centerX, horizontalProgress),
      centerY: lerp(miss.y, destination.centerY, fallProgress),
      radiusX: lerp(miss.radiusX, destination.radiusX, phase),
      radiusY: lerp(miss.radiusY, destination.radiusY, phase),
      tilt: lerp(miss.tilt, destination.tilt, phase),
      slack: lerp(8, destination.slack, phase),
    };
  } else if (lasso.mode === 'dragging' || lasso.mode === 'reeling') {
    pose = groundLoopPose(lasso);
  }

  // The loose tail flexes after the hand, making the loop feel pulled instead of rigid.
  traceRopeTail(ctx, handX, handY, pose.centerX, pose.centerY, pose.radiusX, pose.radiusY, pose.slack);
  strokeRope(ctx, outlineWidth - 1, PALETTE.outline);
  traceRopeTail(ctx, handX, handY, pose.centerX, pose.centerY, pose.radiusX, pose.radiusY, pose.slack);
  strokeRope(ctx, ropeWidth, colors.main);

  traceLassoLoop(ctx, pose.centerX, pose.centerY, pose.radiusX, pose.radiusY, pose.tilt);
  strokeRope(ctx, outlineWidth, PALETTE.outline);
  traceLassoLoop(ctx, pose.centerX, pose.centerY, pose.radiusX, pose.radiusY, pose.tilt);
  strokeRope(ctx, ropeWidth, colors.light);

  if (lasso.mode === 'dragging' || lasso.mode === 'reeling') {
    const dustOffset = Math.sin(lasso.dragTime * 17) * 12;
    rect(ctx, pose.centerX - 28 - dustOffset, pose.centerY + 7, 8, 4, PALETTE.trackDark);
    rect(ctx, pose.centerX + 20 + dustOffset * .4, pose.centerY + 9, 5, 3, PALETTE.trackDark);
  }

  // A travelling bright knot gives the eye a readable sense of rotation.
  const knotAngle = lasso.mode === 'dragging' || lasso.mode === 'reeling'
    ? lasso.dragTime * 5
    : angle * 1.7;
  const knotX = pose.centerX + Math.cos(knotAngle) * pose.radiusX;
  const knotY = pose.centerY + Math.sin(knotAngle) * pose.radiusY;
  const knotColor = colors.accent ?? PALETTE.cream;
  rect(ctx, knotX - 3, knotY - 3, 7, 7, knotColor);
  if (colors.variant === 'wrapped') {
    rect(ctx, knotX - 11, knotY - 2, 5, 5, colors.main);
    rect(ctx, knotX + 7, knotY - 2, 5, 5, colors.main);
  } else if (colors.variant === 'double-knot') {
    rect(ctx, knotX + 5, knotY - 2, 6, 6, knotColor);
  }
}

function throwExtension(lasso) {
  if (lasso.mode === 'throwing') {
    const releaseEnd = .22;
    if (lasso.progress < releaseEnd) return smoothstep(lasso.progress / releaseEnd);
    return lerp(1, .72, smoothstep((lasso.progress - releaseEnd) / (1 - releaseEnd)));
  }
  if (lasso.mode === 'falling') return lerp(.72, .18, smoothstep(lasso.progress));
  if (lasso.mode === 'dragging') return .18;
  if (lasso.mode === 'reeling') return .38 + Math.sin(lasso.dragTime * 13) * .08;
  if (lasso.mode === 'caught') return .72;
  return 0;
}

function getRopingHand(angle, bodyBob, lasso) {
  const extension = throwExtension(lasso);
  const active = {
    handX: 23 + Math.cos(angle) * 5 * (1 - extension) + extension * 18,
    handY: -57 + bodyBob + Math.sin(angle) * 3 * (1 - extension) + extension * 9,
  };
  const resting = { handX: 10, handY: -34 + bodyBob };
  if (lasso.mode === 'ready') return resting;
  if (lasso.mode !== 'spinning') return active;
  const startup = spinStartupProgress(lasso);
  return {
    handX: lerp(resting.handX, active.handX, startup),
    handY: lerp(resting.handY, active.handY, startup),
  };
}

function drawRopingArm(ctx, angle, bodyBob, lasso, hand) {
  const shoulderX = 4;
  const shoulderY = -40 + bodyBob;
  const extension = throwExtension(lasso);
  const activeElbowX = 15 + Math.cos(angle) * 2 * (1 - extension) + extension * 10;
  const activeElbowY = -50 + bodyBob + Math.sin(angle) * 2 * (1 - extension) + extension * 7;
  const startup = lasso.mode === 'ready' ? 0 : spinStartupProgress(lasso);
  const elbowX = lerp(8, activeElbowX, startup);
  const elbowY = lerp(-37 + bodyBob, activeElbowY, startup);

  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(hand.handX, hand.handY);
  strokeRope(ctx, 13, PALETTE.outline);
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(elbowX, elbowY);
  ctx.lineTo(hand.handX, hand.handY);
  strokeRope(ctx, 8, PALETTE.skin);
  rect(ctx, hand.handX - 4, hand.handY - 4, 8, 8, PALETTE.skinLight);
}

export function drawCowboy(
  ctx,
  x,
  y,
  frame,
  lassoAngle = 0,
  lasso = { mode: 'spinning' },
  lassoTarget,
  equipment = {},
) {
  const horseColors = equipment.horse?.colors ?? {
    main: PALETTE.horse,
    light: PALETTE.horseLight,
    dark: PALETTE.horseDark,
  };
  const lassoColors = equipment.lasso?.colors ?? {
    main: PALETTE.rope,
    light: PALETTE.ropeLight,
  };
  const horseVariant = equipment.horse?.variant ?? 'star';
  const lassoStyle = { ...lassoColors, variant: equipment.lasso?.variant ?? 'plain' };
  const gallop = [
    { front: 1, rear: -1, body: 1 },
    { front: 7, rear: -7, body: -2 },
    { front: -1, rear: 1, body: -4 },
    { front: -7, rear: 7, body: -1 },
  ][frame] ?? { front: 0, rear: 0, body: 0 };
  const riderBob = gallop.body * .65;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ART_SCALE.cowboy, ART_SCALE.cowboy);

  const hand = getRopingHand(lassoAngle, riderBob, lasso);
  const target = {
    x: (lassoTarget.x - x) / ART_SCALE.cowboy,
    y: (lassoTarget.y - y) / ART_SCALE.cowboy,
  };
  drawLasso(ctx, lassoAngle, hand.handX, hand.handY, lasso, target, lassoStyle);

  ctx.fillStyle = 'rgba(59, 36, 27, .28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 7, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  rect(ctx, -17 + gallop.rear, gallop.body, 5, 15 - gallop.body, horseColors.dark);
  rect(ctx, -1 - gallop.rear, gallop.body, 5, 15 - gallop.body, horseColors.dark);
  rect(ctx, 14 + gallop.front, gallop.body - 1, 5, 16 - gallop.body, horseColors.dark);
  rect(ctx, -19 + gallop.rear, 13, 8, 3, PALETTE.outline);
  rect(ctx, -3 - gallop.rear, 13, 8, 3, PALETTE.outline);
  rect(ctx, 12 + gallop.front, 13, 8, 3, PALETTE.outline);
  rect(ctx, -28, -18 + gallop.body, 56, 25, PALETTE.outline);
  rect(ctx, -25, -16 + gallop.body, 50, 20, horseColors.main);
  if (horseVariant === 'pinto') {
    rect(ctx, -14, -14 + gallop.body, 18, 11, horseColors.marking);
    rect(ctx, -19, -11 + gallop.body, 8, 7, horseColors.marking);
  }
  rect(ctx, 19, -27 + gallop.body, 13, 18, PALETTE.outline);
  rect(ctx, 21, -26 + gallop.body, 9, 16, horseColors.main);
  rect(ctx, 27, -37 + gallop.body, 22, 15, PALETTE.outline);
  rect(ctx, 30, -35 + gallop.body, 17, 11, horseColors.light);
  rect(ctx, 42, -30 + gallop.body, 10, 7, horseColors.light);
  if (horseVariant === 'star') {
    rect(ctx, 36, -35 + gallop.body, 5, 5, horseColors.marking);
  } else if (horseVariant === 'blaze') {
    rect(ctx, 38, -35 + gallop.body, 6, 10, horseColors.marking);
  }
  rect(ctx, 34, -39 + gallop.body, 4, 4, horseColors.dark);
  rect(ctx, 43, -38 + gallop.body, 4, 5, horseColors.dark);
  rect(ctx, 44, -32 + gallop.body, 2, 2, PALETTE.outline);
  rect(ctx, -35, -17 + gallop.body, 8, 5, horseColors.dark);
  rect(ctx, -42 - gallop.rear * .4, -12 + gallop.body, 8, 4, horseColors.dark);
  if (horseVariant === 'socks') {
    rect(ctx, -17 + gallop.rear, 6, 5, 7, horseColors.marking);
    rect(ctx, 14 + gallop.front, 6, 5, 7, horseColors.marking);
  }
  rect(ctx, -18, -22 + gallop.body, 34, 5, PALETTE.wood);
  rect(ctx, -16, -25 + gallop.body, 29, 4, horseColors.saddle ?? PALETTE.yellow);
  rect(ctx, -11, -45 + riderBob, 19, 19, PALETTE.outline);
  rect(ctx, -8, -43 + riderBob, 13, 15, PALETTE.blue);
  rect(ctx, -6, -53 + riderBob, 12, 10, PALETTE.outline);
  rect(ctx, -4, -51 + riderBob, 8, 7, PALETTE.skin);
  rect(ctx, -11, -58 + riderBob, 22, 4, PALETTE.outline);
  rect(ctx, -7, -63 + riderBob, 14, 5, PALETTE.wood);
  rect(ctx, 5, -39 + riderBob, 4, 4, PALETTE.yellow);
  drawRopingArm(ctx, lassoAngle, riderBob, lasso, hand);
  rect(ctx, -9, -26 + gallop.body, 6, 14 - gallop.body, PALETTE.blueDark);
  rect(ctx, 1, -26 + gallop.body, 6, 14 - gallop.body, PALETTE.blueDark);
  ctx.restore();
}

export function drawCaughtLasso(ctx, x, y, colors = { light: PALETTE.ropeLight, width: 4 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ART_SCALE.bull, ART_SCALE.bull);
  traceLassoLoop(ctx, 0, 0, 18, 8, .12);
  const ropeWidth = colors.width ?? 4;
  strokeRope(ctx, ropeWidth + 4, PALETTE.outline);
  traceLassoLoop(ctx, 0, 0, 18, 8, .12);
  strokeRope(ctx, ropeWidth, colors.light);
  rect(ctx, -20, -3, 6, 7, colors.accent ?? PALETTE.cream);
  ctx.restore();
}

export function drawBull(ctx, x, y, frame) {
  const step = frame === 1 ? 3 : frame === 3 ? -3 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(ART_SCALE.bull, ART_SCALE.bull);

  ctx.fillStyle = 'rgba(59, 36, 27, .28)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 10, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, -20 + step, 0, 6, 18, PALETTE.outline);
  rect(ctx, 4 - step, 0, 6, 18, PALETTE.outline);
  rect(ctx, 14 + step, 2, 6, 16, PALETTE.outline);
  rect(ctx, -23 + step, 15, 9, 3, PALETTE.outline);
  rect(ctx, 1 - step, 15, 9, 3, PALETTE.outline);
  rect(ctx, 11 + step, 14, 9, 3, PALETTE.outline);
  rect(ctx, -29, -17, 51, 25, PALETTE.outline);
  rect(ctx, -26, -15, 45, 20, PALETTE.bull);
  rect(ctx, 16, -24, 14, 16, PALETTE.outline);
  rect(ctx, 18, -22, 10, 13, PALETTE.bullLight);
  rect(ctx, 25, -31, 25, 16, PALETTE.outline);
  rect(ctx, 28, -29, 20, 12, PALETTE.bullLight);
  rect(ctx, 43, -23, 11, 7, PALETTE.bullLight);
  rect(ctx, 31, -33, 4, 4, PALETTE.cream);
  rect(ctx, 46, -34, 4, 4, PALETTE.cream);
  rect(ctx, 34, -27, 2, 2, PALETTE.outline);
  rect(ctx, -38, -16, 10, 5, PALETTE.outline);
  rect(ctx, -45, -12, 9, 4, PALETTE.outline);
  ctx.restore();
}
