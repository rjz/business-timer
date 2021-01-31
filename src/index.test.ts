import BusinessTimer, { BusinessTimerOpts } from "./index";
const HOUR = 3600 * 1000;

const HOLIDAYS = [
  "2021-01-07", // Happy Thursday!
];

const tests: [string, [string, string, BusinessTimerOpts?], number][] = [
  [
    "Friday morning",
    ["2021-01-01T08:30:00Z", "2021-01-01T09:00:00Z"],
    0.5 * HOUR,
  ],
  ["Friday late", ["2021-01-01T16:30:00Z", "2021-01-01T20:30:00Z"], 0.5 * HOUR],

  [
    "Friday all day",
    ["2021-01-01T08:30:00Z", "2021-01-01T17:30:00Z"],
    8.5 * HOUR,
  ],
  [
    "Friday to Saturday early",
    ["2021-01-01T16:30:00Z", "2021-01-02T04:30:00Z"],
    0.5 * HOUR,
  ],
  [
    "Friday after hours",
    ["2021-01-01T17:30:00Z", "2021-01-01T18:30:00Z"],
    0 * HOUR,
  ],
  [
    "Friday to first-thing Monday",
    ["2021-01-01T08:00:00Z", "2021-01-04T08:00:00Z"],
    9 * HOUR,
  ],
  [
    "Monday late to Tuesday",
    ["2021-01-04T20:00:00Z", "2021-01-05T10:00:00Z"],
    2 * HOUR,
  ],
  [
    "Monday early to Monday late",
    ["2021-01-04T05:00:00Z", "2021-01-04T20:00:00Z"],
    9 * HOUR,
  ],
  [
    "Friday to following Monday",
    ["2021-01-01T08:00:00Z", "2021-01-11T08:00:00Z"],
    6 * 9 * HOUR,
  ],
  ["Saturday to Saturday", ["2021-01-02T08:00:00Z", "2021-01-02T10:00:00Z"], 0],

  [
    "Saturday to Monday",
    ["2021-01-02T08:00:00Z", "2021-01-04T10:00:00Z"],
    2 * HOUR,
  ],
  [
    "Friday to following Monday with Holiday",
    ["2021-01-01T08:00:00Z", "2021-01-11T08:00:00Z", { holidays: HOLIDAYS }],
    5 * 9 * HOUR,
  ],
  [
    "Starting on Holiday to next Monday",
    ["2021-01-07T10:00:00Z", "2021-01-11T08:00:00Z", { holidays: HOLIDAYS }],
    9 * HOUR,
  ],
  [
    "Starting before-hours on Holiday to next Monday",
    ["2021-01-07T04:00:00Z", "2021-01-11T08:00:00Z", { holidays: HOLIDAYS }],
    9 * HOUR,
  ],
  [
    "Starting after-hours on Holiday to next Monday",
    ["2021-01-07T22:00:00Z", "2021-01-11T08:00:00Z", { holidays: HOLIDAYS }],
    9 * HOUR,
  ],
  [
    "(DST) LA: springing forward",
    [
      "2021-03-12T16:00:00-08:00",
      "2021-03-15T10:00:00-07:00",
      { timeZone: "America/Los_Angeles" },
    ],
    3 * HOUR,
  ],
  [
    "(DST) LA: springing forward through holiday",
    [
      "2021-03-12T16:00:00-08:00",
      "2021-03-16T10:00:00-07:00",
      { holidays: ["2021-03-15"], timeZone: "America/Los_Angeles" },
    ],
    3 * HOUR,
  ],

  [
    "(DST) LA: falling back",
    [
      "2021-11-05T16:00:00-07:00",
      "2021-11-08T10:00:00-08:00",
      { timeZone: "America/Los_Angeles" },
    ],
    3 * HOUR,
  ],
  [
    "(DST) LA: falling back through holiday",
    [
      "2021-03-12T16:00:00-08:00",
      "2021-03-15T10:00:00-07:00",
      { holidays: ["2021-11-08"], timeZone: "America/Los_Angeles" },
    ],
    3 * HOUR,
  ],

  [
    "(TZ) Singapore: anytime",
    [
      "2021-11-05T16:00:00+08:00",
      "2021-11-08T10:00:00+08:00",
      { timeZone: "Asia/Singapore" },
    ],
    3 * HOUR,
  ],

  [
    "(TZ) Singapore: through holiday",
    [
      "2021-11-05T16:00:00+08:00",
      "2021-11-09T10:00:00+08:00",
      { holidays: ["2021-11-08"], timeZone: "Asia/Singapore" },
    ],
    3 * HOUR,
  ],
];

const result = {
  fail: 0,
  pass: 0,
  skipped: tests.length,
};

tests.forEach(function([desc, args, expected], i) {
  const t = new BusinessTimer(args[2]);
  const actual = t.diff(args[0], args[1]);
  result.skipped--;
  if (actual === expected) {
    result.pass++;
  } else {
    console.log(
      `FAIL#${i} '${desc}'`,
      JSON.stringify(
        {
          actual: actual / HOUR,
          expected: expected / HOUR,
          args,
        },
        null,
        2
      )
    );
    result.fail++;
  }
});

console.log(result);
if (result.fail > 0) {
  process.exit(1);
}
