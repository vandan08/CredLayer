import { ImageResponse } from "next/og";

/**
 * Social preview card. Rendered at build time by next/og, so it needs no
 * external assets — the whole thing is flat colour and system-safe type.
 */
export const runtime = "edge";
export const alt =
  "CredLayer — under-collateralized lending priced by on-chain reputation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#F2EFE8";
const INK = "#1A1915";
const CHARTREUSE = "#C6F135";
const MUTED = "#5C5A54";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "monospace",
          border: `16px solid ${INK}`,
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", gap: 3 }}>
            <div style={{ width: 18, height: 18, border: `2px solid ${INK}` }} />
            <div style={{ width: 18, height: 18, background: CHARTREUSE }} />
            <div style={{ width: 18, height: 18, border: `2px solid ${INK}` }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: INK, letterSpacing: -1 }}>
            CredLayer
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              color: INK,
              lineHeight: 1.02,
              letterSpacing: -3,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Lending priced by</span>
            <span>reputation, not</span>
            <span>just collateral.</span>
          </div>

          <div style={{ fontSize: 24, color: MUTED, marginTop: 26, lineHeight: 1.5 }}>
            An off-chain risk engine co-signs every loan — so the contract can lend at 40%.
          </div>
        </div>

        {/* Stat strip */}
        <div style={{ display: "flex", gap: 0, borderTop: `3px solid ${INK}`, paddingTop: 26 }}>
          {[
            ["40%", "Best-case collateral"],
            ["128", "Tests passing"],
            ["3", "Deployed layers"],
            ["Solidity · Java · Next.js", "Stack"],
          ].map(([v, k]) => (
            <div
              key={k}
              style={{
                display: "flex",
                flexDirection: "column",
                paddingRight: 52,
                marginRight: 52,
                borderRight: k === "Stack" ? "none" : `2px solid ${INK}`,
              }}
            >
              <div style={{ fontSize: v.length > 8 ? 26 : 46, fontWeight: 700, color: INK }}>
                {v}
              </div>
              <div style={{ fontSize: 17, color: MUTED, marginTop: 8, letterSpacing: 1 }}>
                {k.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
