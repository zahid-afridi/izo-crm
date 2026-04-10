/** Local calendar day bounds for YYYY-MM-DD (same pattern as worker assignments API). */
export function startOfDayFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) throw new Error('Invalid date');
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfDayExclusive(dayStart: Date): Date {
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
}
