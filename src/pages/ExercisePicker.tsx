import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Chip, Sheet } from "../components/ui";
import { EXERCISES, MUSCLES } from "../lib/exercises";
import { useGym } from "../lib/store";
import { cn, uid } from "../lib/utils";
import type { Muscle } from "../lib/types";

const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Kettlebell", "Bodyweight"];

export default function ExercisePicker({
  onClose,
  onPick,
  exclude = [],
}: {
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  exclude?: string[];
}) {
  const customs = useGym((s) => s.customExercises);
  const addCustom = useGym((s) => s.addCustomExercise);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", muscle: "Chest" as Muscle, equipment: "Barbell" });

  const all = useMemo(
    () => [...customs, ...EXERCISES].filter((e) => !exclude.includes(e.id)),
    [customs, exclude]
  );

  const filtered = all.filter(
    (e) =>
      e.name.toLowerCase().includes(q.toLowerCase()) ||
      e.muscle.toLowerCase().includes(q.toLowerCase())
  );

  const groups = MUSCLES.map((m) => ({
    muscle: m,
    items: filtered.filter((e) => e.muscle === m),
  })).filter((g) => g.items.length > 0);

  return (
    <Sheet onClose={onClose} title="Add exercise" tall>
      {!creating ? (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search exercises…"
              className="w-full rounded-xl border hairline bg-white/5 py-3 pl-10 pr-3 text-sm placeholder:text-ash focus:border-volt/50"
            />
          </div>
          <button
            onClick={() => setCreating(true)}
            className="mt-2.5 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-volt/30 bg-volt/5 px-4 py-3 text-left active:scale-[0.99]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-volt/15 text-volt">
              <Plus size={15} />
            </span>
            <span>
              <span className="block text-sm font-bold">Create custom exercise</span>
              <span className="block font-mono text-[9px] uppercase text-ash">Saved to your library</span>
            </span>
          </button>

          <div className="mt-4 space-y-4 pb-2">
            {groups.map((g) => (
              <div key={g.muscle}>
                <div className="label px-1">{g.muscle}</div>
                <div className="mt-1.5 space-y-1.5">
                  {g.items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => onPick(e.id)}
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
                        <div className="font-mono text-[9px] uppercase text-ash">{e.equipment}</div>
                      </div>
                      <Plus size={15} className="text-volt" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <div className="py-8 text-center text-xs text-ash">No matches</div>}
          </div>
        </>
      ) : (
        <div>
          <div className="label mb-1.5">Exercise name</div>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Incline Hammer Press"
            className="w-full rounded-xl border hairline bg-white/5 px-3.5 py-2.5 text-sm font-semibold placeholder:text-ash focus:border-volt/50"
          />
          <div className="label mb-1.5 mt-4">Muscle group</div>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLES.map((m) => (
              <Chip key={m} active={form.muscle === m} onClick={() => setForm({ ...form, muscle: m })}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="label mb-1.5 mt-4">Equipment</div>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((m) => (
              <Chip key={m} active={form.equipment === m} onClick={() => setForm({ ...form, equipment: m })}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setCreating(false)}
              className={cn("flex-1 rounded-2xl border hairline bg-white/4 py-3.5 text-sm font-bold uppercase tracking-wide text-fog")}
            >
              Back
            </button>
            <button
              disabled={!form.name.trim()}
              onClick={() => {
                const id = `custom-${uid()}`;
                addCustom({ id, name: form.name.trim(), muscle: form.muscle, equipment: form.equipment, custom: true });
                onPick(id);
              }}
              className="btn-volt flex flex-[2] items-center justify-center gap-2 py-3.5 text-sm disabled:opacity-40"
            >
              <Check size={15} strokeWidth={2.6} />
              Create & add
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
