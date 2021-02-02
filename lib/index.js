"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HOURS = void 0;
var SECOND = 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
exports.DEFAULT_HOURS = [
    null,
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    null,
];
function isoTimeToDuration(isoTime) {
    var hours = isoTime.substr(0, 2);
    var duration = parseInt(hours, 10) * HOUR;
    var minutes = isoTime.substr(3, 2);
    if (minutes) {
        duration += parseInt(minutes, 10) * MINUTE;
    }
    var seconds = isoTime.substr(5, 2);
    if (seconds) {
        duration += parseInt(seconds, 10) * SECOND;
    }
    return duration;
}
function startOfDay(ts) {
    return Math.floor(ts / DAY) * DAY;
}
function secondsSinceMidnight(ts) {
    return ts % DAY;
}
function dailyHoursToDuration(dailyHours) {
    var parsed = { start: -1, end: -1, duration: -1 };
    if (dailyHours) {
        parsed.start = isoTimeToDuration(dailyHours[0]);
        parsed.end = isoTimeToDuration(dailyHours[1]);
        parsed.duration = parsed.end - parsed.start;
    }
    return parsed;
}
function isoDateToDaysSinceEpoch(isoDate) {
    var _a = isoDate.split("-").map(function (x) { return parseInt(x, 10); }), year = _a[0], month = _a[1], day = _a[2];
    return Math.floor(Date.UTC(year, month - 1, day) / DAY);
}
var DEFAULT_OPTS = {
    holidays: [],
    hours: exports.DEFAULT_HOURS,
    timeZone: null,
};
/** BusinessTimer only counts time during operating hours */
var BusinessTimer = /** @class */ (function () {
    function BusinessTimer(_a) {
        // TODO: validate options
        var _b = _a === void 0 ? DEFAULT_OPTS : _a, _c = _b.holidays, holidays = _c === void 0 ? [] : _c, _d = _b.hours, hours = _d === void 0 ? exports.DEFAULT_HOURS : _d, _e = _b.timeZone, timeZone = _e === void 0 ? null : _e;
        this._holidays = new Set();
        this._knownWorkingDays = new Set();
        if (timeZone) {
            // `eu-se` (YYYY-MM-DD) to simplify parsing.
            this._dateTimeFormat = new Intl.DateTimeFormat("eu-se", {
                timeZone: timeZone,
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            });
        }
        for (var _i = 0, holidays_1 = holidays; _i < holidays_1.length; _i++) {
            var isoHoliday = holidays_1[_i];
            this._holidays.add(isoDateToDaysSinceEpoch(isoHoliday));
        }
        this._hours = hours.map(dailyHoursToDuration);
    }
    /** Compute elapsed business time (in milliseconds) between two dates */
    BusinessTimer.prototype.diff = function (start, end) {
        var t1 = this._toTimestamp(new Date(start));
        // If the starting time falls outside of business hours, fast-forward to the
        // start of business on the next working day.
        if (!this._isOpen(t1) || !this._isWorkingDay(t1)) {
            t1 = this._nextOpen(t1);
        }
        // If the ending time falls outside of business hours, rewind to close of
        // business on the most recent working day.
        var t2 = this._toTimestamp(new Date(end));
        if (!this._isOpen(t2) || !this._isWorkingDay(t2)) {
            t2 = this._previousClose(t2);
        }
        // Short-circuit cases where the adjusted time range is negative or fall
        // within the same business day.
        var totalDiff = t2 - t1;
        if (totalDiff <= 0) {
            return 0;
        }
        else if (totalDiff <= DAY) {
            return totalDiff;
        }
        // Business hours on the first day
        var diff = this._close(t1) - t1;
        // Plus business hours on the last day
        diff += t2 - this._open(t2);
        // Plus business hours for all the days in between
        //
        // TODO: we could ~O(1) this when diff > 7d by computing the number of
        // days, minus weekend days, minus holidays in the range. Iteration's fine
        // for now.
        for (var t = t1 + DAY; t < t2; t += DAY) {
            if (this._isWorkingDay(t)) {
                diff += this._lookupHours(t).duration;
            }
        }
        return diff;
    };
    BusinessTimer.prototype.isOpenDay = function (dl) {
        var ts = this._toTimestamp(dl);
        return this._isWorkingDay(ts);
    };
    BusinessTimer.prototype.isOpenTime = function (dl) {
        var ts = this._toTimestamp(dl);
        return this._isOpen(ts);
    };
    /** Turn a date-like object into an epoch timestamp
     *
     *  This method enables neighboring calculations to avoid the nastiness of
     *  dealing in local time by using a cached `Intl.DateTimeFormat` instance (if
     *  available; see `this._dateTimeFormat`) to project inputs into
     *  (offset-less) timestamps.
     *
     *  It's all just math from here.
     **/
    BusinessTimer.prototype._toTimestamp = function () {
        var dl = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            dl[_i] = arguments[_i];
        }
        var d = new (Date.bind.apply(Date, __spreadArrays([void 0], dl)))();
        if (!this._dateTimeFormat) {
            return d.getTime();
        }
        var hackyISODate = this._dateTimeFormat.format(d).replace(", ", "T") + "Z";
        return new Date(hackyISODate).getTime();
    };
    BusinessTimer.prototype._isWorkingDay = function (ts) {
        var daysSinceEpoch = Math.floor(ts / DAY);
        if (this._knownWorkingDays.has(daysSinceEpoch)) {
            return true;
        }
        var start = this._lookupHours(ts).start;
        if (start === -1) {
            return false;
        }
        if (this._holidays.has(daysSinceEpoch)) {
            return false;
        }
        this._knownWorkingDays.add(daysSinceEpoch);
        return true;
    };
    BusinessTimer.prototype._open = function (ts) {
        var start = this._lookupHours(ts).start;
        return startOfDay(ts) + start;
    };
    BusinessTimer.prototype._close = function (ts) {
        var end = this._lookupHours(ts).end;
        return startOfDay(ts) + end;
    };
    BusinessTimer.prototype._nextOpen = function (ts) {
        var start = this._lookupHours(ts).start;
        if (start === -1 || secondsSinceMidnight(ts) >= start) {
            // Advance to the next day if this isn't a work day (or we're already past
            // opening time).
            ts = startOfDay(ts + DAY);
        }
        while (!this._isWorkingDay(ts)) {
            ts += DAY;
        }
        return this._open(ts);
    };
    BusinessTimer.prototype._previousClose = function (ts) {
        var end = this._lookupHours(ts).end;
        if (end === -1 || secondsSinceMidnight(ts) <= end) {
            // Rewind to the previous day if this isn't a work day or we're still
            // before closing time.
            ts = startOfDay(ts - DAY);
        }
        while (!this._isWorkingDay(ts)) {
            ts -= DAY;
        }
        return this._close(ts);
    };
    BusinessTimer.prototype._lookupHours = function (ts) {
        var day = (Math.floor(ts / DAY) + 4) % 7; // ~ Date.getUTCDay
        return this._hours[day];
    };
    BusinessTimer.prototype._isOpen = function (ts) {
        var _a = this._lookupHours(ts), end = _a.end, start = _a.start;
        if (start === -1) {
            return true;
        }
        var secs = secondsSinceMidnight(ts);
        return secs >= start && secs <= end;
    };
    return BusinessTimer;
}());
exports.default = BusinessTimer;
//# sourceMappingURL=index.js.map