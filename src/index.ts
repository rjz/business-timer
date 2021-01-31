const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** YYYY-MM-DD */
type ISODate = string;

/** hh:mm:ss */
type ISOTime = string;

type DailyHours = null | [ISOTime, ISOTime];

type DateLike = Date | string | number;

/** [Sun, Mon, Tue, ...] */
type WeeklyHours = readonly [
  DailyHours,
  DailyHours,
  DailyHours,
  DailyHours,
  DailyHours,
  DailyHours,
  DailyHours
];

export const DEFAULT_HOURS: WeeklyHours = [
  null,
  ["08:00", "17:00"],
  ["08:00", "17:00"],
  ["08:00", "17:00"],
  ["08:00", "17:00"],
  ["08:00", "17:00"],
  null,
];

export type BusinessTimerOpts = {
  holidays?: ISODate[];
  hours?: WeeklyHours;
  timeZone?: string | null;
};

function isoTimeToDuration(isoTime: ISOTime): number {
  const hours = isoTime.substr(0, 2);
  let duration = parseInt(hours, 10) * HOUR;

  const minutes = isoTime.substr(3, 2);
  if (minutes) {
    duration += parseInt(minutes, 10) * MINUTE;
  }

  const seconds = isoTime.substr(5, 2);
  if (seconds) {
    duration += parseInt(seconds, 10) * SECOND;
  }

  return duration;
}

function startOfDay(ts: number): number {
  return Math.floor(ts / DAY) * DAY;
}

function secondsSinceMidnight(ts: number): number {
  return ts % DAY;
}

type ParsedHours = { start: number; end: number; duration: number };

function dailyHoursToDuration(dailyHours: DailyHours): ParsedHours {
  const parsed = { start: -1, end: -1, duration: -1 };
  if (dailyHours) {
    parsed.start = isoTimeToDuration(dailyHours[0]);
    parsed.end = isoTimeToDuration(dailyHours[1]);
    parsed.duration = parsed.end - parsed.start;
  }

  return parsed;
}

type DaysSinceEpoch = number;

export default class BusinessTimer {
  private readonly _dateTimeFormat?: Intl.DateTimeFormat;
  private readonly _hours: ParsedHours[];
  private readonly _holidays: Set<DaysSinceEpoch> = new Set();
  private _knownWorkingDays: Set<DaysSinceEpoch> = new Set();

  constructor({
    holidays = [],
    hours = DEFAULT_HOURS,
    timeZone = null,
  }: BusinessTimerOpts = {}) {
    // TODO: validation

    if (timeZone) {
      // `en-ca` (YYYY-MM-DD) to simplify parsing.
      this._dateTimeFormat = new Intl.DateTimeFormat("en-ca", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }

    // Parse holidays into their offset (in days) from the start of the epoch
    for (const h of holidays) {
      const [year, month, day] = h.split("-").map((x) => parseInt(x, 10));
      this._holidays.add(Math.floor(Date.UTC(year, month - 1, day) / DAY));
    }

    // Precompute durations
    this._hours = hours.map(dailyHoursToDuration);
  }

  /** Compute elapsed business time (in milliseconds) between two dates */
  public diff(start: DateLike, end: DateLike): number {
    let t1 = this._toTimestamp(new Date(start));

    // If the starting time falls outside of business hours, fast-forward to the
    // start of business on the next working day.
    if (!this._isOpen(t1) || !this._isWorkingDay(t1)) {
      t1 = this._nextOpen(t1);
    }

    // If the ending time falls outside of business hours, rewind to close of
    // business on the most recent working day.
    let t2 = this._toTimestamp(new Date(end));
    if (!this._isOpen(t2) || !this._isWorkingDay(t2)) {
      t2 = this._previousClose(t2);
    }

    // Short-circuit cases where the adjusted time range is negative or fall
    // within the same business day.
    const totalDiff = t2 - t1;
    if (totalDiff <= 0) {
      return 0;
    } else if (totalDiff <= DAY) {
      return totalDiff;
    }

    // Business hours on the first day
    let diff = this._close(t1) - t1;

    // Plus business hours on the last day
    diff += t2 - this._open(t2);

    // Plus business hours for all the days in between
    //
    // TODO: we could ~O(1) this when diff > 7d by computing the number of
    // days, minus weekend days, minus holidays in the range. Iteration's fine
    // for now.
    for (let t = t1 + DAY; t < t2; t += DAY) {
      if (this._isWorkingDay(t)) {
        diff += this._lookupHours(t).duration;
      }
    }

    return diff;
  }

  public isOpenDay(dl: DateLike): boolean {
    const ts = this._toTimestamp(dl);
    return this._isWorkingDay(ts);
  }

  public isOpenTime(dl: DateLike): boolean {
    const ts = this._toTimestamp(dl);
    return this._isOpen(ts);
  }

  private _toTimestamp(dl: DateLike): number {
    const d = new Date(dl);
    if (!this._dateTimeFormat) {
      return d.getTime();
    }

    // Map the date onto a virtual, "UTC-like" timeline by pretending the local
    // time determined by `Intl.DateTimeFormat` is an offset-less ISO timestamp.
    const hackyISODate =
      this._dateTimeFormat.format(d).replace(", ", "T") + "Z";
    return new Date(hackyISODate).getTime();
  }

  private _isWorkingDay(ts: number): boolean {
    const daysSinceEpoch = Math.floor(ts / DAY);
    if (this._knownWorkingDays.has(daysSinceEpoch)) {
      return true;
    }

    const { start } = this._lookupHours(ts);
    if (start === -1) {
      return false;
    }

    if (this._holidays.has(daysSinceEpoch)) {
      return false;
    }

    this._knownWorkingDays.add(daysSinceEpoch);
    return true;
  }

  private _open(ts: number): number {
    const { start } = this._lookupHours(ts);
    return startOfDay(ts) + start;
  }

  private _close(ts: number): number {
    const { end } = this._lookupHours(ts);
    return startOfDay(ts) + end;
  }

  private _nextOpen(ts: number): number {
    const { start } = this._lookupHours(ts);
    if (start === -1 || secondsSinceMidnight(ts) >= start) {
      // Advance to the next day if this isn't a work day (or we're already past
      // opening time).
      ts = startOfDay(ts + DAY);
    }

    while (!this._isWorkingDay(ts)) {
      ts += DAY;
    }

    return this._open(ts);
  }

  private _previousClose(ts: number): number {
    const { end } = this._lookupHours(ts);
    if (end === -1 || secondsSinceMidnight(ts) <= end) {
      // Rewind to the previous day if this isn't a work day or we're still
      // before closing time.
      ts = startOfDay(ts - DAY);
    }

    while (!this._isWorkingDay(ts)) {
      ts -= DAY;
    }

    return this._close(ts);
  }

  private _lookupHours(ts: number): ParsedHours {
    const day = (Math.floor(ts / DAY) + 4) % 7; // ~ Date.getUTCDay
    return this._hours[day];
  }

  private _isOpen(ts: number): boolean {
    const { end, start } = this._lookupHours(ts);
    if (start === -1) {
      return true;
    }

    const secs = secondsSinceMidnight(ts);
    return secs >= start && secs <= end;
  }
}
