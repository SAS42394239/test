import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useSpring,
  useTransform,
} from "framer-motion";
import { X } from "lucide-react";
import { cn, fmtInt } from "../lib/utils";

/* ------------------------------------------------------------------ */

export function CountUp({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 22 });
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);
  const text = useTransform(spring, (v) => fmtInt(v));
  return <motion.span className={cn("tnum", className)}>{text}</motion.span>;
}

/* ------------------------------------------------------------------ */

export function Ring({
  size = 200,
  stroke = 13,
  progress,
  children,
  className,
  danger = false,
}: {
  size?: number;
  stroke?: number;
  progress: number; // 0..1+
  children?: ReactNode;
  className?: string;
  danger?: boolean;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = (size - stroke) / 2;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={danger ? "#ff5964" : "#eaffb0"} />
            <stop offset="100%" stopColor={danger ? "#ff5964" : "#d7ff3f"} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          initial={{ strokeDashoffset: 1 }}
          animate={{ strokeDashoffset: 1 - clamped }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
          style={{ filter: danger ? "none" : "drop-shadow(0 0 10px rgba(215,255,63,0.35))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MacroBar({
  label,
  short,
  value,
  goal,
  tone = "volt",
}: {
  label: string;
  short: string;
  value: number;
  goal: number;
  tone?: "volt" | "voltDim" | "bone";
}) {
  const p = goal > 0 ? Math.min(1, value / goal) : 0;
  const bar =
    tone === "volt"
      ? "bg-volt"
      : tone === "voltDim"
        ? "bg-volt/60"
        : "bg-bone/80";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label flex items-center gap-1.5">
          <span className={cn("grid h-4 w-4 place-items-center rounded text-[9px] font-bold text-ink", bar)}>{short}</span>
          {label}
        </span>
        <span className="font-mono text-[11px] text-fog tnum">
          {Math.round(value)}
          <span className="text-ash">/{goal}g</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/6">
        <motion.div
          className={cn("h-full rounded-full", bar)}
          initial={{ width: 0 }}
          animate={{ width: `${p * 100}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 20 }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Sheet({
  onClose,
  title,
  children,
  tall = false,
}: {
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  tall?: boolean;
}) {
  const controls = useDragControls();
  return (
    <>
      <motion.div
        className="absolute inset-0 z-40 bg-black/70 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={cn(
          "absolute inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[26px] border-t border-white/10 bg-panel",
          tall ? "h-[92%]" : "max-h-[92%]"
        )}
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        exit={{ y: "105%" }}
        transition={{ type: "spring", stiffness: 380, damping: 40 }}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 130 || info.velocity.y > 800) onClose();
        }}
      >
        <div
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={(e) => controls.start(e)}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/15" />
          {title !== undefined && (
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <div className="display text-lg tracking-wide">{title}</div>
              <button
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/6 text-fog active:scale-90"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">{children}</div>
      </motion.div>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex rounded-full border hairline bg-white/4 p-1", className)}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors",
              active ? "text-ink" : "text-fog"
            )}
          >
            {active && (
              <motion.span
                layoutId={undefined}
                className="absolute inset-0 rounded-full bg-volt"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Chip({
  active,
  children,
  onClick,
  className,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "chip",
        active
          ? "border-volt/60 bg-volt/15 text-volt"
          : "border-white/10 bg-white/4 text-fog",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export function NumField({
  value,
  onChange,
  suffix,
  className,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        value={value}
        inputMode="decimal"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        className="w-full rounded-xl border hairline bg-white/5 px-3 py-2.5 text-center font-mono text-base font-semibold text-bone placeholder:text-ash focus:border-volt/50"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase text-ash">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function WeekStrip({
  values,
  labels,
  goal,
  highlight,
}: {
  values: number[];
  labels: string[];
  goal?: number;
  highlight?: number;
}) {
  const max = Math.max(1, ...values, goal ?? 0);
  return (
    <div className="flex items-end justify-between gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-end rounded-lg bg-white/4 p-0.5">
            <motion.div
              className={cn(
                "w-full rounded-md",
                i === highlight ? "bg-volt" : "bg-white/20"
              )}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(4, (v / max) * 100)}%` }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 120, damping: 18 }}
            />
          </div>
          <span
            className={cn(
              "font-mono text-[9px] uppercase",
              i === highlight ? "text-volt" : "text-ash"
            )}
          >
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Empty({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-ash">
        {icon}
      </div>
      <div className="display text-base tracking-wide text-bone">{title}</div>
      {body && <p className="max-w-[26ch] text-xs leading-relaxed text-fog">{body}</p>}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export { AnimatePresence, motion };
