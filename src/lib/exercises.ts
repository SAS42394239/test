import type { ExerciseDef, Muscle } from "./types";

export const MUSCLES: Muscle[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Glutes",
  "Arms",
  "Core",
];

export const EXERCISES: ExerciseDef[] = [
  { id: "bb-bench", name: "Barbell Bench Press", muscle: "Chest", equipment: "Barbell" },
  { id: "db-incline", name: "Incline Dumbbell Press", muscle: "Chest", equipment: "Dumbbell" },
  { id: "cable-fly", name: "Cable Fly", muscle: "Chest", equipment: "Cable" },
  { id: "push-up", name: "Push-Up", muscle: "Chest", equipment: "Bodyweight" },
  { id: "dip", name: "Chest Dip", muscle: "Chest", equipment: "Bodyweight" },
  { id: "ohp", name: "Overhead Press", muscle: "Shoulders", equipment: "Barbell" },
  { id: "lat-raise", name: "Lateral Raise", muscle: "Shoulders", equipment: "Dumbbell" },
  { id: "rear-delt", name: "Rear Delt Fly", muscle: "Shoulders", equipment: "Dumbbell" },
  { id: "deadlift", name: "Deadlift", muscle: "Back", equipment: "Barbell" },
  { id: "bb-row", name: "Barbell Row", muscle: "Back", equipment: "Barbell" },
  { id: "pull-up", name: "Pull-Up", muscle: "Back", equipment: "Bodyweight" },
  { id: "lat-pd", name: "Lat Pulldown", muscle: "Back", equipment: "Cable" },
  { id: "cable-row", name: "Seated Cable Row", muscle: "Back", equipment: "Cable" },
  { id: "face-pull", name: "Face Pull", muscle: "Back", equipment: "Cable" },
  { id: "back-squat", name: "Back Squat", muscle: "Legs", equipment: "Barbell" },
  { id: "front-squat", name: "Front Squat", muscle: "Legs", equipment: "Barbell" },
  { id: "leg-press", name: "Leg Press", muscle: "Legs", equipment: "Machine" },
  { id: "rdl", name: "Romanian Deadlift", muscle: "Legs", equipment: "Barbell" },
  { id: "leg-curl", name: "Leg Curl", muscle: "Legs", equipment: "Machine" },
  { id: "leg-ext", name: "Leg Extension", muscle: "Legs", equipment: "Machine" },
  { id: "calf-raise", name: "Standing Calf Raise", muscle: "Legs", equipment: "Machine" },
  { id: "lunge", name: "Walking Lunge", muscle: "Legs", equipment: "Dumbbell" },
  { id: "bulg-split", name: "Bulgarian Split Squat", muscle: "Legs", equipment: "Dumbbell" },
  { id: "hip-thrust", name: "Hip Thrust", muscle: "Glutes", equipment: "Barbell" },
  { id: "glute-kick", name: "Glute Kickback", muscle: "Glutes", equipment: "Cable" },
  { id: "biceps-curl", name: "Biceps Curl", muscle: "Arms", equipment: "Dumbbell" },
  { id: "hammer-curl", name: "Hammer Curl", muscle: "Arms", equipment: "Dumbbell" },
  { id: "tri-pushdown", name: "Triceps Pushdown", muscle: "Arms", equipment: "Cable" },
  { id: "skullcrusher", name: "Skullcrusher", muscle: "Arms", equipment: "Barbell" },
  { id: "plank", name: "Plank (weighted)", muscle: "Core", equipment: "Bodyweight" },
  { id: "leg-raise", name: "Hanging Leg Raise", muscle: "Core", equipment: "Bodyweight" },
  { id: "cable-crunch", name: "Cable Crunch", muscle: "Core", equipment: "Cable" },
];

export const findExercise = (
  id: string,
  customs: ExerciseDef[] = []
): ExerciseDef | undefined =>
  customs.find((e) => e.id === id) ?? EXERCISES.find((e) => e.id === id);
