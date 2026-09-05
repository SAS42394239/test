import type { CycleDay, CycleStats, PeriodBlock } from "./types";
import { addDays, diffDays, isoDate } from "./utils";

/** group logged period days into consecutive blocks (sorted, oldest first) */
export function periodBlocks(days: Record<string, CycleDay>): PeriodBlock[] {
  const periodDates = Object.values(days)
    .filter((d) => d.period)
    .map((d) => d.date)
    .sort();
  const blocks: PeriodBlock[] = [];
  for (const date of periodDates) {
    const last = blocks[blocks.length - 1];
    if (last && diffDays(last.days[last.days.length - 1], date) === 1) {
      last.days.push(date);
    } else {
      blocks.push({ start: date, days: [date] });
    }
  }
  return blocks;
}

const median = (nums: number[]) => {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function cycleStats(
  days: Record<string, CycleDay>,
  today = isoDate()
): CycleStats {
  const blocks = periodBlocks(days);
  const starts = blocks.map((b) => b.start);

  // cycle lengths from consecutive starts, filtering outliers
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = diffDays(starts[i - 1], starts[i]);
    if (len >= 18 && len <= 60) lengths.push(len);
  }
  const recent = lengths.slice(-6);
  const cyclesUsed = recent.length;
  const avgCycle = cyclesUsed
    ? Math.round(recent.reduce((a, b) => a + b, 0) / cyclesUsed)
    : 28;

  const periodLens = blocks
    .map((b) => b.days.length)
    .filter((n) => n >= 1 && n <= 12)
    .slice(-6);
  const avgPeriod = periodLens.length
    ? Math.max(1, Math.round(median(periodLens)))
    : 5;

  const lastStart = starts.length ? starts[starts.length - 1] : null;

  let nextStart: string | null = null;
  let nextEnd: string | null = null;
  let ovulation: string | null = null;
  let fertileStart: string | null = null;
  let fertileEnd: string | null = null;
  let cycleDay: number | null = null;
  let phase: string | null = null;

  if (lastStart) {
    nextStart = addDays(lastStart, avgCycle);
    // if prediction already passed, roll forward
    while (diffDays(today, nextStart) < 0) {
      nextStart = addDays(nextStart, avgCycle);
    }
    nextEnd = addDays(nextStart, avgPeriod - 1);
    ovulation = addDays(nextStart, -14);
    fertileStart = addDays(ovulation, -5);
    fertileEnd = addDays(ovulation, 1);

    cycleDay = diffDays(lastStart, today) + 1;
    const ovDay = diffDays(lastStart, ovulation) + 1;
    if (cycleDay <= avgPeriod && days[today]?.period) phase = "Menstrual";
    else if (cycleDay <= avgPeriod && cycleDay <= 5) phase = "Menstrual";
    else if (cycleDay < ovDay - 1) phase = "Follicular";
    else if (cycleDay <= ovDay + 2) phase = "Ovulation";
    else if (cycleDay <= avgCycle) phase = "Luteal";
    else phase = "Awaiting period";
  }

  return {
    avgCycle,
    avgPeriod,
    lastStart,
    cycleDay,
    nextStart,
    nextEnd,
    ovulation,
    fertileStart,
    fertileEnd,
    phase,
    cyclesUsed,
  };
}

export const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Bloating",
  "Fatigue",
  "Tender",
  "Acne",
  "Backache",
  "Nausea",
  "Insomnia",
  "Cravings",
];

export const MOODS = ["Great", "Good", "Steady", "Low", "Irritable", "Anxious"];

export const FLOWS = [
  { id: "light", label: "Light", dots: 1 },
  { id: "medium", label: "Medium", dots: 2 },
  { id: "heavy", label: "Heavy", dots: 3 },
] as const;
