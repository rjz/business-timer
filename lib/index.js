"use strict";
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
function startOfDay(date) {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
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
var BusinessTimer = /** @class */ (function () {
    function BusinessTimer(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.holidays, holidays = _c === void 0 ? [] : _c, _d = _b.hours, hours = _d === void 0 ? exports.DEFAULT_HOURS : _d;
        this._knownWorkingDays = new Set();
        // TODO: validation
        this._holidays = holidays;
        this._hours = hours;
        // Precompute durations
        this._parsedHours = hours.map(dailyHoursToDuration);
    }
    /** Compute elapsed business time (in milliseconds) between two dates */
    BusinessTimer.prototype.diff = function (start, end) {
        var d1 = new Date(start);
        var d2 = new Date(end);
        if (this.isBeforeOpen(d1)) {
            // We'll start counting when the business opens
            d1 = this.nextOpen(d1);
        }
        else if (this.isAfterClose(d1) || !this.isWorkingDay(d1)) {
            // We'll start counting on the next business day
            d1 = this.nextOpen(d1.getTime() + DAY);
        }
        if (this.isBeforeOpen(d2) || !this.isWorkingDay(d2)) {
            d2 = this.previousClose(d2.getTime());
        }
        else if (this.isAfterClose(d2)) {
            d2 = this.previousClose(d2);
        }
        var t1 = d1.getTime();
        var t2 = d2.getTime();
        var totalDiff = t2 - t1;
        if (totalDiff <= 0) {
            return 0;
        }
        else if (totalDiff <= DAY) {
            return totalDiff;
        }
        // Business hours on the first day
        var diff = this.close(d1) - t1;
        // Plus business hours on the last day
        diff += t2 - this.open(d2);
        // Plus business hours for all the days in between
        //
        // TODO: we could ~O(1) this when diff > 7d by computing the number of
        // days, minus weekend days, minus holidays in the range. Iteration's fine
        // for now.
        for (var t = t1 + DAY; t < t2; t += DAY) {
            var day = new Date(t);
            if (this.isWorkingDay(day)) {
                diff += this._parsedHours[day.getUTCDay()].duration;
            }
        }
        return diff;
    };
    BusinessTimer.prototype.isWorkingDay = function (d) {
        var isoDate = d.toISOString().slice(0, 10);
        if (this._knownWorkingDays.has(isoDate)) {
            return true;
        }
        var day = d.getUTCDay();
        if (this._hours[day] === null) {
            return false;
        }
        for (var _i = 0, _a = this._holidays; _i < _a.length; _i++) {
            var holiday = _a[_i];
            if (isoDate === holiday) {
                return false;
            }
        }
        this._knownWorkingDays.add(isoDate);
        return true;
    };
    BusinessTimer.prototype.open = function (d) {
        var start = this._parsedHours[d.getUTCDay()].start;
        return startOfDay(d) + start;
    };
    BusinessTimer.prototype.close = function (d) {
        var end = this._parsedHours[d.getUTCDay()].end;
        return startOfDay(d) + end;
    };
    BusinessTimer.prototype.nextOpen = function (d) {
        var day = new Date(d);
        while (!this.isWorkingDay(day)) {
            day = new Date(day.getTime() + DAY);
        }
        return new Date(this.open(day));
    };
    BusinessTimer.prototype.previousClose = function (d) {
        var prevDay = new Date(d);
        while (!this.isWorkingDay(prevDay)) {
            prevDay = new Date(prevDay.getTime() - DAY);
        }
        return new Date(this.close(prevDay));
    };
    BusinessTimer.prototype.isBeforeOpen = function (d) {
        var dailyHours = this._hours[d.getUTCDay()];
        if (dailyHours === null) {
            return true;
        }
        var startTime = dailyHours[0];
        return d.toISOString().substr(11, 5) < startTime;
    };
    BusinessTimer.prototype.isAfterClose = function (d) {
        var dailyHours = this._hours[d.getUTCDay()];
        if (dailyHours === null) {
            return true;
        }
        var endTime = dailyHours[1];
        return d.toISOString().substr(11, 5) > endTime;
    };
    return BusinessTimer;
}());
exports.default = BusinessTimer;
//# sourceMappingURL=index.js.map