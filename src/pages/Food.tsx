import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Cookie,
  Croissant,
  PenLine,
  Plus,
  Sandwich,
  ScanBarcode,
  Search,
  Settings2,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { AnimatePresence, CountUp, MacroBar, Ring, Sheet, NumField } from "../components/ui";
import AddFood, { type AddMode } from "./AddFood";
import { entriesOn, totalsFor, useFood, useSettings } from "../lib/store";
import { addDays, fmtDayShort, isoDate } from "../lib/utils";
import type { Goals, MealType } from "../lib/types";

const MEALS: { id: MealType; label: string; icon: typeof Croissant }[] = [
  { id: "breakfast", label: "Breakfast", icon: Croissant },
  { id: "lunch", label: "Lunch", icon: Sandwich },
  { id: "dinner", label: "Dinner", icon: UtensilsCrossed },
  { id: "snacks", label: "Snacks", icon: Cookie },
];

const SOURCE_TAG: Record<string, string> = {
  photo: "AI",
  barcode: "SCAN",
  search: "DB",
  manual: "QUICK",
};

const ADD_TILES: { mode: AddMode; icon: typeof Camera; label: string }[] = [
  { mode: "photo", icon: Camera, label: "Photo" },
  { mode: "barcode", icon: ScanBarcode, label: "Barcode" },
  { mode: "search", icon: Search, label: "Search" },
  { mode: "manual", icon: PenLine, label: "Quick add" },
];

export default function Food() {
  const [params, setParams] = useSearchParams();
  const [date, setDate] = useState(isoDate());
  const [addMode, setAddMode] = useState<AddMode | null>(null);
  const [goalEdit, setGoalEdit] = useState(false);

  const entries = useFood((s) => s.entries);
  const removeEntry = useFood((s) => s.removeEntry);
  const goals = useSettings((s) => s.goals);

  useEffect(() => {
    const m = params.get("add");
    if (m === "photo" || m === "barcode" || m === "search" || m === "manual") {
      setAddMode(m);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const dayEntries = useMemo(() => entriesOn(entries, date), [entries, date]);
  const totals = totalsFor(dayEntries);
  const isToday = date === isoDate();

  return (
    <div className="px-4 pb-10 pt-safe">
      <header className="flex items-center justify-between pt-6">
        <div>
          <div className="label-volt">Fuel tracker</div>
          <h1 className="display mt-1 text-[30px] leading-none">Food log</h1>
        </div>
        <button
          onClick={() => setGoalEdit(true)}
          className="grid h-10 w-10 place-items-center rounded-2xl border hairline bg-card text-fog active:scale-95"
          aria-label="Edit goals"
        >
          <Settings2 size={17} />
        </button>
      </header>

      {/* day nav + summary */}
      <section className="card mt-5 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-fog active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setDate(isoDate())} className="text-center">
            <div className="display text-xl">{isToday ? "Today" : fmtDayShort(date)}</div>
            <div className="label mt-0.5">{isToday ? fmtDayShort(date) : "tap for today"}</div>
          </button>
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-fog active:scale-95 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <Ring size={92} stroke={9} progress={totals.kcal / goals.kcal}>
            <div className="text-center">
              <CountUp value={totals.kcal} className="display block text-lg leading-none" />
              <div className="mt-0.5 font-mono text-[8px] uppercase text-ash">kcal</div>
            </div>
          </Ring>
          <div className="flex-1 space-y-2.5">
            <MacroBar label="Protein" short="P" value={totals.protein} goal={goals.protein} />
            <MacroBar label="Carbs" short="C" value={totals.carbs} goal={goals.carbs} tone="voltDim" />
            <MacroBar label="Fat" short="F" value={totals.fat} goal={goals.fat} tone="bone" />
          </div>
        </div>
      </section>

      {/* add tiles */}
      <section className="mt-4 grid grid-cols-4 gap-2.5">
        {ADD_TILES.map((t) => (
          <button
            key={t.mode}
            onClick={() => setAddMode(t.mode)}
            className="card-flat hairline flex flex-col items-center gap-2 py-3.5 active:scale-95 transition-transform"
          >
            <t.icon size={19} className="text-volt" strokeWidth={2.1} />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-fog">
              {t.label}
            </span>
          </button>
        ))}
      </section>

      {/* log */}
      <section className="mt-6 space-y-5">
        {MEALS.map((m) => {
          const list = dayEntries.filter((e) => e.meal === m.id);
          const sub = totalsFor(list);
          return (
            <div key={m.id}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <m.icon size={14} className="text-volt" />
                  <span className="display text-base tracking-wide">{m.label}</span>
                </div>
                <span className="font-mono text-[11px] text-fog tnum">
                  {Math.round(sub.kcal)} kcal
                </span>
              </div>
              <div className="mt-2 space-y-2">
                {list.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/8 px-4 py-3 text-xs text-ash">
                    Nothing logged
                  </div>
                )}
                {list.map((e) => (
                  <div key={e.id} className="card-flat flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{e.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase text-ash">
                        <span className="rounded bg-volt/12 px-1.5 py-0.5 text-[8px] font-bold text-volt">
                          {SOURCE_TAG[e.source]}
                        </span>
                        {e.grams > 0 && <span>{Math.round(e.grams)}g</span>}
                        <span className="tnum">
                          P{Math.round(e.protein)} · C{Math.round(e.carbs)} · F{Math.round(e.fat)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="display text-xl leading-none tnum">{Math.round(e.kcal)}</div>
                      <div className="label mt-0.5">kcal</div>
                    </div>
                    <button
                      onClick={() => removeEntry(e.id)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ash transition-colors hover:text-alert active:scale-90"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <button
        onClick={() => setAddMode("search")}
        className="btn-volt mt-6 flex w-full items-center justify-center gap-2 py-4 text-sm"
      >
        <Plus size={16} strokeWidth={2.6} />
        Log food
      </button>

      <AnimatePresence>
        {addMode && (
          <AddFood date={date} initial={addMode} onClose={() => setAddMode(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {goalEdit && <GoalSheet onClose={() => setGoalEdit(false)} goals={goals} />}
      </AnimatePresence>
    </div>
  );
}

function GoalSheet({ onClose, goals }: { onClose: () => void; goals: Goals }) {
  const setGoals = useSettings((s) => s.setGoals);
  const weightKg = useSettings((s) => s.weightKg);
  const setWeight = useSettings((s) => s.setWeight);
  const [v, setV] = useState({
    kcal: `${goals.kcal}`,
    protein: `${goals.protein}`,
    carbs: `${goals.carbs}`,
    fat: `${goals.fat}`,
    weight: `${weightKg}`,
  });

  return (
    <Sheet onClose={onClose} title="Daily goals">
      <p className="text-xs leading-relaxed text-fog">
        Targets drive the ring on your Today screen and macro bars across the app.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="label mb-1.5">Calories</div>
          <NumField value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} suffix="kcal" />
        </div>
        <div>
          <div className="label mb-1.5">Protein</div>
          <NumField value={v.protein} onChange={(x) => setV({ ...v, protein: x })} suffix="g" />
        </div>
        <div>
          <div className="label mb-1.5">Carbs</div>
          <NumField value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} suffix="g" />
        </div>
        <div>
          <div className="label mb-1.5">Fat</div>
          <NumField value={v.fat} onChange={(x) => setV({ ...v, fat: x })} suffix="g" />
        </div>
        <div className="col-span-2">
          <div className="label mb-1.5">Body weight (for run calorie burn)</div>
          <NumField value={v.weight} onChange={(x) => setV({ ...v, weight: x })} suffix="kg" />
        </div>
      </div>
      <button
        onClick={() => {
          setGoals({
            kcal: Math.max(500, parseInt(v.kcal) || goals.kcal),
            protein: Math.max(0, parseInt(v.protein) || 0),
            carbs: Math.max(0, parseInt(v.carbs) || 0),
            fat: Math.max(0, parseInt(v.fat) || 0),
          });
          setWeight(Math.max(30, parseFloat(v.weight) || weightKg));
          onClose();
        }}
        className="btn-volt mt-5 w-full py-3.5 text-sm"
      >
        Save goals
      </button>
    </Sheet>
  );
}
