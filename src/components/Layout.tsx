import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Dumbbell, Flower2, Footprints, House, UtensilsCrossed } from "lucide-react";
import { cn, vibrate } from "../lib/utils";
import { useGym } from "../lib/store";

const TABS = [
  { to: "/", label: "Today", icon: House, end: true },
  { to: "/food", label: "Food", icon: UtensilsCrossed },
  { to: "/gym", label: "Gym", icon: Dumbbell },
  { to: "/run", label: "Run", icon: Footprints },
  { to: "/cycle", label: "Cycle", icon: Flower2 },
];

function TabBar() {
  const nav = useNavigate();
  const loc = useLocation();
  const gymActive = useGym((s) => !!s.active);

  return (
    <nav className="relative z-30 shrink-0 border-t border-white/6 bg-panel/90 pb-safe backdrop-blur-xl">
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.end
            ? loc.pathname === t.to
            : loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <button
              key={t.to}
              onClick={() => {
                vibrate(8);
                if (!active) nav(t.to);
              }}
              className="relative flex flex-col items-center gap-1 pb-2.5 pt-3"
            >
              {active && (
                <motion.span
                  layoutId="tabline"
                  className="absolute -top-px h-[3px] w-10 rounded-b-full bg-volt"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <span className="relative">
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={cn(
                    "transition-colors",
                    active ? "text-volt" : "text-ash"
                  )}
                />
                {t.to === "/gym" && gymActive && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-volt blink" />
                )}
              </span>
              <span
                className={cn(
                  "font-mono text-[9px] uppercase tracking-[0.14em] transition-colors",
                  active ? "text-volt" : "text-ash"
                )}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function Layout() {
  const loc = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [loc.pathname]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#040506]">
      {/* desktop ambience */}
      <div className="pointer-events-none fixed inset-0 hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10rem,rgba(215,255,63,0.07),transparent_60%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[26vw] leading-none text-white/[0.02]">
          CORESYNC
        </div>
      </div>

      {/* device shell */}
      <div className="noise relative mx-auto flex h-dvh max-w-[430px] flex-col overflow-hidden border-white/6 bg-ink lg:border-x lg:shadow-[0_0_80px_-20px_rgba(215,255,63,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-ink/90 to-transparent" />
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto no-scrollbar"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        <TabBar />
      </div>
    </div>
  );
}
