import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysToEngineerWeeks, HolidayCalendar, isISODate, isWeekday, workingDays } from '../src/domain/calendar.js';
import { Q1_2027 } from './helpers.js';

describe('calendar', () => {
  it('Q1 2027 example quarter has exactly 65 working days (13 weeks)', () => {
    assert.equal(workingDays(Q1_2027.start, Q1_2027.end).length, 65);
    assert.equal(isWeekday('2027-01-04'), true); // Monday
    assert.equal(isWeekday('2027-01-03'), false); // Sunday
  });

  it('quarter boundaries are inclusive on both ends', () => {
    assert.deepEqual(workingDays('2027-01-04', '2027-01-04'), ['2027-01-04']);
    assert.deepEqual(workingDays('2027-01-08', '2027-01-11'), ['2027-01-08', '2027-01-11']); // Fri, Mon
  });

  it('weekend-only ranges contribute no working days', () => {
    assert.deepEqual(workingDays('2027-01-09', '2027-01-10'), []);
  });

  it('a range ending before it starts is empty', () => {
    assert.deepEqual(workingDays('2027-01-11', '2027-01-04'), []);
  });

  it('a real calendar quarter is derived from dates, not assumed to be 13 weeks', () => {
    // 2027-01-01 (Fri) .. 2027-03-31 (Wed): 64 working days, not 65.
    assert.equal(workingDays('2027-01-01', '2027-03-31').length, 64);
  });

  it('date arithmetic crosses month and year boundaries in UTC', () => {
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2028-02-28', 1), '2028-02-29'); // leap year
    assert.equal(addDays('2027-03-28', 1), '2027-03-29'); // European DST switch day: still one day
  });

  it('validates ISO dates strictly', () => {
    assert.equal(isISODate('2027-02-29'), false);
    assert.equal(isISODate('2027-2-1'), false);
    assert.equal(isISODate('2027-02-01'), true);
  });

  it('the holiday calendar is empty unless configured', () => {
    const cal = new HolidayCalendar();
    assert.equal(cal.size, 0);
    assert.equal(cal.has('2027-01-01'), false);
  });

  it('one engineer-week is five full working days', () => {
    assert.equal(daysToEngineerWeeks(5), 1);
    assert.equal(daysToEngineerWeeks(5, 0.6), 0.6);
    assert.equal(daysToEngineerWeeks(65), 13);
  });
});
