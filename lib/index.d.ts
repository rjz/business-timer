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
    private readonly _tzFormatter?;
    private _holidays;
    private _hours;
    private _parsedHours;
    private _knownWorkingDays;
    constructor({ holidays, hours, timeZone, }?: BusinessTimerOpts);
    private _toUTC;
    /** Compute elapsed business time (in milliseconds) between two dates */
    diff(start: DateLike, end: DateLike): number;
    private isWorkingDay;
    private open;
    private close;
    private nextOpen;
    private previousClose;
    private isBeforeOpen;
    private isAfterClose;
}
export {};
