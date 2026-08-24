export function createInput(target = window) {
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    boleio: false,
    lasso: false,
    reel: false,
  };
  const heldControlKeys = new Set();
  let boleioQueued = false;
  let lassoQueued = false;
  let upQueued = false;
  let downQueued = false;
  let leftQueued = false;
  let rightQueued = false;

  function setControl(control, isDown, repeat = false) {
    if (!(control in state)) return;
    if (isDown && !repeat) {
      if (control === 'up') upQueued = true;
      if (control === 'down') downQueued = true;
      if (control === 'left') leftQueued = true;
      if (control === 'right') rightQueued = true;
      if (control === 'boleio') boleioQueued = true;
      if (control === 'lasso') lassoQueued = true;
    }
    state[control] = isDown;
  }

  function update(event, isDown) {
    if (event.key === 'ArrowUp') setControl('up', isDown, event.repeat);
    if (event.key === 'ArrowDown') setControl('down', isDown, event.repeat);
    if (event.key === 'ArrowLeft') setControl('left', isDown, event.repeat);
    if (event.key === 'ArrowRight') setControl('right', isDown, event.repeat);
    if (event.code === 'KeyA' || event.key.toLowerCase() === 'a') {
      setControl('boleio', isDown, event.repeat);
    }
    if (event.code === 'Space' || event.key === ' ') setControl('lasso', isDown, event.repeat);
    if (event.key === 'Control') {
      if (isDown) heldControlKeys.add(event.code);
      else heldControlKeys.delete(event.code);
      setControl('reel', heldControlKeys.size > 0, event.repeat);
    }
    if (event.key.startsWith('Arrow') || event.key === 'Control' ||
        event.code === 'KeyA' || event.key.toLowerCase() === 'a' ||
        event.code === 'Space' || event.key === ' ') {
      event.preventDefault();
    }
  }

  const onKeyDown = (event) => update(event, true);
  const onKeyUp = (event) => update(event, false);
  const onBlur = () => {
    state.up = false;
    state.down = false;
    state.left = false;
    state.right = false;
    state.boleio = false;
    state.lasso = false;
    state.reel = false;
    heldControlKeys.clear();
    boleioQueued = false;
    lassoQueued = false;
    upQueued = false;
    downQueued = false;
    leftQueued = false;
    rightQueued = false;
  };

  target.addEventListener('keydown', onKeyDown, { passive: false });
  target.addEventListener('keyup', onKeyUp, { passive: false });
  target.addEventListener('blur', onBlur);

  return {
    getState() {
      const snapshot = {
        ...state,
        boleioPressed: boleioQueued,
        lassoPressed: lassoQueued,
        upPressed: upQueued,
        downPressed: downQueued,
        leftPressed: leftQueued,
        rightPressed: rightQueued,
      };
      boleioQueued = false;
      lassoQueued = false;
      upQueued = false;
      downQueued = false;
      leftQueued = false;
      rightQueued = false;
      return snapshot;
    },
    setControl,
    destroy() {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
