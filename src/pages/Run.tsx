import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { create } from "zustand";
import {
  ChevronRight,
  CircleAlert,
  Flag,
  Flame,
  Footprints,
  Gauge,
  LocateFixed,
  MapPin,
  Navigation,
  Pause,
  Play,
  Route as RouteIcon,
  ShieldQuestion,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, Empty, useInterval } from "../components/ui";
import RunMap from "./RunMap";
import { estRunKcal, fmtClock, fmtDayShort, fmtPace, haversineM, isoDate, timeAgo, uid, vibrate } from "../lib/utils";
import { useRuns, useSettings } from "../lib/store";
import type { Run, RunPoint, Split } from "../lib/types";

/* ================================================================== */
/* Live session store (in-memory; gps watcher lives in the component)  */
/* ================================================================== */

type Status = "idle" | "running" | "paused" | "done";

interface RunSession {
  status: Status;
  demo: boolean;
  startedAt: number;
  accumPaused: number;
  pausedAt: number | null;
  points: RunPoint[];
  distanceM: number;
  splits: Split[];
  splitBaseSec: number;
  accuracy: number | null;
  start: (demo: boolean) => void;
  addPoint: (p: RunPoint, accuracy: number | null) => void;
  pause: () => void;
  resume: () => void;
  finish: () => void;
  reset: () => void;
}

export const useRunSession = create<RunSession>((set, get) => ({
  status: "idle",
  demo: false,
  startedAt: 0,
  accumPaused: 0,
  pausedAt: null,
  points: [],
  distanceM: 0,
  splits: [],
  splitBaseSec: 0,
  accuracy: null,

  start: (demo) =>
    set({
      status: "running",
      demo,
      startedAt: Date.now(),
      accumPaused: 0,
      pausedAt: null,
      points: [],
      distanceM: 0,
      splits: [],
      splitBaseSec: 0,
      accuracy: null,
    }),

  addPoint: (p, accuracy) => {
    const s = get();
    if (s.status !== "running") return;
    const last = s.points[s.points.length - 1];
    let dm = 0;
    if (last) {
      const dt = (p.t - last.t) / 1000;
      if (dt <= 0) return;
      dm = haversineM(last, p);
      // smoothing: drop jitter and impossible spikes
      if (dm < 1.5 && (accuracy == null || accuracy > 12)) return;
      if (dm / dt > 8.5 && (accuracy == null || accuracy > 15)) return;
    }
    const distanceM = s.distanceM + dm;
    const activeSec = (p.t - s.startedAt - s.accumPaused) / 1000;
    let splits = s.splits;
    let splitBaseSec = s.splitBaseSec;
    const nextKm = splits.length + 1;
    if (distanceM >= nextKm * 1000) {
      splits = [...splits, { km: nextKm, sec: Math.round(activeSec - splitBaseSec) }];
      splitBaseSec = activeSec;
      vibrate(60);
    }
    set({ points: [...s.points, p], distanceM, splits, splitBaseSec, accuracy });
  },

  pause: () => set({ status: "paused", pausedAt: Date.now() }),
  resume: () => {
    const s = get();
    set({
      status: "running",
      accumPaused: s.accumPaused + (s.pausedAt ? Date.now() - s.pausedAt : 0),
      pausedAt: null,
    });
  },
  finish: () => set({ status: "done" }),
  reset: () =>
    set({
      status: "idle",
      points: [],
      distanceM: 0,
      splits: [],
      accumPaused: 0,
      pausedAt: null,
      accuracy: null,
    }),
}));

const activeSecOf = (s: RunSession, now = Date.now()) =>
  s.status === "idle"
    ? 0
    : Math.max(
        0,
        ((s.status === "paused" && s.pausedAt ? s.pausedAt : now) - s.startedAt - s.accumPaused) / 1000
      );

/* ================================================================== */

export default function RunPage() {
  const status = useRunSession((s) => s.status);
  if (status === "running" || status === "paused") return <LiveRun />;
  if (status === "done") return <RunSummary />;
  return <RunHome />;
}

/* ================================================================== */
/* HOME                                                                */
/* ================================================================== */

function RunHome() {
  const [params, setParams] = useSearchParams();
  const runs = useRuns((s) => s.runs);
  const deleteRun = useRuns((s) => s.deleteRun);
  const [demo, setDemo] = useState(false);
  const [permMsg, setPermMsg] = useState<string | null>(null);
  const [sel, setSel] = useState<Run | null>(null);

  const begin = (useDemo: boolean) => {
    if (useDemo) {
      useRunSession.getState().start(true);
      return;
    }
    if (!("geolocation" in navigator)) {
      setPermMsg("This device has no GPS support. Simulated mode still works below.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermMsg(null);
        useRunSession.getState().start(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED)
          setPermMsg(
            "Location denied — CoreSync can't draw your route or measure pace without it. Enable it in your browser settings, or run in Simulated GPS mode."
          );
        else setPermMsg("Couldn't get a GPS fix yet — step outside or try Simulated GPS mode.");
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (params.get("start") === "1") {
      setParams({}, { replace: true });
      begin(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, setParams]);

  const weekMs = Date.now() - 7 * 86400000;
  const weekRuns = runs.filter((r) => r.endedAt > weekMs);
  const weekKm = weekRuns.reduce((a, r) => a + r.distanceKm, 0);
  const weekSec = weekRuns.reduce((a, r) => a + r.durationSec, 0);

  // 8-week trend
  const weeks = useMemo(() => {
    const out: number[] = Array(8).fill(0);
    const monday = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      return d.getTime();
    })();
    for (const r of runs) {
      const w = Math.floor((monday - r.endedAt) / (7 * 86400000));
      if (w >= 0 && w < 8) out[7 - w] += r.distanceKm;
    }
    return out;
  }, [runs]);
  const maxW = Math.max(1, ...weeks);

  return (
    <div className="px-4 pb-10 pt-safe">
      <header className="pt-6">
        <div className="label-volt">Cardio</div>
        <h1 className="display mt-1 text-[30px] leading-none">Run</h1>
      </header>

      {/* week hero */}
      <section className="card noise relative mt-5 overflow-hidden p-5">
        <div className="pointer-events-none absolute -left-14 -top-14 h-44 w-44 rounded-full bg-volt/8 blur-2xl" />
        <div className="flex items-end justify-between">
          <div>
            <div className="label">This week</div>
            <div className="display mt-1 text-5xl leading-none tnum">
              {weekKm.toFixed(1)}
              <span className="ml-1 text-xl text-fog">km</span>
            </div>
          </div>
          <div className="text-right font-mono text-[10px] uppercase text-fog tnum">
            <div>{weekRuns.length} runs</div>
            <div className="mt-0.5">{fmtClock(weekSec)} total</div>
          </div>
        </div>
        <div className="mt-4 flex h-14 items-end gap-1">
          {weeks.map((v, i) => (
            <div key={i} className="flex flex-1 items-end rounded-md bg-white/4 p-0.5" style={{ height: "100%" }}>
              <div
                className={"w-full rounded-sm " + (i === 7 ? "bg-volt" : "bg-white/20")}
                style={{ height: `${Math.max(v > 0 ? 8 : 3, (v / maxW) * 100)}%` }}
                title={`${v.toFixed(1)} km`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[8px] uppercase text-ash">
          <span>8w ago</span>
          <span>this week</span>
        </div>
      </section>

      {/* start */}
      <button
        onClick={() => begin(demo)}
        className="btn-volt volt-glow mt-4 flex w-full items-center justify-center gap-2 py-4 text-base"
      >
        <Play size={18} strokeWidth={2.6} />
        Start run
      </button>

      {/* permission explainer */}
      <section className="card-flat mt-3 flex items-start gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-volt/12 text-volt">
          <ShieldQuestion size={17} />
        </div>
        <div className="text-xs leading-relaxed text-fog">
          <span className="font-bold text-bone">Why location?</span> CoreSync uses GPS only to trace
          your route on the map and compute live distance, pace and kilometre splits. Denied?
          Everything still works in{" "}
          <span className="text-volt">Simulated GPS</span> — your data never leaves the device.
        </div>
      </section>

      {permMsg && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-ambery/25 bg-ambery/8 px-3.5 py-3">
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-ambery" />
          <p className="text-xs leading-relaxed text-ambery/90">{permMsg}</p>
        </div>
      )}

      {/* demo toggle */}
      <button
        onClick={() => setDemo(!demo)}
        className="mt-3 flex w-full items-center justify-between rounded-2xl border hairline bg-white/3 px-4 py-3 active:scale-[0.99]"
      >
        <span className="flex items-center gap-2.5 text-xs font-semibold text-fog">
          <Navigation size={14} className={demo ? "text-volt" : "text-ash"} />
          Simulated GPS — no location needed
        </span>
        <span
          className={
            "relative h-6 w-11 rounded-full transition-colors " + (demo ? "bg-volt" : "bg-white/12")
          }
        >
          <span
            className={
              "absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all " +
              (demo ? "left-[22px]" : "left-0.5 bg-fog")
            }
          />
        </span>
      </button>

      {/* history */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between px-1">
          <span className="display text-lg">History</span>
          <span className="label">{runs.length} runs</span>
        </div>
        <div className="mt-2 space-y-2">
          {runs.length === 0 && (
            <Empty icon={<MapPin size={20} />} title="No runs yet" body="Your routes, pace and splits will live here." />
          )}
          {[...runs]
            .sort((a, b) => b.endedAt - a.endedAt)
            .map((r) => (
              <button
                key={r.id}
                onClick={() => setSel(r)}
                className="card-flat flex w-full items-center gap-3.5 p-3 text-left active:scale-[0.99]"
              >
                <RouteThumb points={r.points} className="h-16 w-[5.5rem] shrink-0 rounded-xl border hairline bg-black" />
                <div className="min-w-0 flex-1">
                  <div className="display text-xl leading-none tnum">
                    {r.distanceKm.toFixed(2)} <span className="text-xs text-fog">km</span>
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase text-ash tnum">
                    {fmtDayShort(isoDate(new Date(r.endedAt)))} · {fmtClock(r.durationSec)} ·{" "}
                    {fmtPace(r.durationSec / r.distanceKm)}/km
                  </div>
                  {r.demo && (
                    <span className="mt-1 inline-block rounded bg-white/6 px-1.5 py-0.5 font-mono text-[8px] uppercase text-fog">
                      simulated
                    </span>
                  )}
                </div>
                <ChevronRight size={15} className="text-ash" />
              </button>
            ))}
        </div>
      </section>

      {/* run detail sheet */}
      <AnimatePresence>
        {sel && <SavedRunSheet run={sel} onClose={() => setSel(null)} onDelete={() => { deleteRun(sel.id); setSel(null); }} />}
      </AnimatePresence>
    </div>
  );
}

function RouteThumb({ points, className }: { points: RunPoint[]; className?: string }) {
  const path = useMemo(() => {
    if (points.length < 2) return "";
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const W = 88, H = 64, P = 8;
    const sx = (maxLng - minLng) / (W - P * 2) || 1e-9;
    const sy = (maxLat - minLat) / (H - P * 2) || 1e-9;
    const s = Math.max(sx, sy);
    return points
      .map((p, i) => {
        const x = P + (p.lng - minLng) / s;
        const y = H - P - (p.lat - minLat) / s;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points]);
  return (
    <svg viewBox="0 0 88 64" className={className}>
      <path d={path} fill="none" stroke="#d7ff3f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 1 && (() => {
        const last = path.split("L").pop()!.split(",");
        return <circle cx={last[0]} cy={last[1]} r="3" fill="#d7ff3f" stroke="#060708" strokeWidth="1.5" />;
      })()}
    </svg>
  );
}

function SavedRunSheet({ run, onClose, onDelete }: { run: Run; onClose: () => void; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-[3px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-8 z-50 flex flex-col overflow-hidden rounded-t-[26px] border-t border-white/10 bg-panel">
        <div className="relative h-[38%] shrink-0">
          <RunMap points={run.points} fit className="h-full w-full" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-panel to-transparent" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 no-scrollbar">
          <div className="flex items-center justify-between">
            <div>
              <div className="display text-4xl leading-none tnum">
                {run.distanceKm.toFixed(2)} <span className="text-base text-fog">km</span>
              </div>
              <div className="label mt-1">
                {fmtDayShort(isoDate(new Date(run.endedAt)))} · {timeAgo(run.endedAt)}
                {run.demo ? " · simulated" : ""}
              </div>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/6 text-fog">
              <X size={15} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: Timer, label: "Time", v: fmtClock(run.durationSec) },
              { icon: Gauge, label: "Avg pace", v: `${fmtPace(run.durationSec / run.distanceKm)}` },
              { icon: Flame, label: "Energy", v: `${run.kcal} kcal` },
            ].map((s) => (
              <div key={s.label} className="card-flat p-3 text-center">
                <s.icon size={14} className="mx-auto text-volt" />
                <div className="display mt-1.5 text-lg leading-none tnum">{s.v}</div>
                <div className="label mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {run.splits.length > 0 && (
            <div className="mt-4">
              <div className="label">Splits · per km</div>
              <div className="mt-2 space-y-1">
                {run.splits.map((sp) => (
                  <div key={sp.km} className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2">
                    <span className="font-mono text-[10px] uppercase text-fog">km {sp.km}</span>
                    <span className="font-mono text-xs font-bold text-bone tnum">{fmtPace(sp.sec)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (confirm) onDelete();
              else {
                setConfirm(true);
                setTimeout(() => setConfirm(false), 2500);
              }
            }}
            className={
              "mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold uppercase tracking-wider " +
              (confirm ? "border-alert/60 bg-alert/15 text-alert" : "hairline bg-white/3 text-fog")
            }
          >
            <Trash2 size={14} />
            {confirm ? "Tap again to delete" : "Delete run"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================================================== */
/* LIVE                                                                */
/* ================================================================== */

function LiveRun() {
  const s = useRunSession();
  const [now, setNow] = useState(Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);
  useInterval(() => setNow(Date.now()), 500);
  const demoRef = useRef<{ lat: number; lng: number; heading: number } | null>(null);

  const activeSec = activeSecOf(s, now);
  const km = s.distanceM / 1000;
  const avgPace = km > 0.05 ? activeSec / km : 0;

  // current pace: window over last ~20 s of movement
  const paceNow = useMemo(() => {
    const pts = s.points;
    if (pts.length < 3) return 0;
    const cutoff = pts[pts.length - 1].t - 20000;
    let i = pts.length - 1;
    while (i > 0 && pts[i].t > cutoff) i--;
    let d = 0;
    for (let j = i + 1; j < pts.length; j++) d += haversineM(pts[j - 1], pts[j]);
    const t = (pts[pts.length - 1].t - pts[i].t) / 1000;
    return d > 8 ? t / (d / 1000) : avgPace;
  }, [s.points, avgPace]);

  /* GPS watch / demo generator */
  useEffect(() => {
    if (s.status !== "running") return;
    if (s.demo) {
      if (!demoRef.current) {
        const last = useRunSession.getState().points.slice(-1)[0];
        demoRef.current = last
          ? { lat: last.lat, lng: last.lng, heading: Math.random() * Math.PI * 2 }
          : { lat: 52.3731, lng: 4.8922, heading: Math.random() * Math.PI * 2 };
      }
      const id = setInterval(() => {
        const st = demoRef.current!;
        st.heading += (Math.random() - 0.5) * 0.55;
        const speed = 2.6 + Math.random() * 0.9; // m/s
        st.lat += (Math.cos(st.heading) * speed * 1.4) / 111320;
        st.lng += (Math.sin(st.heading) * speed * 1.4) / (111320 * Math.cos((st.lat * Math.PI) / 180));
        useRunSession.getState().addPoint({ lat: st.lat, lng: st.lng, t: Date.now() }, 5);
      }, 1400);
      return () => clearInterval(id);
    }
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        useRunSession.getState().addPoint(
          { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() },
          pos.coords.accuracy
        ),
      () => {},
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [s.status, s.demo]);

  return (
    <div className="flex h-full flex-col">
      {/* map */}
      <div className="relative h-[44%] shrink-0">
        <RunMap points={s.points} follow showDot className="h-full w-full" />
        <div className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1.5 backdrop-blur">
          <span className="label-volt flex items-center gap-1.5">
            <span className={"h-1.5 w-1.5 rounded-full " + (s.status === "paused" ? "bg-ambery" : "bg-volt blink")} />
            {s.status === "paused" ? "Paused" : s.demo ? "Simulated GPS" : "GPS live"}
          </span>
        </div>
        {s.accuracy != null && !s.demo && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1.5 font-mono text-[9px] text-fog backdrop-blur tnum">
            <LocateFixed size={10} />
            ±{Math.round(s.accuracy)}m
          </div>
        )}
        {s.points.length === 0 && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink/85 px-4 py-2.5 backdrop-blur">
            <LocateFixed size={14} className="animate-pulse text-volt" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-bone">
              {s.demo ? "Spinning up simulated GPS…" : "Waiting for GPS fix…"}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink to-transparent" />
      </div>

      {/* stats */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
        <div className="pt-3 text-center">
          <div className="label">Distance</div>
          <div className="display mt-0.5 text-[64px] leading-none tnum">
            {km.toFixed(2)}
            <span className="ml-1 text-2xl text-fog">km</span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: Timer, label: "Time", v: fmtClock(activeSec) },
            { icon: Gauge, label: "Pace", v: paceNow ? `${fmtPace(paceNow)}` : "–:––" },
            { icon: RouteIcon, label: "Avg", v: km > 0.05 ? `${fmtPace(avgPace)}` : "–:––" },
          ].map((x) => (
            <div key={x.label} className="card-flat p-3 text-center">
              <x.icon size={14} className="mx-auto text-volt" />
              <div className="display mt-1 text-xl leading-none tnum">{x.v}</div>
              <div className="label mt-1">{x.label}</div>
            </div>
          ))}
        </div>

        {/* splits */}
        <div className="mt-4">
          <div className="label px-1">Splits · per km</div>
          <div className="mt-1.5 space-y-1">
            {s.splits.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center font-mono text-[9px] uppercase text-ash">
                First split lands at 1 km
              </div>
            )}
            {[...s.splits].reverse().map((sp) => (
              <div key={sp.km} className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2">
                <span className="font-mono text-[10px] uppercase text-fog">km {sp.km}</span>
                <span className="font-mono text-xs font-bold text-volt tnum">{fmtPace(sp.sec)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* controls */}
        <div className="mt-5 flex items-center justify-center gap-5">
          {s.status === "running" ? (
            <button
              onClick={() => {
                s.pause();
                vibrate(30);
              }}
              className="volt-glow grid h-20 w-20 place-items-center rounded-full bg-volt text-ink active:scale-95"
              aria-label="Pause"
            >
              <Pause size={26} strokeWidth={2.6} />
            </button>
          ) : (
            <button
              onClick={() => {
                s.resume();
                vibrate(30);
              }}
              className="volt-glow grid h-20 w-20 place-items-center rounded-full bg-volt text-ink active:scale-95"
              aria-label="Resume"
            >
              <Play size={26} strokeWidth={2.6} className="ml-1" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirmEnd) {
                s.finish();
                vibrate(80);
              } else {
                setConfirmEnd(true);
                setTimeout(() => setConfirmEnd(false), 3000);
              }
            }}
            className={
              "grid h-16 w-16 place-items-center rounded-full border transition-colors active:scale-95 " +
              (confirmEnd ? "border-alert bg-alert/20 text-alert" : "border-white/20 bg-white/5 text-bone")
            }
            aria-label="Finish run"
          >
            <Flag size={20} strokeWidth={2.4} />
          </button>
        </div>
        {confirmEnd && (
          <div className="mt-3 text-center font-mono text-[9px] uppercase tracking-widest text-alert">
            Tap flag again to end run
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* SUMMARY                                                             */
/* ================================================================== */

function RunSummary() {
  const s = useRunSession();
  const weightKg = useSettings((st) => st.weightKg);
  const addRun = useRuns((st) => st.addRun);
  const km = s.distanceM / 1000;
  const activeSec = activeSecOf(s, s.points.length ? s.points[s.points.length - 1].t : Date.now());
  const kcal = estRunKcal(km, weightKg);

  return (
    <div className="flex h-full flex-col">
      <div className="relative h-[40%] shrink-0">
        <RunMap points={s.points} fit className="h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute left-4 top-4">
          <div className="label-volt rounded-full bg-ink/85 px-3 py-1.5 backdrop-blur">Run complete</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
        <div className="pt-3 text-center">
          <div className="display text-[56px] leading-none tnum">
            {km.toFixed(2)} <span className="text-2xl text-fog">km</span>
          </div>
          <div className="label mt-1">{s.demo ? "Simulated GPS route" : "GPS route"}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { icon: Timer, label: "Time", v: fmtClock(activeSec) },
            { icon: Gauge, label: "Avg pace", v: km > 0.03 ? `${fmtPace(activeSec / km)}/km` : "–" },
            { icon: Flame, label: "Energy", v: `${kcal} kcal` },
          ].map((x) => (
            <div key={x.label} className="card-flat p-3 text-center">
              <x.icon size={14} className="mx-auto text-volt" />
              <div className="display mt-1 text-lg leading-none tnum">{x.v}</div>
              <div className="label mt-1">{x.label}</div>
            </div>
          ))}
        </div>

        {s.splits.length > 0 && (
          <div className="mt-4">
            <div className="label px-1">Splits · per km</div>
            <div className="mt-1.5 space-y-1">
              {s.splits.map((sp) => (
                <div key={sp.km} className="flex items-center justify-between rounded-lg bg-white/3 px-3 py-2">
                  <span className="font-mono text-[10px] uppercase text-fog">km {sp.km}</span>
                  <span className="font-mono text-xs font-bold text-volt tnum">{fmtPace(sp.sec)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2.5">
          <button
            onClick={() => s.reset()}
            className="grid h-13 w-13 place-items-center rounded-2xl border hairline bg-white/4 p-3.5 text-fog active:scale-95"
            aria-label="Discard"
          >
            <X size={17} />
          </button>
          <button
            onClick={() => {
              addRun({
                id: uid(),
                startedAt: s.startedAt,
                endedAt: Date.now(),
                points: s.points,
                distanceKm: km,
                durationSec: Math.round(activeSec),
                splits: s.splits,
                kcal,
                demo: s.demo || undefined,
              });
              s.reset();
            }}
            className="btn-volt volt-glow flex flex-1 items-center justify-center gap-2 py-4 text-sm"
          >
            <Footprints size={16} strokeWidth={2.4} />
            Save run
          </button>
        </div>
      </div>
    </div>
  );
}
