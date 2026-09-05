import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HolidayCalendar } from '../src/domain/calendar.js';
import { personCapacity, scheduleFractionOn, teamCapacity, type PersonInput } from '../src/domain/capacity.js';
import { close, Q1_2027 } from './helpers.js';

const none = new HolidayCalendar();

function person(over: Partial<PersonInput> & { name: string }): PersonInput {
  return {
    id: 1,
    joined: null,
    left: null,
    schedules: [{ fraction: 1, effectiveFrom: null }],
    absences: [],
    overheadPercent: 0,
    ...over,
  };
}

describe('capacity chain — worked example X1 (Team Atlas)', () => {
  const atlas: PersonInput[] = [
    person({ id: 1, name: 'Lena (lead)', overheadPercent: 40 }),
    person({ id: 2, name: 'Rob', absences: [{ from: '2027-02-15', to: '2027-02-26' }] }),
    person({ id: 3, name: 'Chen' }),
    person({ id: 4, name: 'Dana' }),
    person({ id: 5, name: 'Priya', schedules: [{ fraction: 0.6, effectiveFrom: null }], absences: [{ from: '2027-03-08', to: '2027-03-12' }] }),
    person({ id: 6, name: 'Marta', joined: '2027-02-01' }),
  ];

  it('reproduces X1 exactly: 68.8 → 66.2 → 61.0, overhead ratio ≈ 7.9%', () => {
    const team = teamCapacity(atlas, Q1_2027, none);
    close(team.contractedEw, 68.8, 'contracted');
    close(team.absenceEw, 2.6, 'absence');
    close(team.availableEw, 66.2, 'available');
    close(team.overheadEw, 5.2, 'overhead');
    close(team.netDeliveryEw, 61.0, 'net delivery');
    assert.equal((team.overheadRatio! * 100).toFixed(1), '7.9');
  });

  it('the part-timer’s week of leave removes a part-time week (0.6), not a full one', () => {
    const priya = teamCapacity(atlas, Q1_2027, none).people.find((p) => p.name === 'Priya')!;
    close(priya.contractedEw, 7.8);
    close(priya.absenceEw, 0.6);
    assert.equal(priya.absenceDays, 5);
  });

  it('the joiner contributes only from her effective date (weeks 5–13 = 9.0)', () => {
    const marta = teamCapacity(atlas, Q1_2027, none).people.find((p) => p.name === 'Marta')!;
    assert.equal(marta.workingDaysInForce, 45);
    close(marta.contractedEw, 9.0);
  });
});

describe('effective dates', () => {
  it('a leaver contributes only through their last day, inclusive', () => {
    const p = personCapacity(person({ name: 'L', left: '2027-01-15' }), Q1_2027, none); // Mon 4 .. Fri 15 = 10 days
    assert.equal(p.workingDaysInForce, 10);
    close(p.contractedEw, 2.0);
  });

  it('someone who left before the quarter, or joins after it, contributes nothing', () => {
    close(personCapacity(person({ name: 'gone', left: '2026-12-31' }), Q1_2027, none).contractedEw, 0);
    close(personCapacity(person({ name: 'future', joined: '2027-04-05' }), Q1_2027, none).contractedEw, 0);
  });

  it('joined and left inside the same quarter bound both ends', () => {
    const p = personCapacity(person({ name: 'contract', joined: '2027-02-01', left: '2027-02-26' }), Q1_2027, none);
    assert.equal(p.workingDaysInForce, 20);
    close(p.contractedEw, 4.0);
  });

  it('a joined date on a weekend starts counting on the following Monday', () => {
    const p = personCapacity(person({ name: 'w', joined: '2027-01-30' }), Q1_2027, none); // Saturday
    assert.equal(p.workingDaysInForce, 45);
  });
});

describe('working schedules', () => {
  it('a mid-quarter schedule change applies from its effective date', () => {
    // Full-time for weeks 1–4 (20 days = 4.0), then 0.5 from week 5 (45 days × 0.5 / 5 = 4.5).
    const p = personCapacity(
      person({ name: 'S', schedules: [{ fraction: 1, effectiveFrom: null }, { fraction: 0.5, effectiveFrom: '2027-02-01' }] }),
      Q1_2027,
      none,
    );
    close(p.contractedEw, 8.5);
  });

  it('picks the latest schedule in force regardless of insertion order', () => {
    const schedules = [
      { fraction: 0.5, effectiveFrom: '2027-03-01' },
      { fraction: 1, effectiveFrom: null },
      { fraction: 0.8, effectiveFrom: '2027-02-01' },
    ];
    assert.equal(scheduleFractionOn(schedules, '2027-01-15'), 1);
    assert.equal(scheduleFractionOn(schedules, '2027-02-01'), 0.8);
    assert.equal(scheduleFractionOn(schedules, '2027-03-15'), 0.5);
  });

  it('days before the first dated schedule carry no contracted time when no initial schedule exists', () => {
    const p = personCapacity(person({ name: 'late', schedules: [{ fraction: 1, effectiveFrom: '2027-02-01' }] }), Q1_2027, none);
    close(p.contractedEw, 9.0);
  });

  it('rejects schedule fractions outside (0, 1]', () => {
    assert.throws(() => personCapacity(person({ name: 'x', schedules: [{ fraction: 1.2, effectiveFrom: null }] }), Q1_2027, none));
    assert.throws(() => personCapacity(person({ name: 'x', schedules: [{ fraction: 0, effectiveFrom: null }] }), Q1_2027, none));
  });
});

describe('holidays and absences', () => {
  it('a holiday inside a leave range is counted once (X8)', () => {
    const holidays = new HolidayCalendar(['2027-02-17']); // Wednesday, inside Rob’s leave
    const p = personCapacity(person({ name: 'Rob', absences: [{ from: '2027-02-15', to: '2027-02-26' }] }), Q1_2027, holidays);
    assert.equal(p.absenceDays, 10);
    close(p.absenceEw, 2.0);
    close(p.availableEw, 11.0);
  });

  it('overlapping leave entries are counted once per day', () => {
    const p = personCapacity(
      person({
        name: 'O',
        absences: [
          { from: '2027-02-15', to: '2027-02-19' },
          { from: '2027-02-17', to: '2027-02-24' },
        ],
      }),
      Q1_2027,
      none,
    );
    assert.equal(p.absenceDays, 8); // 15–24 Feb = 8 working days
  });

  it('a holiday on a weekend has no effect', () => {
    const holidays = new HolidayCalendar(['2027-01-09']); // Saturday
    close(personCapacity(person({ name: 'H' }), Q1_2027, holidays).absenceEw, 0);
  });

  it('a holiday applies to a person only while they are in force', () => {
    const holidays = new HolidayCalendar(['2027-01-06']);
    const before = personCapacity(person({ name: 'M', joined: '2027-02-01' }), Q1_2027, holidays);
    assert.equal(before.absenceDays, 0);
  });

  it('a holiday removes only the person’s scheduled fraction of that day', () => {
    const holidays = new HolidayCalendar(['2027-01-06']);
    const p = personCapacity(person({ name: 'P', schedules: [{ fraction: 0.6, effectiveFrom: null }] }), Q1_2027, holidays);
    close(p.absenceEw, 0.12);
  });

  it('absence outside the quarter is ignored, and absence straddling the boundary is clipped', () => {
    const outside = personCapacity(person({ name: 'A', absences: [{ from: '2027-04-05', to: '2027-04-09' }] }), Q1_2027, none);
    assert.equal(outside.absenceDays, 0);
    const straddle = personCapacity(person({ name: 'B', absences: [{ from: '2026-12-28', to: '2027-01-05' }] }), Q1_2027, none);
    assert.equal(straddle.absenceDays, 2); // Mon 4, Tue 5
  });
});

describe('overhead', () => {
  it('is a percentage of the person’s own available capacity, so leave reduces it', () => {
    const p = personCapacity(person({ name: 'lead', overheadPercent: 40, absences: [{ from: '2027-01-04', to: '2027-01-08' }] }), Q1_2027, none);
    close(p.availableEw, 12.0);
    close(p.overheadEw, 4.8);
    close(p.netDeliveryEw, 7.2);
  });

  it('the team overhead ratio is undefined when available capacity is zero', () => {
    const t = teamCapacity([person({ name: 'gone', left: '2026-12-31', overheadPercent: 50 })], Q1_2027, none);
    assert.equal(t.overheadRatio, null);
    close(t.netDeliveryEw, 0);
  });

  it('rejects overhead outside 0–100', () => {
    assert.throws(() => personCapacity(person({ name: 'x', overheadPercent: 120 }), Q1_2027, none));
  });
});
