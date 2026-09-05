/**
 * The capacity chain (WORKFORCE_CAPACITY_MODEL.md, D13):
 *
 *   contracted  = Σ working days in force × schedule fraction ÷ 5
 *   available   = contracted − known absences (holidays ∪ leave, each day counted once)
 *   net delivery = available − overhead
 *   overhead ratio = overhead ÷ available
 *
 * Capacity is time. Nothing here is discounted for productivity.
 */

import {
  type DateRange,
  HolidayCalendar,
  type ISODate,
  WORKING_DAYS_PER_WEEK,
  inRange,
  workingDays,
} from './calendar.js';

export interface Quarter {
  name: string;
  start: ISODate;
  end: ISODate;
}

/**
 * A working schedule in force from `effectiveFrom` (null = from the beginning of time)
 * until the next schedule's `effectiveFrom`. `fraction` is the share of a standard
 * full-time week: 1 for full-time, 0.6 for a three-day week.
 */
export interface SchedulePeriod {
  fraction: number;
  effectiveFrom: ISODate | null;
}

export interface Absence extends DateRange {
  note?: string;
}

export interface PersonInput {
  id: number;
  name: string;
  /** First day in force, inclusive. null = before the quarter began. */
  joined: ISODate | null;
  /** Last day in force, inclusive. null = still in force at quarter end. */
  left: ISODate | null;
  schedules: SchedulePeriod[];
  absences: Absence[];
  /** Overhead as a percentage (0–100) of this person's available capacity for the quarter. */
  overheadPercent: number;
}

export interface PersonCapacity {
  personId: number;
  name: string;
  /** Working days on which the person was in force during the quarter. */
  workingDaysInForce: number;
  contractedEw: number;
  /** Distinct absent working days (holiday ∪ leave) while in force. */
  absenceDays: number;
  absenceEw: number;
  availableEw: number;
  overheadPercent: number;
  overheadEw: number;
  netDeliveryEw: number;
}

export interface TeamCapacity {
  contractedEw: number;
  absenceEw: number;
  availableEw: number;
  overheadEw: number;
  netDeliveryEw: number;
  /** overhead ÷ available. null when available is zero (the ratio is undefined). */
  overheadRatio: number | null;
  people: PersonCapacity[];
}

export function isInForce(person: Pick<PersonInput, 'joined' | 'left'>, date: ISODate): boolean {
  if (person.joined !== null && date < person.joined) return false;
  if (person.left !== null && date > person.left) return false;
  return true;
}

/**
 * The schedule fraction in force on a date: the latest schedule whose `effectiveFrom` is
 * null or on/before the date. Days before the first dated schedule, with no undated
 * schedule, carry no contracted time.
 */
export function scheduleFractionOn(schedules: SchedulePeriod[], date: ISODate): number {
  let current: SchedulePeriod | undefined;
  for (const s of sortedSchedules(schedules)) {
    if (s.effectiveFrom === null || s.effectiveFrom <= date) current = s;
    else break;
  }
  return current?.fraction ?? 0;
}

export function sortedSchedules(schedules: SchedulePeriod[]): SchedulePeriod[] {
  return [...schedules].sort((a, b) => {
    if (a.effectiveFrom === b.effectiveFrom) return 0;
    if (a.effectiveFrom === null) return -1;
    if (b.effectiveFrom === null) return 1;
    return a.effectiveFrom < b.effectiveFrom ? -1 : 1;
  });
}

export function validateSchedule(schedule: SchedulePeriod): void {
  if (!(schedule.fraction > 0 && schedule.fraction <= 1)) {
    throw new Error(`Schedule fraction must be greater than 0 and at most 1, got ${schedule.fraction}`);
  }
}

export function validateOverheadPercent(percent: number): void {
  if (!(percent >= 0 && percent <= 100)) {
    throw new Error(`Overhead percent must be between 0 and 100, got ${percent}`);
  }
}

export function personCapacity(person: PersonInput, quarter: Quarter, holidays: HolidayCalendar): PersonCapacity {
  validateOverheadPercent(person.overheadPercent);
  for (const s of person.schedules) validateSchedule(s);

  let workingDaysInForce = 0;
  let contracted = 0;
  let absenceDays = 0;
  let absence = 0;

  for (const day of workingDays(quarter.start, quarter.end)) {
    if (!isInForce(person, day)) continue;
    const fraction = scheduleFractionOn(person.schedules, day);
    if (fraction === 0) continue;

    workingDaysInForce += 1;
    const dayEw = fraction / WORKING_DAYS_PER_WEEK;
    contracted += dayEw;

    // A day is absent at most once, however many holiday and leave entries cover it.
    const absent = holidays.has(day) || person.absences.some((a) => inRange(day, a));
    if (absent) {
      absenceDays += 1;
      absence += dayEw;
    }
  }

  const available = contracted - absence;
  const overhead = (available * person.overheadPercent) / 100;

  return {
    personId: person.id,
    name: person.name,
    workingDaysInForce,
    contractedEw: contracted,
    absenceDays,
    absenceEw: absence,
    availableEw: available,
    overheadPercent: person.overheadPercent,
    overheadEw: overhead,
    netDeliveryEw: available - overhead,
  };
}

export function teamCapacity(people: PersonInput[], quarter: Quarter, holidays: HolidayCalendar): TeamCapacity {
  const rows = people.map((p) => personCapacity(p, quarter, holidays));
  const sum = (pick: (r: PersonCapacity) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
  const contractedEw = sum((r) => r.contractedEw);
  const absenceEw = sum((r) => r.absenceEw);
  const availableEw = sum((r) => r.availableEw);
  const overheadEw = sum((r) => r.overheadEw);
  return {
    contractedEw,
    absenceEw,
    availableEw,
    overheadEw,
    netDeliveryEw: availableEw - overheadEw,
    overheadRatio: availableEw > 0 ? overheadEw / availableEw : null,
    people: rows,
  };
}
