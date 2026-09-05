import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ActiveWorkout,
  CycleDay,
  FoodEntry,
  Goals,
  Run,
  ExerciseDef,
  SetLog,
  Workout,
  WorkoutExercise,
} from "./types";
import { num, uid } from "./utils";

/* ================================================================== */
/* Settings / goals                                                    */
/* ================================================================== */

interface SettingsState {
  goals: Goals;
  weightKg: number;
  setGoals: (g: Goals) => void;
  setWeight: (kg: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      goals: { kcal: 2400, protein: 160, carbs: 260, fat: 75 },
      weightKg: 65,
      setGoals: (goals) => set({ goals }),
      setWeight: (weightKg) => set({ weightKg }),
    }),
    { name: "coresync:settings:v1" }
  )
);

/* ================================================================== */
/* Food                                                                */
/* ================================================================== */

interface FoodState {
  entries: FoodEntry[];
  addEntry: (e: Omit<FoodEntry, "id" | "createdAt">) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<FoodEntry>) => void;
}

export const useFood = create<FoodState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (e) =>
        set((s) => ({
          entries: [...s.entries, { ...e, id: uid(), createdAt: Date.now() }],
        })),
      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
    }),
    { name: "coresync:food:v1" }
  )
);

export const entriesOn = (entries: FoodEntry[], date: string) =>
  entries.filter((e) => e.date === date);

export const totalsFor = (entries: FoodEntry[]) =>
  entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );

/* ================================================================== */
/* Gym                                                                 */
/* ================================================================== */

interface GymState {
  workouts: Workout[];
  customExercises: ExerciseDef[];
  active: ActiveWorkout | null;
  startWorkout: (preset?: {
    name: string;
    exercises: WorkoutExercise[];
    targetVolume?: number;
  }) => void;
  renameActive: (name: string) => void;
  addExerciseToActive: (exerciseId: string) => void;
  removeExerciseFromActive: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<SetLog>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  finishActive: () => void;
  discardActive: () => void;
  deleteWorkout: (id: string) => void;
  addCustomExercise: (e: ExerciseDef) => void;
  deleteCustomExercise: (id: string) => void;
}

const mkSet = (kg = "", reps = ""): SetLog => ({ id: uid(), kg, reps, done: false });

export const useGym = create<GymState>()(
  persist(
    (set) => ({
      workouts: [],
      customExercises: [],
      active: null,
      startWorkout: (preset) =>
        set({
          active: {
            id: uid(),
            name: preset?.name ?? "Workout",
            startedAt: Date.now(),
            targetVolume: preset?.targetVolume,
            exercises:
              preset?.exercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                sets: ex.sets.map((s) => ({ ...s, id: uid(), done: false })),
              })) ?? [],
          },
        }),
      renameActive: (name) =>
        set((s) => (s.active ? { active: { ...s.active, name } } : s)),
      addExerciseToActive: (exerciseId) =>
        set((s) => {
          if (!s.active) return s;
          if (s.active.exercises.some((e) => e.exerciseId === exerciseId)) return s;
          return {
            active: {
              ...s.active,
              exercises: [
                ...s.active.exercises,
                { exerciseId, sets: [mkSet(), mkSet(), mkSet()] },
              ],
            },
          };
        }),
      removeExerciseFromActive: (exerciseId) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  exercises: s.active.exercises.filter(
                    (e) => e.exerciseId !== exerciseId
                  ),
                },
              }
            : s
        ),
      addSet: (exerciseId) =>
        set((s) => {
          if (!s.active) return s;
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) => {
                if (e.exerciseId !== exerciseId) return e;
                const last = e.sets[e.sets.length - 1];
                return {
                  ...e,
                  sets: [...e.sets, mkSet(last?.kg ?? "", last?.reps ?? "")],
                };
              }),
            },
          };
        }),
      updateSet: (exerciseId, setId, patch) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  exercises: s.active.exercises.map((e) =>
                    e.exerciseId !== exerciseId
                      ? e
                      : {
                          ...e,
                          sets: e.sets.map((st) =>
                            st.id === setId ? { ...st, ...patch } : st
                          ),
                        }
                  ),
                },
              }
            : s
        ),
      removeSet: (exerciseId, setId) =>
        set((s) =>
          s.active
            ? {
                active: {
                  ...s.active,
                  exercises: s.active.exercises.map((e) =>
                    e.exerciseId !== exerciseId
                      ? e
                      : { ...e, sets: e.sets.filter((st) => st.id !== setId) }
                  ),
                },
              }
            : s
        ),
      finishActive: () =>
        set((s) => {
          if (!s.active) return s;
          const cleaned: Workout = {
            id: s.active.id,
            name: s.active.name.trim() || "Workout",
            startedAt: s.active.startedAt,
            endedAt: Date.now(),
            exercises: s.active.exercises
              .map((e) => ({ ...e, sets: e.sets.filter((st) => st.done) }))
              .filter((e) => e.sets.length > 0),
          };
          if (cleaned.exercises.length === 0) return { active: null };
          return { workouts: [cleaned, ...s.workouts], active: null };
        }),
      discardActive: () => set({ active: null }),
      deleteWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),
      addCustomExercise: (e) =>
        set((s) => ({ customExercises: [e, ...s.customExercises] })),
      deleteCustomExercise: (id) =>
        set((s) => ({
          customExercises: s.customExercises.filter((e) => e.id !== id),
        })),
    }),
    { name: "coresync:gym:v1" }
  )
);

export const setVolume = (s: SetLog) => (s.done ? num(s.kg) * num(s.reps) : 0);

export const exerciseVolume = (e: WorkoutExercise) =>
  e.sets.reduce((a, s) => a + setVolume(s), 0);

export const workoutVolume = (w: { exercises: WorkoutExercise[] }) =>
  w.exercises.reduce((a, e) => a + exerciseVolume(e), 0);

export const exercisePBs = (
  workouts: Workout[],
  exerciseId: string
): { maxKg: number; bestSet: number; best1RM: number; sessions: number } => {
  let maxKg = 0,
    bestSet = 0,
    best1RM = 0,
    sessions = 0;
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    sessions++;
    for (const s of ex.sets) {
      const kg = num(s.kg),
        reps = num(s.reps);
      if (kg > maxKg) maxKg = kg;
      if (kg * reps > bestSet) bestSet = kg * reps;
      const one = kg * (1 + reps / 30);
      if (reps > 0 && one > best1RM) best1RM = one;
    }
  }
  return { maxKg, bestSet, best1RM, sessions };
};

export const lastDoneSet = (
  workouts: Workout[],
  exerciseId: string
): { kg: string; reps: string } | null => {
  for (const w of workouts) {
    const ex = w.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex && ex.sets.length) {
      const last = ex.sets[ex.sets.length - 1];
      return { kg: last.kg, reps: last.reps };
    }
  }
  return null;
};

/* ================================================================== */
/* Runs                                                                */
/* ================================================================== */

interface RunState {
  runs: Run[];
  addRun: (r: Run) => void;
  deleteRun: (id: string) => void;
}

export const useRuns = create<RunState>()(
  persist(
    (set) => ({
      runs: [],
      addRun: (r) => set((s) => ({ runs: [r, ...s.runs] })),
      deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
    }),
    { name: "coresync:runs:v1" }
  )
);

/* ================================================================== */
/* Cycle                                                               */
/* ================================================================== */

interface CycleState {
  days: Record<string, CycleDay>;
  saveDay: (d: CycleDay) => void;
}

export const useCycle = create<CycleState>()(
  persist(
    (set) => ({
      days: {},
      saveDay: (d) => set((s) => ({ days: { ...s.days, [d.date]: d } })),
    }),
    { name: "coresync:cycle:v1" }
  )
);

/* ================================================================== */
/* Data wipe — clears every CoreSync key from localStorage             */
/* ================================================================== */

export function resetAll() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith("coresync:"))
    .forEach((k) => localStorage.removeItem(k));
  location.reload();
}
