import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BicepsFlexed,
  Dumbbell,
  History,
  Play,
  Repeat,
  Search,
  Trash2,
  Trophy,
  Weight,
  X,
} from "lucide-react";
import { AnimatePresence, Empty, Segmented, Sheet } from "../components/ui";
import WorkoutSession from "./WorkoutSession";
import { EXERCISES, findExercise } from "../lib/exercises";
import {
  exercisePBs,
  useGym,
  workoutVolume,
} from "../lib/store";
import { cn, fmtClock, fmtInt, timeAgo } from "../lib/utils";
import type { Workout } from "../lib/types";

type Tab = "train" | "history" | "library";

export default function Gym() {
  const [params, setParams] = useSearchParams();
  const active = useGym((s) => s.active);
  const workouts = useGym((s) => s.workouts);
  const [tab, setTab] = useState<Tab>("train");
  const [detail, setDetail] = useState<Workout | null>(null);
  const [exDetail, setExDetail] = useState<string | null>(null);

  useEffect(() => {
    if (params.get("start") === "1") {
      if (!useGym.getState().active) useGym.getState().startWorkout();
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  if (active) return <WorkoutSession />;

  return (
    <div className="px-4 pb-10 pt-safe">
      <header className="pt-6">
        <div className="label-volt">Strength</div>
        <h1 className="display mt-1 text-[30px] leading-none">Gym</h1>
      </header>

      <Segmented<Tab>
        className="mt-5"
        value={tab}
        onChange={setTab}
        options={[
          { id: "train", label: "Train", icon: <Dumbbell size={13} /> },
          { id: "history", label: "History", icon: <History size={13} /> },
          { id: "library", label: "Exercises", icon: <BicepsFlexed size={13} /> },
        ]}
      />

      {tab === "train" && <TrainTab workouts={workouts} />}
      {tab === "history" && <HistoryTab workouts={workouts} onOpen={setDetail} />}
      {tab === "library" && <LibraryTab onOpen={setExDetail} />}

      <AnimatePresence>
        {detail && <WorkoutDetail w={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {exDetail && <ExerciseDetail id={exDetail} onClose={() => setExDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ================= TRAIN ================= */

function TrainTab({ workouts }: { workouts: Workout[] }) {
  const startWorkout = useGym((s) => s.startWorkout);
  const last = [...workouts].sort((a, b) => b.endedAt - a.endedAt)[0];

  const weekStart = Date.now() - 7 * 86400000;
  const weekSessions = workouts.filter((w) => w.endedAt > weekStart);
  const weekVolume = weekSessions.reduce((a, w) => a + workoutVolume(w), 0);

  return (
    <div className="mt-4">
      <button
        onClick={() => startWorkout()}
        className="card noise relative flex w-full items-center justify-between overflow-hidden border-volt/30 bg-gradient-to-br from-volt/15 to-transparent p-5 text-left active:scale-[0.99]"
      >
        <div>
          <div className="label-volt">Ready when you are</div>
          <div className="display mt-1 text-3xl leading-none">Start workout</div>
          <div className="mt-1.5 font-mono text-[10px] uppercase text-fog">
            Log sets · rest timer · PBs tracked
          </div>
        </div>
        <div className="volt-glow grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-volt text-ink">
          <Play size={22} strokeWidth={2.5} />
        </div>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <div className="card p-4">
          <div className="label">This week</div>
          <div className="display mt-1.5 text-2xl tnum">{weekSessions.length}</div>
          <div className="font-mono text-[9px] uppercase text-ash">sessions</div>
        </div>
        <div className="card p-4">
          <div className="label">Volume · 7d</div>
          <div className="display mt-1.5 text-2xl tnum">{fmtInt(weekVolume)}</div>
          <div className="font-mono text-[9px] uppercase text-ash">kg lifted</div>
        </div>
      </div>

      {last && (
        <div className="card mt-3 p-4">
          <div className="flex items-center justify-between">
            <span className="label">Repeat last session</span>
            <span className="font-mono text-[10px] text-ash">{timeAgo(last.endedAt)}</span>
          </div>
          <div className="display mt-2 text-xl">{last.name}</div>
          <div className="mt-0.5 font-mono text-[10px] text-fog tnum">
            {last.exercises.length} exercises · {fmtInt(workoutVolume(last))} kg ·{" "}
            {fmtClock((last.endedAt - last.startedAt) / 1000)}
          </div>
          <button
            onClick={() =>
              startWorkout({
                name: last.name,
                exercises: last.exercises,
                targetVolume: workoutVolume(last),
              })
            }
            className="btn-volt mt-3 flex w-full items-center justify-center gap-2 py-3 text-xs"
          >
            <Repeat size={14} strokeWidth={2.6} />
            Repeat · try to beat it
          </button>
        </div>
      )}
    </div>
  );
}

/* ================= HISTORY ================= */

function HistoryTab({ workouts, onOpen }: { workouts: Workout[]; onOpen: (w: Workout) => void }) {
  const sorted = [...workouts].sort((a, b) => b.endedAt - a.endedAt);
  if (sorted.length === 0)
    return (
      <div className="mt-4">
        <Empty
          icon={<History size={20} />}
          title="No sessions yet"
          body="Finish your first workout and it lands here with duration and volume."
        />
      </div>
    );
  return (
    <div className="mt-4 space-y-2.5">
      {sorted.map((w) => (
        <button
          key={w.id}
          onClick={() => onOpen(w)}
          className="card flex w-full items-center gap-4 p-4 text-left active:scale-[0.99]"
        >
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-volt/10 text-volt">
            <Weight size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{w.name}</div>
            <div className="mt-0.5 font-mono text-[9px] uppercase text-ash">
              {new Date(w.endedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ·{" "}
              {fmtClock((w.endedAt - w.startedAt) / 1000)} · {w.exercises.length} ex
            </div>
          </div>
          <div className="text-right">
            <div className="display text-lg leading-none tnum">{fmtInt(workoutVolume(w))}</div>
            <div className="label mt-0.5">kg</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function WorkoutDetail({ w, onClose }: { w: Workout; onClose: () => void }) {
  const customs = useGym((s) => s.customExercises);
  const startWorkout = useGym((s) => s.startWorkout);
  const deleteWorkout = useGym((s) => s.deleteWorkout);
  const [confirmDel, setConfirmDel] = useState(false);

  return (
    <Sheet onClose={onClose} title={w.name} tall>
      <div className="flex gap-2 font-mono text-[10px] uppercase text-fog">
        <span className="rounded-lg bg-white/5 px-2.5 py-1.5">
          {new Date(w.endedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </span>
        <span className="rounded-lg bg-white/5 px-2.5 py-1.5 tnum">{fmtClock((w.endedAt - w.startedAt) / 1000)}</span>
        <span className="rounded-lg bg-volt/12 px-2.5 py-1.5 text-volt tnum">{fmtInt(workoutVolume(w))} kg</span>
      </div>

      <div className="mt-4 space-y-3">
        {w.exercises.map((ex) => {
          const def = findExercise(ex.exerciseId, customs);
          return (
            <div key={ex.exerciseId} className="card-flat p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-bold">{def?.name ?? "Exercise"}</div>
                <div className="font-mono text-[9px] text-ash tnum">{ex.sets.length} sets</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ex.sets.map((s, i) => (
                  <span key={i} className="rounded-lg bg-white/5 px-2.5 py-1.5 font-mono text-[10px] text-fog tnum">
                    {s.kg || "0"}×{s.reps || "0"}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => {
            if (confirmDel) {
              deleteWorkout(w.id);
              onClose();
            } else {
              setConfirmDel(true);
              setTimeout(() => setConfirmDel(false), 2500);
            }
          }}
          className={cn(
            "grid h-12 w-12 place-items-center rounded-2xl border active:scale-95",
            confirmDel ? "border-alert/50 bg-alert/15 text-alert" : "hairline bg-white/4 text-fog"
          )}
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={() => {
            startWorkout({ name: w.name, exercises: w.exercises, targetVolume: workoutVolume(w) });
            onClose();
          }}
          className="btn-volt flex flex-1 items-center justify-center gap-2 py-3.5 text-sm"
        >
          <Repeat size={15} strokeWidth={2.6} />
          Repeat this workout
        </button>
      </div>
    </Sheet>
  );
}

/* ================= LIBRARY ================= */

function LibraryTab({ onOpen }: { onOpen: (id: string) => void }) {
  const customs = useGym((s) => s.customExercises);
  const [q, setQ] = useState("");
  const all = useMemo(() => [...customs, ...EXERCISES], [customs]);
  const filtered = all.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.muscle.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mt-4">
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search library…"
          className="w-full rounded-xl border hairline bg-white/5 py-3 pl-10 pr-3 text-sm placeholder:text-ash focus:border-volt/50"
        />
      </div>
      <div className="mt-3 space-y-1.5 pb-2">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => onOpen(e.id)}
            className="flex w-full items-center justify-between rounded-xl border hairline bg-white/2 px-3.5 py-3 text-left active:scale-[0.99]"
          >
            <div>
              <div className="text-sm font-semibold">
                {e.name}
                {e.custom && (
                  <span className="ml-2 rounded bg-volt/12 px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-volt">
                    Custom
                  </span>
                )}
              </div>
              <div className="font-mono text-[9px] uppercase text-ash">{e.muscle} · {e.equipment}</div>
            </div>
            <Trophy size={13} className="text-ash" />
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-xs text-ash">No matches — add it from a workout.</div>
        )}
      </div>
    </div>
  );
}

function ExerciseDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const workouts = useGym((s) => s.workouts);
  const customs = useGym((s) => s.customExercises);
  const deleteCustom = useGym((s) => s.deleteCustomExercise);
  const def = findExercise(id, customs);
  const pbs = exercisePBs(workouts, id);

  // volume per session (last 10, oldest → newest)
  const series = [...workouts]
    .sort((a, b) => a.endedAt - b.endedAt)
    .map((w) => {
      const ex = w.exercises.find((e) => e.exerciseId === id);
      return ex ? ex.sets.reduce((a, s) => a + (parseFloat(s.kg) || 0) * (parseFloat(s.reps) || 0), 0) : 0;
    })
    .filter((v) => v > 0)
    .slice(-10);
  const maxV = Math.max(1, ...series);

  if (!def) return null;
  return (
    <Sheet onClose={onClose} title={def.name}>
      <div className="flex gap-2 font-mono text-[10px] uppercase text-fog">
        <span className="rounded-lg bg-white/5 px-2.5 py-1.5">{def.muscle}</span>
        <span className="rounded-lg bg-white/5 px-2.5 py-1.5">{def.equipment}</span>
        <span className="rounded-lg bg-white/5 px-2.5 py-1.5 tnum">{pbs.sessions} sessions</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Max weight", v: `${pbs.maxKg}`, unit: "kg" },
          { label: "Best set", v: `${fmtInt(pbs.bestSet)}`, unit: "kg vol" },
          { label: "Est. 1RM", v: `${Math.round(pbs.best1RM)}`, unit: "kg" },
        ].map((s) => (
          <div key={s.label} className="card-flat p-3 text-center">
            <div className="display text-xl text-volt tnum">{s.v}</div>
            <div className="mt-0.5 font-mono text-[8px] uppercase text-ash">{s.unit}</div>
            <div className="label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="label">Volume trend · per session</div>
        <div className="mt-2 flex h-24 items-end gap-1.5">
          {series.length === 0 && (
            <div className="flex w-full items-center justify-center text-xs text-ash">
              Log this exercise to build the trend
            </div>
          )}
          {series.map((v, i) => (
            <div key={i} className="flex-1 rounded-md bg-volt/25" style={{ height: "100%", display: "flex", alignItems: "flex-end" }}>
              <div
                className={cn("w-full rounded-md", i === series.length - 1 ? "bg-volt" : "bg-volt/45")}
                style={{ height: `${Math.max(6, (v / maxV) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {def.custom && (
        <button
          onClick={() => {
            deleteCustom(id);
            onClose();
          }}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-alert/30 bg-alert/8 py-3 text-xs font-bold uppercase tracking-wider text-alert"
        >
          <X size={14} />
          Delete custom exercise
        </button>
      )}
    </Sheet>
  );
}
