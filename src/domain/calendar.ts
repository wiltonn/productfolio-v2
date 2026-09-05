/**
 * Calendar-derived working time (decision D13).
 *
 * A working day is Monday–Friday. Weekends are never working days, so a holiday that falls
 * on a weekend has no effect. All date arithmetic is done in UTC on ISO `YYYY-MM-DD`
 * strings so that daylight-saving transitions cannot shift a day.
 */

export type ISODate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Working days per standard full-time week; one engineer-week is this many full days. */
export const WORKING_DAYS_PER_WEEK = 5;

export function isISODate(value: string): value is ISODate {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function assertISODate(value: string, label = 'date'): ISODate {
  if (!isISODate(value)) throw new Error(`${label} must be a valid YYYY-MM-DD date, got "${value}"`);
  return value;
}

export function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(iso: ISODate): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** ISO strings compare correctly as plain strings, which is what makes this cheap. */
export function isBefore(a: ISODate, b: ISODate): boolean {
  return a < b;
}

export function isWeekday(iso: ISODate): boolean {
  const day = parseISODate(iso).getUTCDay();
  return day >= 1 && day <= 5;
}

/** Every calendar day from `start` to `end`, inclusive. Empty if `end` precedes `start`. */
export function* eachDay(start: ISODate, end: ISODate): Generator<ISODate> {
  for (let d = start; d <= end; d = addDays(d, 1)) yield d;
}

/** Monday–Friday days from `start` to `end`, inclusive. */
export function workingDays(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (const d of eachDay(start, end)) if (isWeekday(d)) days.push(d);
  return days;
}

/**
 * A configurable set of holiday dates. The system never assumes a jurisdiction and never
 * fetches a list; every date here was entered deliberately.
 */
export class HolidayCalendar {
  private readonly dates: Set<ISODate>;

  constructor(dates: Iterable<ISODate> = []) {
    this.dates = new Set(dates);
  }

  has(date: ISODate): boolean {
    return this.dates.has(date);
  }

  get size(): number {
    return this.dates.size;
  }
}

export interface DateRange {
  from: ISODate;
  to: ISODate;
}

export function inRange(date: ISODate, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/** Working days to engineer-weeks at a given schedule fraction. */
export function daysToEngineerWeeks(days: number, fraction = 1): number {
  return (days * fraction) / WORKING_DAYS_PER_WEEK;
}
