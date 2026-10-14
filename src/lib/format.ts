/* 12345 -> "12K", 1530 -> "1.5K" */
export function compactStars(n: number) {
  if (n >= 10000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
