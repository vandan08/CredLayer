"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      el.style.left = e.clientX - 6 + "px";
      el.style.top = e.clientY - 6 + "px";
    };
    const down = () => el.classList.add("scale-50");
    const up = () => el.classList.remove("scale-50");

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="fixed w-3 h-3 bg-ink pointer-events-none z-[9999] mix-blend-multiply transition-transform duration-100"
      style={{ top: 0, left: 0 }}
    />
  );
}
