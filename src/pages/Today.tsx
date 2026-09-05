import { useNavigate } from "react-router-dom";
import {
  Camera,
  Dumbbell,
  Droplets,
  Flower2,
  Footprints,
  Play,
  ScanBarcode,
  Zap,
} from "lucide-react";
import { CountUp, MacroBar, Ring, WeekStrip } from "../components/ui";
import {
  entriesOn,
  resetAll,
  totalsFor,
  useCycle,
  useFood,
  useGym,
  useRuns,
  useSettings,
  workoutVolume,
} from "../lib/store";
import { cycleStats } from "../lib/cycle";
import {
  addDays,
  diffDays,
  fmtDayFull,
  fmtDayShort,
  fmtPace,
  isoDate,
  timeAgo,
} from "../lib/utils";

const SHORTCUTS = [
  { icon: Camera, label: "Snap food", to: "/food?add=photo", primary: true },
  { icon: ScanBarcode, label: "Scan", to: "/food?add=barcode" },
  { icon: Dumbbell, label: "Lift", to: "/gym?start=1" },
  { icon: Footprints, label: "Run", to: "/run?start=1" },
];

export default function Today() {
  const nav = useNavigate();
  const today = isoDate();
  const entries = useFood((s) => s.entries);
  const goals = useSettings((s) => s.goals);
  const workouts = useGym((s) => s.workouts);
  const runs = useRuns((s) => s.runs);
  const cycleDays = useCycle((s) => s.days);

  const totals = totalsFor(entriesOn(entries, today));
  const remaining = goals.kcal - totals.kcal;
  const over = remaining < 0;

  const lastWorkout = [...workouts].sort((a, b) => b.endedAt - a.endedAt)[0];
  const lastRun = [...runs].sort((a, b) => b.endedAt - a.endedAt)[0];
  const cs = cycleStats(cycleDays, today);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return {
      date: d,
      label: fmtDayShort(d).slice(0, 1),
      kcal: totalsFor(entriesOn(entries, d)).kcal,
    };
  });

  const hour = new Date().getHours();
  const greet = hour < 5 ? "Night shift" : hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  return (
    <div className="px-4 pb-10 pt-safe">
      {/* header */}
      <header className="flex items-end justify-between pt-6">
        <div>
          <div className="label-volt flex items-center gap-1.5">
            <Zap size={11} strokeWidth={2.6} />
            {greet} · Today
          </div>
          <h1 className="display mt-1 text-[34px] leading-none">
            {fmtDayFull(today)}
          </h1>
        </div>
        {cs.cycleDay && (
          <button
            onClick={() => nav("/cycle")}
            className="flex flex-col items-center rounded-2xl border hairline bg-card px-3.5 py-2"
          >
            <span className="display text-2xl leading-none text-volt">
              {cs.cycleDay}
            </span>
            <span className="label mt-0.5">cycle day</span>
          </button>
        )}
      </header>

      {/* calorie ring */}
      <section className="card noise relative mt-5 overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-volt/8 blur-2xl" />
        <div className="flex items-center gap-5">
          <Ring
            size={172}
            stroke={13}
            progress={totals.kcal / goals.kcal}
            danger={over}
          >
            <div className="text-center">
              <CountUp
                value={Math.abs(remaining)}
                className="display block text-[44px] leading-none"
              />
              <div className="label mt-1">
                {over ? "kcal over" : "kcal left"}
              </div>
            </div>
          </Ring>
          <div className="flex-1 space-y-3.5">
            <MacroBar label="Protein" short="P" value={totals.protein} goal={goals.protein} tone="volt" />
            <MacroBar label="Carbs" short="C" value={totals.carbs} goal={goals.carbs} tone="voltDim" />
            <MacroBar label="Fat" short="F" value={totals.fat} goal={goals.fat} tone="bone" />
            <div className="pt-0.5 font-mono text-[10px] text-ash tnum">
              {Math.round(totals.kcal).toLocaleString()} / {goals.kcal.toLocaleString()} kcal eaten
            </div>
          </div>
        </div>
      </section>

      {/* shortcuts */}
      <section className="mt-4 grid grid-cols-4 gap-2.5">
        {SHORTCUTS.map((s) => (
          <button
            key={s.label}
            onClick={() => {
              nav(s.to);
            }}
            className={
              "flex flex-col items-center gap-2 rounded-2xl border py-3.5 transition-transform active:scale-95 " +
              (s.primary
                ? "volt-glow border-volt/70 bg-volt text-ink"
                : "card-flat hairline text-bone")
            }
          >
            <s.icon size={20} strokeWidth={2.2} className={s.primary ? "text-ink" : "text-volt"} />
            <span
              className={
                "font-mono text-[9px] font-semibold uppercase tracking-wider " +
                (s.primary ? "text-ink/80" : "text-fog")
              }
            >
              {s.label}
            </span>
          </button>
        ))}
      </section>

      {/* quick cards */}
      <section className="mt-4 grid grid-cols-2 gap-2.5">
        {/* last workout */}
        <button onClick={() => nav("/gym")} className="card p-4 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <Dumbbell size={16} className="text-volt" />
            <span className="label">{lastWorkout ? timeAgo(lastWorkout.endedAt) : "—"}</span>
          </div>
          {lastWorkout ? (
            <>
              <div className="display mt-3 truncate text-lg leading-tight">{lastWorkout.name}</div>
              <div className="mt-1 font-mono text-[10px] text-fog tnum">
                {Math.round(workoutVolume(lastWorkout)).toLocaleString()} kg · {lastWorkout.exercises.length} ex
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-fog">No sessions yet</div>
          )}
          <div className="label mt-2">Last workout</div>
        </button>

        {/* last run */}
        <button onClick={() => nav("/run")} className="card p-4 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <Footprints size={16} className="text-volt" />
            <span className="label">{lastRun ? timeAgo(lastRun.endedAt) : "—"}</span>
          </div>
          {lastRun ? (
            <>
              <div className="display mt-3 text-lg leading-tight">
                {lastRun.distanceKm.toFixed(2)} <span className="text-sm text-fog">km</span>
              </div>
              <div className="mt-1 font-mono text-[10px] text-fog tnum">
                {fmtPace(lastRun.durationSec / lastRun.distanceKm)} /km
              </div>
            </>
          ) : (
            <div className="mt-3 text-xs text-fog">No runs yet</div>
          )}
          <div className="label mt-2">Last run</div>
        </button>

        {/* cycle phase */}
        <button onClick={() => nav("/cycle")} className="card p-4 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <Flower2 size={16} className="text-volt" />
            <span className="label">{cs.phase ?? "—"}</span>
          </div>
          {cs.cycleDay ? (
            <>
              <div className="display mt-3 text-lg leading-tight">Day {cs.cycleDay}</div>
              <div className="mt-1 font-mono text-[10px] text-fog">of ~{cs.avgCycle}</div>
            </>
          ) : (
            <div className="mt-3 text-xs text-fog">Log your period</div>
          )}
          <div className="label mt-2">Cycle</div>
        </button>

        {/* next period */}
        <button onClick={() => nav("/cycle")} className="card p-4 text-left active:scale-[0.98] transition-transform">
          <div className="flex items-center justify-between">
            <Droplets size={16} className="text-volt" />
            <span className="label">
              {cs.nextStart ? `in ${Math.max(0, diffDays(today, cs.nextStart))}d` : "—"}
            </span>
          </div>
          {cs.nextStart ? (
            <>
              <div className="display mt-3 text-lg leading-tight">{fmtDayShort(cs.nextStart)}</div>
              <div className="mt-1 font-mono text-[10px] text-fog">next period est.</div>
            </>
          ) : (
            <div className="mt-3 text-xs text-fog">Need 1+ cycles</div>
          )}
          <div className="label mt-2">Prediction</div>
        </button>
      </section>

      {/* week calories */}
      <section className="card mt-4 p-4">
        <div className="flex items-center justify-between">
          <span className="label">Fuel · last 7 days</span>
          <span className="font-mono text-[10px] text-ash tnum">goal {goals.kcal}</span>
        </div>
        <div className="mt-3">
          <WeekStrip
            values={week.map((w) => w.kcal)}
            labels={week.map((w) => w.label)}
            goal={goals.kcal}
            highlight={6}
          />
        </div>
      </section>

      {/* start workout nudge */}
      <button
        onClick={() => nav("/gym?start=1")}
        className="btn-volt volt-glow mt-4 flex w-full items-center justify-center gap-2 py-4 text-sm"
      >
        <Play size={16} strokeWidth={2.6} />
        Start training
      </button>

      <button
        onClick={() => {
          if (confirm("Erase ALL CoreSync data on this device? This cannot be undone.")) resetAll();
        }}
        className="mx-auto mt-6 block font-mono text-[9px] uppercase tracking-widest text-ash"
      >
        Erase all data
      </button>
    </div>
  );
}
