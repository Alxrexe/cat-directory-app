import type { ReactNode } from "react";
import { CatMark } from "../brand/cat-mark";

export function ScreenMessage({
  label,
  title,
  children,
  actions,
  role,
}: {
  label: string;
  title: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  role?: "alert";
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div role={role} className="pearl squircle flex w-full max-w-xl flex-col items-center gap-5 rounded-[40px] px-6 py-10 text-center sm:px-10">
        <CatMark className="size-20" />
        <p className="hud text-slate">{label}</p>
        <h1 className="font-display text-[clamp(1.9rem,6vw,2.8rem)] leading-tight font-semibold text-ink">{title}</h1>
        <div className="max-w-prose text-ink-soft">{children}</div>
        <div className="flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </div>
  );
}
