import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  ImageUp,
  Loader2,
  Minus,
  PenLine,
  Plus,
  RefreshCw,
  ScanBarcode,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Chip, NumField, Sheet } from "../components/ui";
import { useFood } from "../lib/store";
import { estimateFromPhoto, FOODS, lookupBarcode, scaleFood, type OffProduct } from "../lib/foods";
import { fmtInt, num, vibrate } from "../lib/utils";
import type { MealType } from "../lib/types";

export type AddMode = "photo" | "barcode" | "search" | "manual";

const MODES: { id: AddMode; icon: typeof Camera; label: string }[] = [
  { id: "photo", icon: Camera, label: "Photo" },
  { id: "barcode", icon: ScanBarcode, label: "Scan" },
  { id: "search", icon: Search, label: "Search" },
  { id: "manual", icon: PenLine, label: "Quick" },
];

const defaultMeal = (): MealType => {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snacks";
};

const MEAL_LABEL: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export default function AddFood({
  date,
  initial,
  onClose,
}: {
  date: string;
  initial: AddMode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<AddMode>(initial);
  const [meal, setMeal] = useState<MealType>(defaultMeal());
  const addEntry = useFood((s) => s.addEntry);

  const save = (e: Parameters<typeof addEntry>[0]) => {
    vibrate(30);
    addEntry(e);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Log food" tall>
      {/* mode tabs */}
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border hairline bg-white/4 p-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={
              "flex flex-col items-center gap-1 rounded-xl py-2.5 transition-colors " +
              (mode === m.id ? "bg-volt text-ink" : "text-fog")
            }
          >
            <m.icon size={16} strokeWidth={2.2} />
            <span className="font-mono text-[8px] font-bold uppercase tracking-wider">{m.label}</span>
          </button>
        ))}
      </div>

      {/* meal picker */}
      <div className="mt-3 flex items-center gap-2">
        <span className="label shrink-0">Meal</span>
        <div className="flex flex-1 gap-1.5 overflow-x-auto no-scrollbar">
          {(Object.keys(MEAL_LABEL) as MealType[]).map((m) => (
            <Chip key={m} active={meal === m} onClick={() => setMeal(m)}>
              {MEAL_LABEL[m]}
          </Chip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {mode === "photo" && <PhotoPanel meal={meal} date={date} save={save} />}
        {mode === "barcode" && <BarcodePanel meal={meal} date={date} save={save} />}
        {mode === "search" && <SearchPanel meal={meal} date={date} save={save} />}
        {mode === "manual" && <ManualPanel meal={meal} date={date} save={save} />}
      </div>
    </Sheet>
  );
}

type SaveFn = (e: {
  date: string;
  meal: MealType;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "photo" | "barcode" | "search" | "manual";
  barcode?: string;
  brand?: string;
}) => void;

/* ================= PHOTO ================= */

function PhotoPanel({ meal, date, save }: { meal: MealType; date: string; save: SaveFn }) {
  const [stage, setStage] = useState<"pick" | "analyzing" | "result">("pick");
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [est, setEst] = useState<{ name: string; grams: string; kcal: string; protein: string; carbs: string; fat: string } | null>(null);
  const [confidence, setConfidence] = useState(0);
  const ratio = useRef({ kcal: 0, p: 0, c: 0, f: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (fileRef.current) fileRef.current.value = "";
    setImgUrl(URL.createObjectURL(f));
    setStage("analyzing");
    const start = Date.now();
    try {
      const r = await estimateFromPhoto(f);
      const wait = Math.max(0, 1600 - (Date.now() - start));
      await new Promise((res) => setTimeout(res, wait));
      ratio.current = {
        kcal: r.kcal / r.grams,
        p: r.protein / r.grams,
        c: r.carbs / r.grams,
        f: r.fat / r.grams,
      };
      setConfidence(r.confidence);
      setEst({
        name: r.name,
        grams: `${r.grams}`,
        kcal: `${r.kcal}`,
        protein: `${r.protein}`,
        carbs: `${r.carbs}`,
        fat: `${r.fat}`,
      });
      setStage("result");
    } catch {
      setStage("pick");
    }
  };

  const setGrams = (g: number) => {
    if (!est) return;
    const grams = Math.max(10, Math.round(g));
    setEst({
      ...est,
      grams: `${grams}`,
      kcal: `${Math.round(ratio.current.kcal * grams)}`,
      protein: `${Math.round(ratio.current.p * grams * 10) / 10}`,
      carbs: `${Math.round(ratio.current.c * grams * 10) / 10}`,
      fat: `${Math.round(ratio.current.f * grams * 10) / 10}`,
    });
  };

  if (stage === "pick")
    return (
      <div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/12 bg-white/2 px-6 py-12 active:scale-[0.99]"
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-volt/12 text-volt">
            <ImageUp size={24} />
          </div>
          <div className="display text-lg">Photograph your meal</div>
          <p className="max-w-[30ch] text-xs leading-relaxed text-fog">
            The camera estimates the dish, portion and macros. Every number stays editable.
          </p>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
    );

  if (stage === "analyzing")
    return (
      <div className="relative overflow-hidden rounded-3xl border hairline">
        {imgUrl && <img src={imgUrl} alt="meal" className="h-64 w-full object-cover" />}
        <div className="absolute inset-0 bg-ink/40" />
        {/* scanline */}
        <div className="scanline absolute left-4 right-4 h-0.5 bg-volt shadow-[0_0_16px_rgba(215,255,63,0.9)]" />
        {[["top-3 left-3 border-t-2 border-l-2"], ["top-3 right-3 border-t-2 border-r-2"], ["bottom-3 left-3 border-b-2 border-l-2"], ["bottom-3 right-3 border-b-2 border-r-2"]].map(([c], i) => (
          <span key={i} className={`absolute h-8 w-8 rounded-sm border-volt ${c}`} />
        ))}
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1">
          <span className="label-volt flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 backdrop-blur">
            <Loader2 size={11} className="animate-spin" />
            Analysing meal
          </span>
        </div>
      </div>
    );

  return (
    est && (
      <div>
        <div className="relative overflow-hidden rounded-2xl border hairline">
          {imgUrl && <img src={imgUrl} alt="meal" className="h-28 w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          <div className="absolute bottom-2.5 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-volt px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-ink">
              <Sparkles size={10} />
              {Math.round(confidence * 100)}% match
            </span>
            <button
              onClick={() => setStage("pick")}
              className="flex items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 font-mono text-[9px] uppercase text-fog backdrop-blur"
            >
              <RefreshCw size={9} /> Retake
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="label mb-1.5">Dish</div>
          <input
            value={est.name}
            onChange={(e) => setEst({ ...est, name: e.target.value })}
            className="w-full rounded-xl border hairline bg-white/5 px-3.5 py-2.5 text-sm font-semibold focus:border-volt/50"
          />
        </div>

        <div className="mt-3">
          <div className="label mb-1.5">Portion</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setGrams(num(est.grams) - 25)} className="grid h-11 w-11 place-items-center rounded-xl border hairline bg-white/5 active:scale-95">
              <Minus size={15} />
            </button>
            <div className="flex-1">
              <NumField value={est.grams} onChange={(v) => setGrams(num(v))} suffix="g" />
            </div>
            <button onClick={() => setGrams(num(est.grams) + 25)} className="grid h-11 w-11 place-items-center rounded-xl border hairline bg-white/5 active:scale-95">
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {([["Calories", "kcal", "kcal"], ["Protein", "g", "protein"], ["Carbs", "g", "carbs"], ["Fat", "g", "fat"]] as const).map(([label, suffix, key]) => (
            <div key={key}>
              <div className="label mb-1.5 text-center">{label}</div>
              <NumField value={est[key]} onChange={(v) => setEst({ ...est, [key]: v })} suffix={suffix} />
            </div>
          ))}
        </div>

        <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-wider text-ash">
          Estimate only — verify before saving
        </p>

        <button
          onClick={() =>
            save({
              date, meal, source: "photo",
              name: est.name || "Meal",
              grams: num(est.grams),
              kcal: Math.round(num(est.kcal)),
              protein: Math.round(num(est.protein) * 10) / 10,
              carbs: Math.round(num(est.carbs) * 10) / 10,
              fat: Math.round(num(est.fat) * 10) / 10,
            })
          }
          className="btn-volt mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
        >
          <Check size={15} strokeWidth={2.6} />
          Save to {MEAL_LABEL[meal]}
        </button>
      </div>
    )
  );
}

/* ================= BARCODE ================= */

const DEMO_CODES = [
  { code: "3017620422003", label: "Nutella" },
  { code: "5449000000996", label: "Cola" },
  { code: "5000159484695", label: "Snickers" },
];

function BarcodePanel({ meal, date, save }: { meal: MealType; date: string; save: SaveFn }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [netFail, setNetFail] = useState(false);
  const [product, setProduct] = useState<OffProduct | null>(null);
  const [code, setCode] = useState("");
  const [grams, setGrams] = useState(100);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => controlsRef.current?.stop(), []);

  const lookup = async (c: string) => {
    setLooking(true);
    setNotFound(false);
    setNetFail(false);
    setProduct(null);
    try {
      const p = await lookupBarcode(c);
      if (p) {
        setProduct(p);
        setGrams(p.servingGrams ?? 100);
      } else setNotFound(true);
    } catch {
      setNetFail(true);
    }
    setLooking(false);
  };

  const start = async () => {
    setError(null);
    setNotFound(false);
    setNetFail(false);
    setProduct(null);
    try {
      const reader = new BrowserMultiFormatReader();
      setScanning(true);
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) {
            vibrate(60);
            stop();
            lookup(result.getText());
          }
        }
      );
      controlsRef.current = controls;
    } catch (e) {
      setScanning(false);
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser, or type the barcode below."
          : "No camera available on this device. Type the barcode below instead."
      );
    }
  };

  if (product) {
    const k = grams / 100;
    return (
      <div>
        <div className="card-flat flex items-center gap-3 p-3">
          {product.image ? (
            <img src={product.image} alt="" className="h-14 w-14 rounded-xl bg-white/5 object-contain" />
          ) : (
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-white/5 text-ash">
              <ScanBarcode size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{product.name}</div>
            <div className="truncate font-mono text-[9px] uppercase text-ash">
              {product.brand ?? "Open Food Facts"} · {product.barcode}
            </div>
            <div className="mt-1 font-mono text-[9px] text-fog tnum">
              per 100g: {product.per100.kcal} kcal · P{product.per100.p} C{product.per100.c} F{product.per100.f}
            </div>
          </div>
          <button onClick={() => { setProduct(null); }} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-fog">
            <X size={14} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.servingGrams && (
            <Chip active={grams === product.servingGrams} onClick={() => setGrams(product.servingGrams!)}>
              1 serving · {product.servingGrams}g
            </Chip>
          )}
          <Chip active={grams === 100} onClick={() => setGrams(100)}>100g</Chip>
          <Chip active={grams === 200} onClick={() => setGrams(200)}>200g</Chip>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => setGrams(Math.max(5, grams - 10))} className="grid h-10 w-10 place-items-center rounded-xl border hairline bg-white/5 active:scale-95"><Minus size={14} /></button>
          <div className="flex-1"><NumField value={`${grams}`} onChange={(v) => setGrams(Math.max(1, Math.round(num(v))))} suffix="g" /></div>
          <button onClick={() => setGrams(grams + 10)} className="grid h-10 w-10 place-items-center rounded-xl border hairline bg-white/5 active:scale-95"><Plus size={14} /></button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            [`${fmtInt(product.per100.kcal * k)}`, "kcal"],
            [`${Math.round(product.per100.p * k * 10) / 10}g`, "protein"],
            [`${Math.round(product.per100.c * k * 10) / 10}g`, "carbs"],
            [`${Math.round(product.per100.f * k * 10) / 10}g`, "fat"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl border hairline bg-white/3 py-2">
              <div className="display text-base tnum">{v}</div>
              <div className="label mt-0.5">{l}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() =>
            save({
              date, meal, source: "barcode",
              name: product.name,
              brand: product.brand,
              barcode: product.barcode,
              grams,
              kcal: Math.round(product.per100.kcal * k),
              protein: Math.round(product.per100.p * k * 10) / 10,
              carbs: Math.round(product.per100.c * k * 10) / 10,
              fat: Math.round(product.per100.f * k * 10) / 10,
            })
          }
          className="btn-volt mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
        >
          <Check size={15} strokeWidth={2.6} />
          Save to {MEAL_LABEL[meal]}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* viewfinder — video stays mounted so the scanner can attach */}
      <div className="relative overflow-hidden rounded-3xl border hairline bg-black">
        <video
          ref={videoRef}
          className={"h-52 w-full object-cover " + (scanning ? "" : "invisible")}
          muted
          playsInline
        />
        {!scanning && (
          <button
            onClick={start}
            className="absolute inset-0 flex h-52 w-full flex-col items-center justify-center gap-3"
          >
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-volt/12 text-volt">
              <ScanBarcode size={24} />
            </div>
            <span className="display text-lg">Point at a barcode</span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-ash">
              Tap to start camera
            </span>
          </button>
        )}
        {scanning && (
          <>
            <div className="scanline absolute left-6 right-6 h-0.5 bg-volt shadow-[0_0_16px_rgba(215,255,63,0.9)]" />
            {[
              ["top-3 left-3 border-t-2 border-l-2"],
              ["top-3 right-3 border-t-2 border-r-2"],
              ["bottom-3 left-3 border-b-2 border-l-2"],
              ["bottom-3 right-3 border-b-2 border-r-2"],
            ].map(([c], i) => (
              <span key={i} className={`absolute h-8 w-8 rounded-sm border-volt ${c}`} />
            ))}
            <button
              onClick={stop}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/80 px-4 py-1.5 font-mono text-[10px] uppercase text-fog backdrop-blur"
            >
              Stop camera
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-ambery/25 bg-ambery/8 px-3.5 py-3">
          <ShieldAlert size={15} className="mt-0.5 shrink-0 text-ambery" />
          <p className="text-xs leading-relaxed text-ambery/90">{error}</p>
        </div>
      )}
      {looking && (
        <div className="label-volt mt-3 flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Looking up product…
        </div>
      )}
      {notFound && (
        <div className="mt-3 rounded-2xl border border-white/8 bg-white/3 px-3.5 py-3 text-xs text-fog">
          Product not found in Open Food Facts. Check the code, or add it manually in the{" "}
          <span className="font-semibold text-bone">Quick</span> tab.
        </div>
      )}
      {netFail && (
        <div className="mt-3 rounded-2xl border border-ambery/25 bg-ambery/8 px-3.5 py-3 text-xs text-ambery/90">
          Couldn't reach Open Food Facts — check your connection and try again.
        </div>
      )}

      {/* manual code */}
      <div className="mt-4">
        <div className="label mb-1.5">Enter barcode manually</div>
        <div className="flex gap-2">
          <input
            value={code}
            inputMode="numeric"
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0123456789012"
            className="flex-1 rounded-xl border hairline bg-white/5 px-3.5 py-2.5 font-mono text-sm tracking-widest placeholder:text-ash focus:border-volt/50"
          />
          <button
            onClick={() => code.length >= 8 && lookup(code)}
            disabled={code.length < 8 || looking}
            className="btn-volt px-5 text-xs disabled:opacity-40"
          >
            Find
          </button>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="label">Try</span>
          {DEMO_CODES.map((d) => (
            <Chip key={d.code} onClick={() => { setCode(d.code); lookup(d.code); }}>
              {d.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= SEARCH ================= */

function SearchPanel({ meal, date, save }: { meal: MealType; date: string; save: SaveFn }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [grams, setGrams] = useState(100);

  const results = FOODS.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()));
  const food = FOODS.find((f) => f.name === sel);

  return (
    <div>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(null); }}
          placeholder="Search chicken, oats, yoghurt…"
          autoFocus={false}
          className="w-full rounded-xl border hairline bg-white/5 py-3 pl-10 pr-3 text-sm placeholder:text-ash focus:border-volt/50"
        />
      </div>

      {food ? (
        <div className="mt-3">
          <div className="card-flat p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{food.name}</div>
                <div className="label mt-0.5">{food.tag} · per 100g {food.kcal} kcal</div>
              </div>
              <button onClick={() => setSel(null)} className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-fog"><X size={14} /></button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[food.serving, food.serving * 2, 100].map((g) => (
                <Chip key={g} active={grams === g} onClick={() => setGrams(g)}>
                  {g === food.serving ? `1 serving · ${g}g` : `${g}g`}
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setGrams(Math.max(5, grams - 10))} className="grid h-10 w-10 place-items-center rounded-xl border hairline bg-white/5 active:scale-95"><Minus size={14} /></button>
              <div className="flex-1"><NumField value={`${grams}`} onChange={(v) => setGrams(Math.max(1, Math.round(num(v))))} suffix="g" /></div>
              <button onClick={() => setGrams(grams + 10)} className="grid h-10 w-10 place-items-center rounded-xl border hairline bg-white/5 active:scale-95"><Plus size={14} /></button>
            </div>
            {(() => {
              const m = scaleFood(food, grams);
              return (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[[`${m.kcal}`, "kcal"], [`${m.protein}g`, "protein"], [`${m.carbs}g`, "carbs"], [`${m.fat}g`, "fat"]].map(([v, l]) => (
                      <div key={l} className="rounded-xl border hairline bg-white/3 py-2">
                        <div className="display text-base tnum">{v}</div>
                        <div className="label mt-0.5">{l}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => save({ date, meal, source: "search", name: food.name, grams, ...m })}
                    className="btn-volt mt-3 flex w-full items-center justify-center gap-2 py-3.5 text-sm"
                  >
                    <Check size={15} strokeWidth={2.6} />
                    Save to {MEAL_LABEL[meal]}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="mt-2 max-h-[46vh] space-y-1.5 overflow-y-auto no-scrollbar pb-2">
          {results.map((f) => (
            <button
              key={f.name}
              onClick={() => { setSel(f.name); setGrams(f.serving); }}
              className="flex w-full items-center justify-between rounded-xl border hairline bg-white/2 px-3.5 py-2.5 text-left active:scale-[0.99]"
            >
              <div>
                <div className="text-sm font-semibold">{f.name}</div>
                <div className="font-mono text-[9px] uppercase text-ash">{f.tag}</div>
              </div>
              <div className="text-right font-mono text-[10px] text-fog tnum">
                <div className="text-sm font-bold text-bone">{f.kcal}</div>
                kcal / 100g
              </div>
            </button>
          ))}
          {results.length === 0 && (
            <div className="py-8 text-center text-xs text-ash">No matches — try the Quick tab.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= MANUAL ================= */

function ManualPanel({ meal, date, save }: { meal: MealType; date: string; save: SaveFn }) {
  const [v, setV] = useState({ name: "", grams: "", kcal: "", protein: "", carbs: "", fat: "" });
  const ok = v.name.trim().length > 0 && num(v.kcal) > 0;

  return (
    <div>
      <div className="label mb-1.5">Name</div>
      <input
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        placeholder="e.g. Post-workout shake"
        className="w-full rounded-xl border hairline bg-white/5 px-3.5 py-2.5 text-sm font-semibold placeholder:text-ash focus:border-volt/50"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <div className="label mb-1.5">Calories</div>
          <NumField value={v.kcal} onChange={(x) => setV({ ...v, kcal: x })} suffix="kcal" />
        </div>
        <div>
          <div className="label mb-1.5">Amount (optional)</div>
          <NumField value={v.grams} onChange={(x) => setV({ ...v, grams: x })} suffix="g" />
        </div>
        <div>
          <div className="label mb-1.5">Protein</div>
          <NumField value={v.protein} onChange={(x) => setV({ ...v, protein: x })} suffix="g" />
        </div>
        <div>
          <div className="label mb-1.5">Carbs</div>
          <NumField value={v.carbs} onChange={(x) => setV({ ...v, carbs: x })} suffix="g" />
        </div>
        <div className="col-span-2">
          <div className="label mb-1.5">Fat</div>
          <NumField value={v.fat} onChange={(x) => setV({ ...v, fat: x })} suffix="g" />
        </div>
      </div>
      <button
        onClick={() =>
          ok &&
          save({
            date, meal, source: "manual",
            name: v.name.trim(),
            grams: num(v.grams),
            kcal: Math.round(num(v.kcal)),
            protein: Math.round(num(v.protein) * 10) / 10,
            carbs: Math.round(num(v.carbs) * 10) / 10,
            fat: Math.round(num(v.fat) * 10) / 10,
          })
        }
        disabled={!ok}
        className="btn-volt mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-sm disabled:opacity-40"
      >
        <Check size={15} strokeWidth={2.6} />
        Save to {MEAL_LABEL[meal]}
      </button>
    </div>
  );
}
