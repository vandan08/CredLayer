## 🎨 Phase 3 Design Brief — *DeCredit Protocol*

### **Conceptual Direction: "Industrial Credit Bureau"**

Think less *crypto startup* and more *a Bloomberg terminal crossed with a Soviet-era data archive* — brutal, data-dense, authoritative. It says *"this is serious financial infrastructure"*, not *"another Web3 project"*. Users should feel like they're operating a real credit institution, not connecting a wallet to a pretty dashboard.

---

### **Typography**

Pair two fonts that nobody expects in DeFi:

- **Display / Headers:** `DM Serif Display` or `Playfair Display` — serif, editorial, like a financial newspaper masthead. This immediately breaks from the sans-serif monoculture of Web3.
- **Body / Data:** `IBM Plex Mono` — monospaced, dense, reads like terminal output. Every number, address, percentage feels like it means something.

Use **small caps** for labels (`RISK BAND`, `COLLATERAL RATIO`, `SCORE`). Never use rounded corners on data labels — sharp edges only.

---

### **Color Palette**

Ditch every gradient. Go flat and editorial:

| Role | Color | Hex |
|---|---|---|
| Background | Off-white newsprint | `#F2EFE8` |
| Surface | Warm cream | `#E8E4DB` |
| Primary Ink | Near-black | `#1A1915` |
| Accent (Band A) | British Racing Green | `#1B4332` |
| Accent (Band B) | Amber Warning | `#B45309` |
| Accent (Band C/D) | Brick Red | `#9B1C1C` |
| Data Highlight | Electric Chartreuse | `#C6F135` |

Yes — **light mode**. A warm newsprint light mode in a sea of dark DeFi dashboards is instantly memorable. Use the chartreuse exclusively for the most critical live data point on any given screen (like your score number or pool utilization). Everything else stays in the muted palette.

---

### **Layout Philosophy: "The Credit Report"**

Structure every page like it's a **printed financial report** — not a dashboard. This means:

- **No card grid layouts.** Use horizontal rules (`<hr>`), section dividers with large numerals (`01 —`, `02 —`), and margin annotations (small labels floating left of the main content column).
- **Asymmetric columns**: 60/40 or 70/30 splits. Main data lives in the wider column; metadata, labels, and secondary info live in the narrow column.
- **Oversized score display**: The credit score should dominate the borrower dashboard — literally `180px` font size, anchored to the top-left. Surrounding data orbits it.
- **No rounded buttons.** Sharp rectangular buttons with a 2px solid border. Hover state = background inverts (fill with ink color, text goes white). That's it.

---

### **Unique UI Components**

**1. Risk Band Indicator — Ticker Tape Style**
Instead of a badge, show the risk band as a scrolling horizontal ticker at the top of the borrower card:
`BAND A ——— LTV 40% ——— RATE 5.00% ——— BAND A ——— LTV 40%` scrolling slowly left-to-right. Green text on black bar.

**2. Score Gauge — Analog Meter, Not a Circle**
Avoid the circular progress ring everyone uses. Build a **horizontal bar that looks like a VU meter** — divided into segments that light up from left to right. Segments are rectangular blocks with thin gaps. Each band zone is labeled underneath (D / C / B / A). The filled segments use the chartreuse accent on dark background.

**3. Loan History — Ledger Table**
Style the repayment history as a **double-entry ledger**: two columns (Debit / Credit), alternating faint row shading, timestamp in the margin, loan IDs in mono font. Use a thin top + bottom border on the table (no vertical lines except one center divider).

**4. Pool Health — Spark Lines, Not Pie Charts**
Replace pie/donut charts with **brutalist sparklines** — thin 1px lines on a grid of faint dots. Label values directly on the line at start and end points. No legend, no tooltips with rounded boxes. If you need a tooltip, show it as a simple text callout like a newspaper footnote.

**5. Governance Page — Meeting Minutes Aesthetic**
Format proposals as **typewritten meeting minutes**: proposal title as a bold serif headline, description in body text, vote counts displayed as a fraction (`1,204 / 2,000 votes`). The vote button is a large bordered rectangle that says `VOTE YEA` or `VOTE NAY`. Progress bar for votes is just a plain horizontal line with a filled portion — no gradient, no animation beyond the fill extending.

---

### **Micro-interactions (Restrained, Purposeful)**

- Page transitions: **instant cut** with a single-frame flash of the accent color (like a camera shutter). No fade, no slide.
- Score update animation: digits **roll up like a mechanical counter** (CSS `transform: translateY` on individual digit spans), not a number count-up.
- Button press: a **2px inset box-shadow** appears on mousedown — like physically pressing a physical key.
- Data loading: instead of a spinner, show a blinking cursor (`_`) next to the loading label. `FETCHING SCORE _`

---

### **Navigation**

Vertical left-side nav, but **not a sidebar with icons**. Just a list of plain serif labels stacked with generous line height, the active one underlined with a 3px chartreuse underline. No icons at all. The protocol name sits at the top in a large bold serif, possibly with a simple geometric mark (a square within a square = vault/security iconography).

---

### **What to Avoid**

- No glassmorphism, no blur backgrounds
- No gradient buttons
- No "connect wallet" hero animations
- No floating orbs or particle backgrounds
- No Inter/Roboto/Space Grotesk
- No dark purple or teal as primary palette
- No rounded corners on anything structural
