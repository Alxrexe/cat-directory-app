"use client";

import { LoaderCircle, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHydrated } from "../hooks/use-hydrated";
import { cn } from "../lib/cn";
import { EASE, motionArmed, play } from "../lib/motion";
import { useConnectionStore } from "../stores/connection-store";
import { useDiscoveryStore } from "../stores/discovery-store";

// A mano: un Intl.DateTimeFormat en español costaba ~80 ms en móvil al hidratar.
const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const pad = (n: number) => String(n).padStart(2, "0");
const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const formatDate = (d: Date) => `${DAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

/** Tras hidratar (la hora del servidor no es la del visitante), una vez por minuto. */
export function ConsoleClock({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(schedule, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50);
    };
    timer = window.setTimeout(schedule, 60_000 - new Date().getSeconds() * 1000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <span className={cn("flex-col items-end justify-center gap-1 leading-none", className)}>
      <time
        dateTime={hydrated ? now.toISOString() : undefined}
        className="lcd text-[1.2rem] text-ink"
        suppressHydrationWarning
      >
        {hydrated ? formatTime(now) : "--:--"}
      </time>
      <span className="hud text-[0.56rem] text-ink-soft" suppressHydrationWarning>
        {hydrated ? formatDate(now) : "—"}
      </span>
    </span>
  );
}

export function NetworkIndicator({ className }: { className?: string }) {
  const online = useConnectionStore((state) => state.online);
  const retry = useConnectionStore((state) => state.retry);

  const label = !online
    ? "Sin conexión"
    : retry
      ? `Reintentando, intento ${retry.attempt} de ${retry.retries}`
      : "Conectado";

  return (
    <span role="status" aria-live="polite" className={cn("flex items-center gap-2", className)} title={label}>
      {!online ? (
        <WifiOff className="size-[1.15rem] text-danger" aria-hidden="true" />
      ) : retry ? (
        <LoaderCircle className="size-[1.15rem] animate-spin text-accent" aria-hidden="true" />
      ) : (
        <Wifi className="size-[1.15rem] text-slate" aria-hidden="true" />
      )}
      {!online ? (
        <span className="hud text-danger" aria-hidden="true">
          Sin red
        </span>
      ) : retry ? (
        <span className="hud text-ink-soft" aria-hidden="true">
          {retry.attempt}/{retry.retries}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function DiscoveryMeter({ total, className }: { total: number; className?: string }) {
  const hydrated = useHydrated();
  const count = useDiscoveryStore((state) => state.discovered.length);
  const shown = hydrated ? count : 0;
  const ratio = total > 0 ? Math.min(1, shown / total) : 0;
  const numberRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!numberRef.current || shown === 0) return;
    if (motionArmed()) play(numberRef.current, [{ transform: "scale(1.35)" }, { transform: "none" }], { duration: 700, easing: EASE.elastic });
  }, [shown]);

  return (
    <span className={cn("flex items-center gap-2.5", className)} title="Razas que ya abriste en el Ronrón">
      <svg viewBox="0 0 24 24" className="size-6 -rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="var(--ring)" strokeWidth="3" />
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(ratio * 100, shown ? 4 : 0)} 100`}
        />
      </svg>
      <span className="lcd flex items-baseline text-[1.2rem] text-ink">
        <span ref={numberRef} className="inline-block">
          {String(shown).padStart(2, "0")}
        </span>
        <span className="text-ink-soft">/{total || "—"}</span>
      </span>
      <span className="sr-only">razas descubiertas</span>
    </span>
  );
}
