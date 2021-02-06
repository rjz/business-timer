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
/** Options for a new `BusinessTimer` */
export declare type BusinessTimerOpts = {
    /** A list of holidays to exclude from the usual work schedule */
    holidays?: ISODate[];
    /** The business hours for each day of the week*/
    hours?: WeeklyHours;
    /** The timezone for `holidays` and `hours`
     *
     *  To avoid bringing the full IANA database along for the ride, the timezone
     *  provided here must be understood by the `Intl.DateTimeFormat`
     *  implementation in the runtime environment.
     *
     *  This option may be safely omitted if all dates/times used with
     *  `BusinessTimer` will already be represented in an offset-less timezone
     *  (read: UTC).
     */
    timeZone?: string | null;
};
/** Default options */
export declare const DEFAULTS: BusinessTimerOpts;
/** BusinessTimer only counts time during operating hours */
export default class BusinessTimer {
    private readonly _dateTimeFormat?;
    private readonly _hours;
    private readonly _holidays;
    private _knownWorkingDays;
    constructor({ holidays, hours, timeZone, }?: BusinessTimerOpts);
    /** Compute elapsed business time (in milliseconds) between two dates */
    diff(start: DateLike, end: DateLike): number;
    /** Check whether the provided day is a workday */
    isWorkday(date: DateLike): boolean;
    /** Check whether the business is open at the given time */
    isOpen(datetime: DateLike): boolean;
    /** Turn a date-like object into an offset-less timestamp
     *
     *  Discarding offset details allows downstream calculations to avoid the
     *  vagaries of local time (see also: daylight savings).
     *
     *  It's all just math from here.
     **/
    private _toTimestamp;
    private _isWorkday;
    private _open;
    private _close;
    private _nextOpen;
    private _previousClose;
    private _lookupHours;
    private _isOpen;
}
export {};
