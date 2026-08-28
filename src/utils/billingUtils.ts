/**
 * Utility functions for billing and prorate calculations.
 */

export function calculateProratedAmount(fullPrice: number, date: Date = new Date()): {
  amount: number;
  totalDaysInMonth: number;
  remainingDays: number;
  currentDay: number;
  periodStart: Date;
  periodEnd: Date;
} {
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentDay = date.getDate();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const remainingDays = totalDaysInMonth - currentDay + 1;
  const amount = Math.max(1, Math.round((remainingDays / totalDaysInMonth) * fullPrice));
  const periodStart = new Date(year, month, currentDay, 0, 0, 0);
  const periodEnd = new Date(year, month + 1, 0, 23, 59, 59);

  return {
    amount,
    totalDaysInMonth,
    remainingDays,
    currentDay,
    periodStart,
    periodEnd,
  };
}
