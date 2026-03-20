"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cursorRef.current;
    const ring = ringRef.current;
    if (!el || !ring) return;

    let mx = 0, my = 0;
    let rx = 0, ry = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      el.style.left = mx - 4 + "px";
      el.style.top = my - 4 + "px";
    };

    // Smooth trailing ring
    const tick = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      ring.style.left = rx - 16 + "px";
      ring.style.top = ry - 16 + "px";
      requestAnimationFrame(tick);
    };

    const down = () => {
      el.style.transform = "scale(0.5)";
      ring.style.transform = "scale(0.8)";
      ring.style.borderColor = "#C6F135";
    };
    const up = () => {
      el.style.transform = "scale(1)";
      ring.style.transform = "scale(1)";
      ring.style.borderColor = "#1A1915";
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  return (
    <>
      {/* Inner dot — immediate follow */}
      <div
        ref={cursorRef}
        className="fixed w-2 h-2 bg-ink pointer-events-none z-[9999] mix-blend-multiply"
        style={{ top: 0, left: 0, transition: "transform 0.1s" }}
      />
      {/* Outer ring — trailing with lag */}
      <div
        ref={ringRef}
        className="fixed w-8 h-8 border border-ink pointer-events-none z-[9999] mix-blend-multiply"
        style={{ top: 0, left: 0, transition: "transform 0.2s, border-color 0.2s" }}
      />
    </>
  );
}
