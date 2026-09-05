import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Droplets,
  Egg,
  Flower2,
  Info,
} from "lucide-react";
import { AnimatePresence, motion, Sheet } from "../components/ui";
import { useCycle } from "../lib/store";
import { cycleStats, FLOWS, MOODS, periodBlocks, SYMPTOMS } from "../lib/cycle";
import { cn, diffDays, fmtDayFull, fmtDayShort, isoDate, parseISO, vibrate } from "../lib/utils";
import type { CycleDay } from "../lib/types";

const MONTHS_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type DayMark = "period" | "predicted" | "fertile" | "ovulation" | null;

export default function Cycle() {
  const days = useCycle((s) => s.days);
  const today = isoDate();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const stats = useMemo(() => cycleStats(days, today), [days, today]);
  const blocks = useMemo(() => periodBlocks(days), [days]);

  const markFor = (date: string): DayMark => {
    const d = days[date];
    if (d?.period) return "period";
    if (stats.ovulation === date) return "ovulation";
    if (stats.fertileStart && stats.fertileEnd && diffDays(stats.fertileStart, date) >= 0 && diffDays(date, stats.fertileEnd) >= 0)
      return "fertile";
    if (stats.nextStart && stats.nextEnd && diffDays(stats.nextStart, date) >= 0 && diffDays(date, stats.nextEnd) >= 0)
      return "predicted";
    return null;
  };

  // calendar grid (Mon-first)
  const first = new Date(cursor.y, cursor.m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(new Date(cursor.y, cursor.m, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const daysToNext = stats.nextStart ? diffDays(today, stats.nextStart) : null;

  return (
    <div className="px-4 pb-10 pt-safe">
      <header className="flex items-end justify-between pt-6">
        <div>
          <div className="label-volt">Cycle tracking</div>
          <h1 className="display mt-1 text-[30px] leading-none">Cycle</h1>
        </div>
        <div className="rounded-2xl border border-volt/25 bg-volt/8 px-3.5 py-2 text-center">
          <div className="display text-2xl leading-none text-volt tnum">{stats.cycleDay ?? "—"}</div>
          <div className="label mt-0.5">cycle day</div>
        </div>
      </header>

      {/* prediction strip */}
      <section className="mt-5 grid grid-cols-3 gap-2">
        <div className="card p-3.5">
          <Droplets size={14} className="text-volt" />
          <div className="display mt-2 text-base leading-tight">
            {stats.nextStart ? fmtDayShort(stats.nextStart) : "——"}
          </div>
          <div className="label mt-1">
            next period{daysToNext != null ? ` · ${daysToNext}d` : ""}
          </div>
        </div>
        <div className="card p-3.5">
          <Egg size={14} className="text-volt" />
          <div className="display mt-2 text-base leading-tight">
            {stats.fertileStart ? `${fmtDayShort(stats.fertileStart).slice(4)} – ${fmtDayShort(stats.fertileEnd!).slice(4)}` : "——"}
          </div>
          <div className="label mt-1">fertile window</div>
        </div>
        <div className="card p-3.5">
          <Flower2 size={14} className="text-volt" />
          <div className="display mt-2 text-base leading-tight tnum">
            {stats.avgCycle}<span className="text-xs text-fog">d</span>
          </div>
          <div className="label mt-1">avg cycle</div>
        </div>
      </section>

      {/* calendar */}
      <section className="card mt-3 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCursor(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }))}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-fog active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="display text-xl">{MONTHS_FULL[cursor.m]} {cursor.y}</div>
          <button
            onClick={() => setCursor(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }))}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-fog active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="py-1 text-center font-mono text-[9px] uppercase text-ash">{d}</div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const mark = markFor(date);
            const isToday = date === today;
            const future = diffDays(today, date) > 0;
            return (
              <button
                key={i}
                onClick={() => setSelected(date)}
                className="relative aspect-square"
              >
                <span
                  className={cn(
                    "absolute inset-0.5 rounded-xl transition-colors",
                    mark === "period" && "bg-volt",
                    mark === "predicted" && "border border-dashed border-volt/50",
                    mark === "fertile" && "bg-volt/12",
                    mark === "ovulation" && "border border-volt/60",
                    !mark && "bg-white/3"
                  )}
                />
                <span
                  className={cn(
                    "relative font-mono text-[11px] tnum",
                    mark === "period" ? "font-bold text-ink" : future ? "text-ash" : "text-bone",
                    mark === "ovulation" && "text-volt"
                  )}
                >
                  {parseISO(date).getDate()}
                </span>
                {isToday && (
                  <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-volt" />
                )}
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
          {[
            ["bg-volt", "Period"],
            ["border border-dashed border-volt/50", "Predicted"],
            ["bg-volt/12", "Fertile"],
            ["border border-volt/60", "Ovulation"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-ash">
              <span className={cn("h-2.5 w-2.5 rounded-[5px]", c)} />
              {l}
            </span>
          ))}
        </div>
      </section>

      {/* stats + disclaimer */}
      <section className="card-flat mt-3 p-4">
        <div className="flex items-center justify-between">
          <span className="label">From your logged history</span>
          <span className="font-mono text-[9px] text-ash tnum">{blocks.length} periods · {stats.cyclesUsed || "no"} cycles</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/3 py-2.5">
            <div className="display text-lg text-volt tnum">{stats.avgCycle}d</div>
            <div className="label mt-0.5">cycle</div>
          </div>
          <div className="rounded-xl bg-white/3 py-2.5">
            <div className="display text-lg text-volt tnum">{stats.avgPeriod}d</div>
            <div className="label mt-0.5">period</div>
          </div>
          <div className="rounded-xl bg-white/3 py-2.5">
            <div className="display text-lg text-volt tnum">{stats.phase?.split(" ")[0] ?? "—"}</div>
            <div className="label mt-0.5">phase</div>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-ash">
          <Info size={11} className="mt-0.5 shrink-0" />
          Predictions are estimates from your own logged history — not medical advice, and not a
          contraception method.
        </p>
      </section>

      <button
        onClick={() => setSelected(today)}
        className="btn-volt mt-4 flex w-full items-center justify-center gap-2 py-4 text-sm"
      >
        <CalendarDays size={16} strokeWidth={2.4} />
        Log today
      </button>

      <AnimatePresence>
        {selected && <LogSheet date={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

/* ================= LOG SHEET ================= */

function LogSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const existing = useCycle((s) => s.days[date]);
  const saveDay = useCycle((s) => s.saveDay);
  const [d, setD] = useState<CycleDay>(
    existing ?? { date, period: false, symptoms: [], mood: undefined }
  );

  const toggleSym = (s: string) =>
    setD((p) => ({
      ...p,
      symptoms: p.symptoms.includes(s) ? p.symptoms.filter((x) => x !== s) : [...p.symptoms, s],
    }));

  return (
    <Sheet onClose={onClose} title={fmtDayFull(date)} tall>
      {/* period toggle */}
      <button
        onClick={() => setD((p) => ({ ...p, period: !p.period, flow: !p.period ? (p.flow ?? "medium") : p.flow }))}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl border p-4 transition-all active:scale-[0.99]",
          d.period ? "volt-glow border-volt/60 bg-volt/12" : "hairline bg-white/3"
        )}
      >
        <span className="flex items-center gap-3">
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl", d.period ? "bg-volt text-ink" : "bg-white/6 text-fog")}>
            <Droplet size={17} strokeWidth={2.4} />
          </span>
          <span className="text-left">
            <span className={cn("block text-sm font-bold", d.period && "text-volt")}>Period day</span>
            <span className="block font-mono text-[9px] uppercase text-ash">
              Part of your period — start or ongoing
            </span>
          </span>
        </span>
        <span className={cn("relative h-6 w-11 rounded-full transition-colors", d.period ? "bg-volt" : "bg-white/12")}>
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full transition-all", d.period ? "left-[22px] bg-ink" : "left-0.5 bg-fog")} />
        </span>
      </button>

      {/* flow */}
      <AnimatePresence initial={false}>
        {d.period && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="label mb-1.5 mt-4">Flow</div>
            <div className="grid grid-cols-3 gap-2">
              {FLOWS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setD((p) => ({ ...p, flow: f.id }))}
                  className={cn(
                    "rounded-xl border py-3 transition-colors",
                    d.flow === f.id ? "border-volt/60 bg-volt/12 text-volt" : "hairline bg-white/3 text-fog"
                  )}
                >
                  <div className="flex items-center justify-center gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Droplet key={i} size={11} className={i < f.dots ? "opacity-100" : "opacity-20"} strokeWidth={2.6} />
                    ))}
                  </div>
                  <div className="mt-1 font-mono text-[9px] font-bold uppercase">{f.label}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* symptoms */}
      <div className="label mb-1.5 mt-5">Symptoms</div>
      <div className="flex flex-wrap gap-1.5">
        {SYMPTOMS.map((s) => (
          <button
            key={s}
            onClick={() => toggleSym(s)}
            className={cn(
              "chip",
              d.symptoms.includes(s)
                ? "border-volt/60 bg-volt/12 text-volt"
                : "border-white/10 bg-white/3 text-fog"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* mood */}
      <div className="label mb-1.5 mt-5">Mood</div>
      <div className="grid grid-cols-3 gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m}
            onClick={() => setD((p) => ({ ...p, mood: p.mood === m ? undefined : m }))}
            className={cn(
              "rounded-xl border py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
              d.mood === m ? "border-volt/60 bg-volt/12 text-volt" : "hairline bg-white/3 text-fog"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      <button
        onClick={() => {
          vibrate(25);
          saveDay(d);
          onClose();
        }}
        className="btn-volt mt-6 flex w-full items-center justify-center gap-2 py-4 text-sm"
      >
        <Check size={16} strokeWidth={2.6} />
        Save day
      </button>
      {!existing && !d.period && d.symptoms.length === 0 && !d.mood && (
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-ash">
          Saving with nothing ticked records an all-good day
        </p>
      )}
    </Sheet>
  );
}
