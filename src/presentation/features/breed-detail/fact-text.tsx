"use client";

import { useLayoutEffect, useRef } from "react";
import SplitType from "split-type";
import { EASE, playEach } from "../../lib/motion";

/**
 * SplitType parte el texto en nodos que React no conoce: se monta con
 * `key={text}` y el corte se revierte en el cleanup.
 */
export default function FactText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const split = new SplitType(node, { types: "words" });
    const words = playEach(
      split.words ?? [],
      () => [{ transform: "translateY(55%)", opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 550, stagger: 14, easing: EASE.out, fill: "backwards" },
    );
    return () => {
      for (const word of words) word.cancel();
      split.revert();
    };
  }, []);

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" className="block">
        {text}
      </span>
    </>
  );
}
