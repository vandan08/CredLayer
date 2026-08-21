"use client";

import { useEffect, useRef } from "react";

/**
 * The full-viewport clip that sits behind the whole landing page.
 *
 * The element is fixed rather than as tall as the document: a 1280x720 clip
 * stretched over a page several thousand pixels tall would be unwatchable, so
 * instead it stays pinned to the viewport and the page scrolls over it.
 *
 * Its weight changes in two phases:
 *
 *   1. Across the hero the clip is the subject — full strength, no paper wash,
 *      with only the hero's own gradient scrims holding the copy legible.
 *   2. Once the hero scrolls away the page becomes a document: the clip drops
 *      back to a whisper and the cream ground fades in over it, then the clip
 *      climbs again toward the footer.
 */

const DOC_MIN_OPACITY = 0.1;
const DOC_MAX_OPACITY = 0.52;

export function VideoBackdrop({ src = "/CredLayer.mp4" }: { src?: string }) {
  const layerRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const wash = washRef.current;
    if (!layer || !wash) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let detach: (() => void) | undefined;

    const apply = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;

      // Measured rather than assumed: the hero is 100svh, which is not
      // innerHeight once a mobile URL bar is in play.
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      const heroH = hero?.offsetHeight ?? window.innerHeight;

      // Phase 1 — leaving the hero. The clip recedes, the paper arrives.
      const exit = Math.min(1, Math.max(0, y / Math.max(1, heroH)));
      wash.style.opacity = String(exit);

      if (exit < 1) {
        layer.style.opacity = String(1 - (1 - DOC_MIN_OPACITY) * exit);
        return;
      }

      // Phase 2 — the document. Ease-out so the clip becomes readable partway
      // down rather than only in the last screenful.
      const runway = scrollable - heroH;
      const progress = runway > 0 ? Math.min(1, Math.max(0, (y - heroH) / runway)) : 0;
      const eased = 1 - Math.pow(1 - progress, 2);
      layer.style.opacity = String(
        DOC_MIN_OPACITY + (DOC_MAX_OPACITY - DOC_MIN_OPACITY) * eased
      );
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const setup = () => {
      detach?.();
      const video = videoRef.current;

      if (motion.matches) {
        // Reduced motion: a still frame, held at the quiet document weight.
        video?.pause();
        layer.style.opacity = String(DOC_MIN_OPACITY);
        wash.style.opacity = "1";
        detach = undefined;
        return;
      }

      video?.play().catch(() => {
        // Autoplay can still be refused (low power mode, strict settings).
        // The poster frame remains, which is a fine backdrop on its own.
      });

      apply();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      detach = () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    };

    setup();
    motion.addEventListener("change", setup);

    return () => {
      motion.removeEventListener("change", setup);
      detach?.();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div ref={layerRef} className="absolute inset-0" style={{ opacity: 1 }}>
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          tabIndex={-1}
        />
      </div>

      {/* The cream ground, absent under the hero and full once the page turns
          into a document — so the palette holds wherever there is reading. */}
      <div ref={washRef} className="absolute inset-0 bg-bg/20" style={{ opacity: 0 }} />
    </div>
  );
}
