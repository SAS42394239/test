import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { RunPoint } from "./types";

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const round = (n: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/* ---------- dates ---------- */

export const isoDate = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const fmtDayShort = (iso: string) => {
  const d = parseISO(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const fmtDayFull = (iso: string) => {
  const d = parseISO(iso);
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`;
};

export const fmtDateShort = (iso: string) => {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const timeAgo = (t: number) => {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
};

/* ---------- numbers / training ---------- */

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");

export const fmtClock = (totalSec: number, alwaysHours = false) => {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0 || alwaysHours)
    return `${h}:${`${m}`.padStart(2, "0")}:${`${sec}`.padStart(2, "0")}`;
  return `${m}:${`${sec}`.padStart(2, "0")}`;
};

/** seconds per km -> "5:32" */
export const fmtPace = (secPerKm: number) => {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "–:––";
  const m = Math.floor(secPerKm / 60);
  const s = Math.floor(secPerKm % 60);
  return `${m}:${`${s}`.padStart(2, "0")}`;
};

/* ---------- geo ---------- */

export const haversineM = (a: RunPoint, b: RunPoint) => {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

/** cumulative distance in metres from a point list */
export const pathDistanceM = (pts: RunPoint[]) => {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversineM(pts[i - 1], pts[i]);
  return d;
};

export const estRunKcal = (km: number, weightKg: number) =>
  Math.round(km * weightKg * 1.036);

export const vibrate = (ms = 40) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* noop */
  }
};

export const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
};
