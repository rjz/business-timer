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

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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

export default class BusinessTimer {
  private readonly _tzFormatter?: Intl.DateTimeFormat;
  private _holidays: ISODate[];
  private _hours: WeeklyHours;
  private _parsedHours: ParsedHours[];
  private _knownWorkingDays: Set<ISODate> = new Set();

  constructor({
    holidays = [],
    hours = DEFAULT_HOURS,
    timeZone = null,
  }: BusinessTimerOpts = {}) {
    if (timeZone) {
      this._tzFormatter = new Intl.DateTimeFormat("en-ca", {
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

    this._hours = hours;

    // TODO: validation
    this._holidays = holidays;

    // Precompute durations
    this._parsedHours = hours.map(dailyHoursToDuration);
  }

  private _toUTC(d: Date): Date {
    if (!this._tzFormatter) {
      return d;
    }
    const hackyISODate = this._tzFormatter.format(d).replace(", ", "T") + "Z";
    return new Date(hackyISODate);
  }

  /** Compute elapsed business time (in milliseconds) between two dates */
  public diff(start: DateLike, end: DateLike): number {
    let d1 = this._toUTC(new Date(start));
    let d2 = this._toUTC(new Date(end));

    if (this.isBeforeOpen(d1)) {
      // We'll start counting when the business opens
      d1 = this.nextOpen(d1);
    } else if (this.isAfterClose(d1) || !this.isWorkingDay(d1)) {
      // We'll start counting on the next business day
      d1 = this.nextOpen(d1.getTime() + DAY);
    }

    if (this.isBeforeOpen(d2) || !this.isWorkingDay(d2)) {
      d2 = this.previousClose(d2.getTime());
    } else if (this.isAfterClose(d2)) {
      d2 = this.previousClose(d2);
    }

    const t1 = d1.getTime();
    const t2 = d2.getTime();
    const totalDiff = t2 - t1;

    if (totalDiff <= 0) {
      return 0;
    } else if (totalDiff <= DAY) {
      return totalDiff;
    }

    // Business hours on the first day
    let diff = this.close(d1) - t1;

    // Plus business hours on the last day
    diff += t2 - this.open(d2);

    // Plus business hours for all the days in between
    //
    // TODO: we could ~O(1) this when diff > 7d by computing the number of
    // days, minus weekend days, minus holidays in the range. Iteration's fine
    // for now.
    for (let t = t1 + DAY; t < t2; t += DAY) {
      const day = new Date(t);
      if (this.isWorkingDay(day)) {
        diff += this._parsedHours[day.getUTCDay()].duration;
      }
    }

    return diff;
  }

  private isWorkingDay(d: Date): boolean {
    const isoDate = d.toISOString().slice(0, 10);
    if (this._knownWorkingDays.has(isoDate)) {
      return true;
    }

    const day = d.getUTCDay();
    if (this._hours[day] === null) {
      return false;
    }

    for (const holiday of this._holidays) {
      if (isoDate === holiday) {
        return false;
      }
    }

    this._knownWorkingDays.add(isoDate);
    return true;
  }

  private open(d: Date): number {
    const { start } = this._parsedHours[d.getUTCDay()];
    return startOfDay(d) + start;
  }

  private close(d: Date): number {
    const { end } = this._parsedHours[d.getUTCDay()];
    return startOfDay(d) + end;
  }

  private nextOpen(d: DateLike): Date {
    let day = new Date(d);
    while (!this.isWorkingDay(day)) {
      day = new Date(day.getTime() + DAY);
    }

    return new Date(this.open(day));
  }

  private previousClose(d: DateLike): Date {
    let prevDay = new Date(d);
    while (!this.isWorkingDay(prevDay)) {
      prevDay = new Date(prevDay.getTime() - DAY);
    }

    return new Date(this.close(prevDay));
  }

  private isBeforeOpen(d: Date): boolean {
    const dailyHours = this._hours[d.getUTCDay()];
    if (dailyHours === null) {
      return true;
    }

    const [startTime] = dailyHours;
    return d.toISOString().substr(11, 5) < startTime;
  }

  private isAfterClose(d: Date): boolean {
    const dailyHours = this._hours[d.getUTCDay()];
    if (dailyHours === null) {
      return true;
    }

    const [, endTime] = dailyHours;
    return d.toISOString().substr(11, 5) > endTime;
  }
}
