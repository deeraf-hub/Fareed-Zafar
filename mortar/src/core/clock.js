/**
 * Injectable clock. Production uses wall time; the demo and tests use a simulated
 * clock that can be fast-forwarded, which is how a 10-minute vendor timeout or a
 * next-morning repair visit can be demonstrated (and tested) in seconds.
 */

export function systemClock() {
  return {
    simulated: false,
    now: () => new Date(),
    advance() {
      throw new Error("The system clock cannot be advanced. Use a simulated clock.");
    },
  };
}

/**
 * @param startIso  the simulated "now" at creation
 * @param realtime  true (demo): time keeps flowing at normal speed and can also be
 *                  fast-forwarded. false (tests): time only moves when told to.
 */
export function simulatedClock(startIso, { realtime = false } = {}) {
  const startSim = new Date(startIso).getTime();
  if (Number.isNaN(startSim)) throw new Error(`Invalid simulated clock start: ${startIso}`);
  const startReal = Date.now();
  let offset = 0;
  const elapsed = () => (realtime ? Date.now() - startReal : 0);
  const now = () => new Date(startSim + offset + elapsed());

  return {
    simulated: true,
    now,
    /** Jump forward. The app's fastForward() steps through due timers in order. */
    advance(ms) {
      offset += ms;
      return now();
    },
    set(iso) {
      offset = new Date(iso).getTime() - startSim - elapsed();
      return now();
    },
  };
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Local wall-clock parts for a timezone, e.g. { hour: 23, minute: 30, weekday: 3 }. */
export function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdays = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdays[get("weekday")],
  };
}

/** "11:30 PM" in the property's timezone. */
export function formatTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}

/** "Thu 8:00 AM" in the property's timezone. */
export function formatDayTime(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * The next instant at or after `from` whose local time is `hour:minute` in `timeZone`.
 * Walks forward minute-by-minute from the target guess, which is DST-safe and cheap.
 */
export function nextLocalTime(from, timeZone, hour, minute = 0) {
  const start = from.getTime();
  const p = localParts(from, timeZone);
  const minutesNow = p.hour * 60 + p.minute;
  const minutesTarget = hour * 60 + minute;
  let delta = minutesTarget - minutesNow;
  if (delta < 0) delta += 24 * 60;
  let candidate = start + delta * MINUTE;
  // Align to the exact minute boundary and correct for DST shifts.
  for (let i = 0; i < 180; i++) {
    const c = localParts(new Date(candidate), timeZone);
    if (c.hour === hour && c.minute === minute) break;
    candidate += MINUTE;
  }
  const aligned = new Date(candidate);
  aligned.setUTCSeconds(0, 0);
  return aligned;
}

/** Next business-day morning (Mon–Fri) at `hour` local time. */
export function nextBusinessMorning(from, timeZone, hour = 9) {
  let candidate = nextLocalTime(from, timeZone, hour);
  for (let i = 0; i < 7; i++) {
    const { weekday } = localParts(candidate, timeZone);
    if (weekday >= 1 && weekday <= 5) return candidate;
    candidate = nextLocalTime(new Date(candidate.getTime() + MINUTE), timeZone, hour);
  }
  return candidate;
}
