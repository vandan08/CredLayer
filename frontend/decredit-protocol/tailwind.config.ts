import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F2EFE8",
        surface: "#E8E4DB",
        "surface-2": "#DDD9CF",
        ink: "#1A1915",
        "ink-muted": "#5C5A54",
        "ink-faint": "#A8A49C",
        border: "#C8C4BB",
        green: "#1B4332",
        amber: "#B45309",
        crimson: "#9B1C1C",
        chartreuse: "#C6F135",
      },
      fontFamily: {
        serif: ["'Playfair Display'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      fontSize: {
        "2xs": "0.625rem",
      },
    },
  },
  plugins: [],
};
export default config;
