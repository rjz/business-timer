/** YYYY-MM-DD */
declare type ISODate = string;
/** hh:mm:ss */
declare type ISOTime = string;
declare type DailyHours = null | [ISOTime, ISOTime];
declare type DateLike = Date | string | number;
/** A seven-item array describing operating hours for each day of the week
 *
 * Order follows JS' `getDay()`: [Sun, Mon, Tue, ...]
 * */
declare type WeeklyHours = readonly [
    DailyHours,
    DailyHours,
    DailyHours,
    DailyHours,
    DailyHours,
    DailyHours,
    DailyHours
];
export declare const DEFAULT_HOURS: WeeklyHours;
export declare type BusinessTimerOpts = {
    /** A list of holidays to exclude from the usual work schedule */
    holidays?: ISODate[];
    /** The business hours for each day of the week*/
    hours?: WeeklyHours;
    /** The timezone to use for holidays and hours.
     *
     *  To avoid bringing the full IANA database along for the ride, the timezone
     *  provided here must be understood by `Intl.DateTimeFormat`. Omitting this
     *  argument will yield unpredictable results when running the timer with
     *  non-UTC dates across different environments.
     *
     *  YMMV.
     */
    timeZone?: string | null;
};
/** BusinessTimer only counts time during operating hours */
export default class BusinessTimer {
    private readonly _dateTimeFormat?;
    private readonly _hours;
    private readonly _holidays;
    private _knownWorkingDays;
    constructor({ holidays, hours, timeZone, }?: BusinessTimerOpts);
    /** Compute elapsed business time (in milliseconds) between two dates */
    diff(start: DateLike, end: DateLike): number;
    isOpenDay(dl: DateLike): boolean;
    isOpenTime(dl: DateLike): boolean;
    /** Turn a date-like object into an epoch timestamp
     *
     *  This method enables neighboring calculations to avoid the nastiness of
     *  dealing in local time by using a cached `Intl.DateTimeFormat` instance (if
     *  available; see `this._dateTimeFormat`) to project inputs into
     *  (offset-less) timestamps.
     *
     *  It's all just math from here.
     **/
    private _toTimestamp;
    private _isWorkingDay;
    private _open;
    private _close;
    private _nextOpen;
    private _previousClose;
    private _lookupHours;
    private _isOpen;
}
export {};
