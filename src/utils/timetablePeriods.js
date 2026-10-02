// Canonical timetable grid shared by the HOD editor and every read-only portal.
//
// The master grid is authored once here so a slot's duration can never drift
// away from the column it was drawn in. Slot rows in the database carry only a
// start/end pair, and the two are computed independently on the way in and on
// the way out — when those two computations disagree, a two-period lab is
// stored as a single period and every downstream portal renders it truncated.

// Mirrors the reader portals' own break test: HOD-authored non-academic rows and
// the client-injected break windows both count as non-teaching time.
const BREAK_KINDS = new Set(['break', 'non-academic']);

// `pos` is the array position and is what adjacency is derived from; the grid
// interleaves breaks, so a teaching-period ordinal would point at the wrong
// row.
export const TIMETABLE_PERIODS = [
  { pos: 0, index: 0, start: '09:10', end: '10:05' },
  { pos: 1, index: 1, start: '10:05', end: '11:00' },
  { pos: 2, break: true, kind: 'coffee', start: '11:00', end: '11:15' },
  { pos: 3, index: 2, start: '11:15', end: '12:10' },
  { pos: 4, index: 3, start: '12:10', end: '13:05' },
  { pos: 5, break: true, kind: 'food', start: '13:05', end: '13:45' },
  { pos: 6, index: 4, start: '13:45', end: '14:40' },
  { pos: 7, index: 5, start: '14:40', end: '15:35' },
  { pos: 8, index: 6, start: '15:35', end: '16:30' },
];

// "09:10:00" / "09:10" -> 550. Null for anything unparseable so callers can
// treat a missing time as "untimed" rather than silently sorting it to the top.
export const toMinutes = (timeString) => {
  const match = String(timeString ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const toClock = (minutes) => {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mins = String(minutes % 60).padStart(2, '0');
  return `${hours}:${mins}`;
};

const PERIODS_BY_START = new Map(
  TIMETABLE_PERIODS.filter((period) => !period.break).map((period) => [
    period.start,
    period,
  ])
);

// True for the slot types the HOD grid draws across two consecutive periods.
export const isSpanSlotType = (slot) => {
  const type = String(slot?.slot_type ?? slot?.type ?? '').trim().toLowerCase();
  return type === 'lab' || type === 'skill';
};

export const isBreakSlotType = (slot) => {
  const type = String(slot?.slot_type ?? slot?.type ?? '').trim().toLowerCase();
  return BREAK_KINDS.has(type) || Boolean(slot?.break_kind);
};

/**
 * End of the teaching block a slot starting at `startTime` occupies.
 *
 * A span slot (lab / skill) runs into the following period, because the grid
 * draws it across both columns. It stops at its own period end when the next
 * column is a break or the day runs out — a lab that begins at 10:05 must not
 * be stretched across the 11:00 break.
 *
 * Returns an "HH:MM:00" clock string, or null when `startTime` is not a
 * known period boundary (in which case callers keep whatever the row carries).
 */
export const getPeriodEnd = (startTime, { span = false } = {}) => {
  const startMinutes = toMinutes(startTime);
  if (startMinutes === null) return null;

  const period = PERIODS_BY_START.get(toClock(startMinutes));
  if (!period) return null;

  let endMinutes = toMinutes(period.end);

  if (span) {
    const next = TIMETABLE_PERIODS[period.pos + 1];
    // Only the immediately following column counts, and only when it is itself
    // a period: a lab starting at 10:05 must stop at 11:00 rather than stretch
    // across the break that follows.
    if (next && !next.break) {
      endMinutes = toMinutes(next.end);
    }
  }

  return `${toClock(endMinutes)}:00`;
};

/**
 * Widen two-period slots that were stored with a single period's end time.
 *
 * Rows written before end_time was derived from the grid carry 09:10 -> 10:05
 * for a lab that runs to 11:00, and nothing rewrites them afterwards, so every
 * portal renders the lab at half length. This repairs such rows in place.
 *
 * A row is only widened when no sibling starts exactly where it ends: if a
 * second row already picks up there, the lab was stored as two halves and
 * widening the first would make the pair overlap. Widening is one-way — a row
 * already longer than the grid is left untouched.
 *
 * Pure: returns new objects only for the rows it actually changes.
 */
export const restoreSpanDurations = (slots) => {
  if (!Array.isArray(slots) || slots.length === 0) return slots;

  const startMinutes = new Set(
    slots.map((slot) => toMinutes(slot?.start_time)).filter((value) => value !== null)
  );

  return slots.map((slot) => {
    if (!isSpanSlotType(slot) || isBreakSlotType(slot)) return slot;

    const spanEnd = getPeriodEnd(slot?.start_time, { span: true });
    if (!spanEnd) return slot;

    const end = toMinutes(slot?.end_time);
    const spanEndMinutes = toMinutes(spanEnd);
    if (end === null || spanEndMinutes === null || end >= spanEndMinutes) return slot;
    if (startMinutes.has(end)) return slot;

    return { ...slot, end_time: spanEnd };
  });
};