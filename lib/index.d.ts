/** YYYY-MM-DD */
declare type ISODate = string;
/** hh:mm:ss */
declare type ISOTime = string;
declare type DailyHours = null | [ISOTime, ISOTime];
declare type DateLike = Date | string | number;
/** [Sun, Mon, Tue, ...] */
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
    holidays?: ISODate[];
    hours?: WeeklyHours;
    timeZone?: string | null;
};
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
