"use client";

import Link from "next/link";
import clsx from "clsx";
import { useEffect, useState } from "react";

const LINKS: [string, string][] = [
  ["Mechanism", "#mechanism"],
  ["Simulator", "#simulator"],
  ["Architecture", "#architecture"],
  ["On-chain", "#onchain"],
];

/**
 * Over the hero the bar is glass on top of the clip; once the hero is behind
 * you it lands on paper and takes the ink treatment the rest of the page uses.
 */
export function LandingNav() {
  const [onPaper, setOnPaper] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      const heroH = hero?.offsetHeight ?? window.innerHeight;
      // Flip a nav-height early, so the bar is already solid when the first
      // section slides under it.
      setOnPaper(window.scrollY > heroH - 68);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-50 transition-colors duration-300",
        onPaper
          ? "bg-bg/75 backdrop-blur-md border-b border-ink"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-[1180px] mx-auto px-6 md:px-10 lg:px-16 h-[68px] flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex gap-[2px]">
            <div
              className={clsx(
                "w-[10px] h-[10px] border transition-colors duration-300",
                onPaper ? "border-ink" : "border-bg"
              )}
            />
            <div className="w-[10px] h-[10px] bg-chartreuse" />
            <div
              className={clsx(
                "w-[10px] h-[10px] border transition-colors duration-300",
                onPaper ? "border-ink" : "border-bg"
              )}
            />
          </div>
          <span
            className={clsx(
              "font-serif text-[19px] font-black tracking-[-0.5px] leading-none transition-colors duration-300",
              onPaper ? "text-ink" : "text-bg"
            )}
          >
            CredLayer
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-7">
          {LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className={clsx(
                "text-[10px] tracking-[2px] uppercase font-mono transition-colors duration-300",
                onPaper ? "text-ink-muted hover:text-ink" : "text-bg/85 hover:text-bg"
              )}
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="#simulator"
            className={clsx(
              "hidden sm:block whitespace-nowrap px-5 py-[10px] text-[9px] tracking-[2px] uppercase font-mono font-semibold border-2 transition-all duration-300",
              onPaper
                ? "border-ink text-ink hover:bg-chartreuse"
                : "border-bg/50 text-bg hover:bg-bg hover:text-ink"
            )}
          >
            Try the risk engine
          </a>
          <Link
            href="/dashboard"
            className={clsx(
              "whitespace-nowrap px-4 sm:px-5 py-[10px] text-[9px] tracking-[2px] uppercase font-mono font-semibold border-2 transition-all duration-300",
              onPaper
                ? "border-ink bg-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse"
                : "border-bg bg-bg text-ink hover:bg-chartreuse hover:border-chartreuse"
            )}
          >
            <span className="sm:hidden">Explore →</span>
            <span className="hidden sm:inline">Explore the app →</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
