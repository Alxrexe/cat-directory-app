"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import SplitType from "split-type";

gsap.registerPlugin(useGSAP);

/**
 * El dato entra palabra a palabra. SplitType parte el texto en nodos que
 * React no conoce, así que:
 *  - el componente se monta con `key={text}` (un dato nuevo, un nodo nuevo);
 *  - el corte se revierte en el cleanup, antes de que React retire el nodo;
 *  - la copia animada va oculta a lectores de pantalla y una copia plana
 *    lleva el texto, para que se lea como frase y no palabra a palabra.
 */
export default function FactText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const split = new SplitType(node, { types: "words" });
      gsap.from(split.words ?? [], {
        yPercent: 55,
        opacity: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.014,
      });
      return () => split.revert();
    },
    { scope: ref },
  );

  return (
    <>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true" className="block">
        {text}
      </span>
    </>
  );
}
