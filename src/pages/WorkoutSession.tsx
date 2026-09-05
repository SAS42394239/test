import { useMemo, useState } from "react";
import { Check, ChevronUp, Plus, Timer, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatePresence, Ring, useInterval } from "../components/ui";
import ExercisePicker from "./ExercisePicker";
import { findExercise } from "../lib/exercises";
import {
  lastDoneSet,
  useGym,
  workoutVolume,
} from "../lib/store";
import { cn, fmtClock, vibrate } from "../lib/utils";

const REST_PRESETS = [60, 90, 120, 180];

export default function WorkoutSession() {
  const active = useGym((s) => s.active)!;
  const workouts = useGym((s) => s.workouts);
  const customs = useGym((s) => s.customExercises);
  const { renameActive, addSet, updateSet, removeSet, removeExerciseFromActive, finishActive, discardActive } =
    useGym();

  const [now, setNow] = useState(Date.now());
  const [showPicker, setShowPicker] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState<"none" | "finish" | "discard">("none");
  const [restSecs, setRestSecs] = useState(90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);

  useInterval(() => setNow(Date.now()), 500);

  const elapsed = Math.floor((now - active.startedAt) / 1000);
  const lifted = workoutVolume(active);

  const restLeft = restEndsAt ? Math.max(0, (restEndsAt - now) / 1000) : 0;
  if (restEndsAt && restLeft <= 0) {
    setRestEndsAt(null);
    vibrate(180);
  }

  const startRest = () => {
    setRestEndsAt(Date.now() + restSecs * 1000);
    vibrate(25);
  };

  const picker = useMemo(
    () => (
      <ExercisePicker
        exclude={active.exercises.map((e) => e.exerciseId)}
        onClose={() => setShowPicker(false)}
        onPick={(id) => {
          useGym.getState().addExerciseToActive(id);
          setShowPicker(false);
        }}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active.exercises.length]
  );

  return (
    <div className="px-4 pb-28 pt-safe">
      {/* header */}
      <header className="flex items-center justify-between gap-2 pt-6">
        <button
          onClick={() => {
            if (confirmEnd === "discard") discardActive();
            else {
              setConfirmEnd("discard");
              setTimeout(() => setConfirmEnd("none"), 2500);
            }
          }}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-2xl border hairline active:scale-95",
            confirmEnd === "discard" ? "border-alert/50 bg-alert/15 text-alert" : "bg-card text-fog"
          )}
          aria-label="Discard workout"
        >
          <X size={17} />
        </button>
        <div className="text-center">
          <div className="label-volt flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-volt blink" />
            Session live
          </div>
          <div className="display mt-0.5 text-3xl leading-none tnum">{fmtClock(elapsed)}</div>
        </div>
        <button
          onClick={() => {
            if (confirmEnd === "finish") finishActive();
            else {
              setConfirmEnd("finish");
              setTimeout(() => setConfirmEnd("none"), 2500);
            }
          }}
          className={cn(
            "h-10 rounded-2xl px-4 text-xs font-extrabold uppercase tracking-wider active:scale-95",
            confirmEnd === "finish" ? "bg-volt text-ink volt-glow" : "bg-volt/15 text-volt"
          )}
        >
          {confirmEnd === "finish" ? "Confirm?" : "Finish"}
        </button>
      </header>

      <input
        value={active.name}
        onChange={(e) => renameActive(e.target.value)}
        placeholder="Workout name"
        className="display mt-4 w-full bg-transparent text-center text-2xl uppercase tracking-wide text-bone placeholder:text-ash"
      />

      {/* volume */}
      <div className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ash tnum">
        {Math.round(lifted).toLocaleString()} kg lifted
        {active.targetVolume ? ` · target ${Math.round(active.targetVolume).toLocaleString()}` : ""}
      </div>
      {active.targetVolume != null && (
        <div className="mx-auto mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/8">
          <div
            className={cn("h-full rounded-full", lifted >= active.targetVolume ? "bg-volt" : "bg-volt/50")}
            style={{ width: `${Math.min(100, (lifted / active.targetVolume) * 100)}%` }}
          />
        </div>
      )}

      {/* exercises */}
      <div className="mt-6 space-y-4">
        {active.exercises.map((ex, exIdx) => {
          const def = findExercise(ex.exerciseId, customs);
          const prev = lastDoneSet(workouts, ex.exerciseId);
          return (
            <div key={ex.exerciseId} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-ash">
                    {String(exIdx + 1).padStart(2, "0")} · {def?.muscle ?? ""}
                  </div>
                  <div className="display mt-0.5 text-lg leading-tight">{def?.name ?? "Exercise"}</div>
                  {prev && (
                    <div className="mt-0.5 font-mono text-[9px] uppercase text-fog tnum">
                      Last: {prev.kg || "0"}kg × {prev.reps || "0"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeExerciseFromActive(ex.exerciseId)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ash hover:text-alert active:scale-90"
                  aria-label="Remove exercise"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* sets */}
              <div className="mt-3">
                <div className="grid grid-cols-[2.2rem_1fr_1fr_2.4rem_1.6rem] items-center gap-2 px-1 pb-1.5">
                  {["Set", "Kg", "Reps", "", ""].map((h, i) => (
                    <span key={i} className="label text-center">{h}</span>
                  ))}
                </div>
                {ex.sets.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      "grid grid-cols-[2.2rem_1fr_1fr_2.4rem_1.6rem] items-center gap-2 rounded-xl px-1 py-1",
                      s.done && "bg-volt/6"
                    )}
                  >
                    <span className={cn("text-center font-mono text-xs tnum", s.done ? "text-volt" : "text-ash")}>
                      {i + 1}
                    </span>
                    <input
                      value={s.kg}
                      inputMode="decimal"
                      placeholder="0"
                      onChange={(e) => updateSet(ex.exerciseId, s.id, { kg: e.target.value.replace(/[^0-9.,]/g, "") })}
                      className={cn(
                        "rounded-lg border hairline bg-white/5 py-2 text-center font-mono text-sm font-semibold placeholder:text-ash focus:border-volt/50",
                        s.done && "border-volt/25 text-volt"
                      )}
                    />
                    <input
                      value={s.reps}
                      inputMode="numeric"
                      placeholder="0"
                      onChange={(e) => updateSet(ex.exerciseId, s.id, { reps: e.target.value.replace(/[^0-9]/g, "") })}
                      className={cn(
                        "rounded-lg border hairline bg-white/5 py-2 text-center font-mono text-sm font-semibold placeholder:text-ash focus:border-volt/50",
                        s.done && "border-volt/25 text-volt"
                      )}
                    />
                    <button
                      onClick={() => {
                        const done = !s.done;
                        updateSet(ex.exerciseId, s.id, { done });
                        if (done) startRest();
                        vibrate(15);
                      }}
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-full border transition-all active:scale-90",
                        s.done
                          ? "border-volt bg-volt text-ink"
                          : "border-white/15 bg-white/4 text-ash"
                      )}
                      aria-label="Complete set"
                    >
                      <Check size={15} strokeWidth={3} />
                    </button>
                    <button
                      onClick={() => removeSet(ex.exerciseId, s.id)}
                      className="grid h-8 w-6 place-items-center text-ash/60 hover:text-alert"
                      aria-label="Delete set"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addSet(ex.exerciseId)}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/12 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fog active:scale-[0.99]"
                >
                  <Plus size={12} />
                  Add set
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowPicker(true)}
        className="volt-glow mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-volt/50 bg-volt/10 py-4 text-sm font-extrabold uppercase tracking-wider text-volt active:scale-[0.99]"
      >
        <Plus size={16} strokeWidth={2.6} />
        Add exercise
      </button>

      {active.exercises.length === 0 && (
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-wider text-ash">
          Build your session — add an exercise to begin
        </p>
      )}

      <AnimatePresence>{showPicker && picker}</AnimatePresence>


      {/* rest timer overlay */}
      <AnimatePresence>
        {restEndsAt && (
          <RestBar
            left={restLeft}
            total={restSecs}
            presets={REST_PRESETS}
            onPreset={(s) => {
              setRestSecs(s);
              setRestEndsAt(Date.now() + s * 1000);
            }}
            onAdd={() => setRestEndsAt((e) => (e ? e + 15000 : null))}
            onSkip={() => setRestEndsAt(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function RestBar({
  left,
  total,
  presets,
  onPreset,
  onAdd,
  onSkip,
}: {
  left: number;
  total: number;
  presets: number[];
  onPreset: (s: number) => void;
  onAdd: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-x-3 bottom-3 z-40"
      initial={{ y: 110, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 110, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <div className="card volt-glow !rounded-3xl border-volt/25 p-4">
        <div className="flex items-center gap-4">
          <Ring size={64} stroke={6} progress={left / total}>
            <Timer size={16} className="text-volt" />
          </Ring>
          <div className="flex-1">
            <div className="label-volt">Rest between sets</div>
            <div className="display mt-0.5 text-3xl leading-none tnum">{fmtClock(Math.ceil(left))}</div>
            <div className="mt-1.5 flex gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => onPreset(p)}
                  className={cn(
                    "rounded-md px-2 py-1 font-mono text-[9px]",
                    p === total ? "bg-volt text-ink font-bold" : "bg-white/6 text-fog"
                  )}
                >
                  {p}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onAdd}
              className="flex items-center gap-0.5 rounded-xl bg-white/6 px-3 py-2 font-mono text-[10px] font-bold text-bone active:scale-95"
            >
              <ChevronUp size={11} /> 15s
            </button>
            <button
              onClick={onSkip}
              className="rounded-xl bg-volt px-3 py-2 font-mono text-[10px] font-bold text-ink active:scale-95"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
