# Business Timer

Calculate time during working hours.

Installation
-------------------------------------------------------------------------------

```sh
$ npm i business-timer
```

Usage
-------------------------------------------------------------------------------

Pass a source file by name:

```js
import BusinessTimer from 'business-timer';

const bt = new BusinessTimer(opts);
const dt = bt.diff('2020-01-01T00:00:00Z', '2020-01-10T00:00:00Z');
console.log(dt); // 291600000
```

### Options

A new `BusinessTimer` can be configured with both weekly and holiday schedules:

```js
const opts = {
  hours: [ // Sun, Mon, ...
    null,
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    ["08:00", "17:00"],
    null,
  ],
  holidays: [
    '2021-04-01'
  ],
  timeZone: 'America/Los_Angeles',
};

const bt = new BusinessTimer(opts);
```

### diff(begin: DateLike, end: DateLike): number

Computes the time elapsed (in working hours) between two dates.

License
-------------------------------------------------------------------------------

ISC
