export function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export function signed(n: number) {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1);
}
