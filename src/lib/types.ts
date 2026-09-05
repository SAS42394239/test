export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type FoodSource = "photo" | "barcode" | "search" | "manual";

export interface FoodEntry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  meal: MealType;
  name: string;
  brand?: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodSource;
  barcode?: string;
  createdAt: number;
}

export interface Goals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type Muscle =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Legs"
  | "Glutes"
  | "Arms"
  | "Core";

export interface ExerciseDef {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: string;
  custom?: boolean;
}

export interface SetLog {
  id: string;
  kg: string; // kept as string for clean input handling
  reps: string;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: SetLog[];
}

export interface Workout {
  id: string;
  name: string;
  startedAt: number;
  endedAt: number;
  exercises: WorkoutExercise[];
}

export interface ActiveWorkout {
  id: string;
  name: string;
  startedAt: number;
  targetVolume?: number;
  exercises: WorkoutExercise[];
}

export interface RunPoint {
  lat: number;
  lng: number;
  t: number; // ms epoch
}

export interface Split {
  km: number;
  sec: number;
}

export interface Run {
  id: string;
  startedAt: number;
  endedAt: number;
  points: RunPoint[];
  distanceKm: number;
  durationSec: number;
  splits: Split[];
  kcal: number;
  demo?: boolean;
}

export type Flow = "light" | "medium" | "heavy";

export interface CycleDay {
  date: string;
  period: boolean;
  flow?: Flow;
  symptoms: string[];
  mood?: string;
}

export interface PeriodBlock {
  start: string;
  days: string[];
}

export interface CycleStats {
  avgCycle: number;
  avgPeriod: number;
  lastStart: string | null;
  cycleDay: number | null;
  nextStart: string | null;
  nextEnd: string | null;
  ovulation: string | null;
  fertileStart: string | null;
  fertileEnd: string | null;
  phase: string | null;
  cyclesUsed: number;
}
