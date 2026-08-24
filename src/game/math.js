export function mod(value, size) {
  return ((value % size) + size) % size;
}

export function hash(value) {
  const input = Math.abs(Math.floor(value));
  return (input * 9301 + 49297) % 233280;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
