// Daily practice streak (docs/research/duolingo.md §3, SPEC.md §6.1).
//
// Low bar: any one activity (an analyzed piece of writing or one exercise
// attempt) makes a day count. Missing a day is forgiven automatically — a "rest
// day" — up to 2 per calendar week (Monday to Sunday) and never more than 2 in
// a row; the miss that goes past either limit ends the streak. Rest days keep a
// streak alive but don't add to it. Today only counts once it has an activity,
// so an empty today never breaks a streak.

export const REST_DAYS_PER_WEEK = 2;
const MAX_CONSECUTIVE_REST_DAYS = 2;
export const STREAK_MILESTONES = [7, 30, 100, 365] as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type StreakSummary = { current: number; longest: number; activeToday: boolean };

// Calendar day in the given time zone as "YYYY-MM-DD" (en-CA formats that way).
export function toDayKey(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Day keys are compared and stepped as UTC midnights, which never hits DST.
function keyToUtc(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

function utcToKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

// Monday of the key's week, as a key — identifies the calendar week.
function weekOf(key: string): string {
  const time = keyToUtc(key);
  const daysSinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return utcToKey(time - daysSinceMonday * MS_PER_DAY);
}

export function computeStreak(activityDates: Date[], now: Date, timeZone?: string): StreakSummary {
  const activeDays = new Set(activityDates.map((date) => toDayKey(date, timeZone)));
  const today = toDayKey(now, timeZone);
  const activeToday = activeDays.has(today);
  if (activeDays.size === 0) return { current: 0, longest: 0, activeToday };

  const first = [...activeDays].sort()[0];
  let run = 0;
  let longest = 0;
  let consecutiveRest = 0;
  let restByWeek = new Map<string, number>();

  for (let time = keyToUtc(first); time <= keyToUtc(today); time += MS_PER_DAY) {
    const day = utcToKey(time);
    if (activeDays.has(day)) {
      run += 1;
      consecutiveRest = 0;
      longest = Math.max(longest, run);
      continue;
    }
    if (day === today) break; // not over yet

    const week = weekOf(day);
    const restThisWeek = (restByWeek.get(week) ?? 0) + 1;
    consecutiveRest += 1;
    if (restThisWeek > REST_DAYS_PER_WEEK || consecutiveRest > MAX_CONSECUTIVE_REST_DAYS) {
      run = 0;
      consecutiveRest = 0;
      restByWeek = new Map();
      continue;
    }
    restByWeek.set(week, restThisWeek);
  }

  return { current: run, longest, activeToday };
}

// The highest milestone reached by the current streak, if any.
export function reachedMilestone(current: number): number | null {
  return [...STREAK_MILESTONES].reverse().find((milestone) => current >= milestone) ?? null;
}
