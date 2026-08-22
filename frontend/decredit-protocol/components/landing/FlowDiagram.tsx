/**
 * The signed-approval handshake — the mechanism that makes an
 * under-collateralized loan safe on-chain.
 *
 * Rendered as inline SVG so it scales crisply and needs no runtime library.
 * Text sizes are deliberately generous: this is the diagram a reviewer will
 * screenshot.
 */
export function FlowDiagram() {
  return (
    <div className="border border-ink bg-bg/75 overflow-x-auto">
      <svg
        viewBox="0 0 900 420"
        className="w-full min-w-[720px] h-auto block"
        role="img"
        aria-label="Sequence: the borrower requests terms from the off-chain risk engine, which returns an ECDSA-signed approval; the borrower submits that signature to the LendingPool, which verifies it on-chain before releasing funds."
      >
        <defs>
          <marker
            id="cl-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#1A1915" />
          </marker>
          <pattern id="cl-hatch" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0,6 l6,-6" stroke="#C8C4BB" strokeWidth="1" />
          </pattern>
        </defs>

        {/* ── Lanes ── */}
        {[
          { x: 20, w: 200, title: "BORROWER", sub: "Wallet / dApp" },
          { x: 250, w: 340, title: "RISK ENGINE", sub: "Spring Boot · off-chain" },
          { x: 620, w: 260, title: "LENDING POOL", sub: "Solidity · on-chain" },
        ].map((l) => (
          <g key={l.title}>
            <rect
              x={l.x}
              y={20}
              width={l.w}
              height={380}
              fill="none"
              stroke="#C8C4BB"
              strokeWidth="1"
            />
            <rect x={l.x} y={20} width={l.w} height={40} fill="#1A1915" />
            <text
              x={l.x + 14}
              y={40}
              fill="#F2EFE8"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize="12"
              fontWeight="700"
              letterSpacing="2"
            >
              {l.title}
            </text>
            <text
              x={l.x + 14}
              y={53}
              fill="#A8A49C"
              fontFamily="'IBM Plex Mono', monospace"
              fontSize="9"
              letterSpacing="1"
            >
              {l.sub}
            </text>
          </g>
        ))}

        {/* ── Step 1: request terms ── */}
        <line x1="120" y1="105" x2="250" y2="105" stroke="#1A1915" strokeWidth="1.5" markerEnd="url(#cl-arrow)" />
        <text x="128" y="98" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#1A1915" fontWeight="600">
          1. request terms
        </text>

        {/* ── Risk engine internals ── */}
        <rect x="266" y="80" width="308" height="120" fill="#E8E4DB" stroke="#1A1915" strokeWidth="1" />
        <text x="278" y="100" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700" fill="#1A1915" letterSpacing="1">
          SCORE → BAND → TERMS
        </text>
        {[
          "reads repayment history from Postgres",
          "assigns band via CreditRegistry thresholds",
          "derives LTV, rate and loan ceiling",
          "rounds collateral UP to clear the on-chain check",
        ].map((t, i) => (
          <text
            key={t}
            x="278"
            y={120 + i * 18}
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="9.5"
            fill="#5C5A54"
          >
            · {t}
          </text>
        ))}

        {/* ── The signature ── */}
        <rect x="266" y="216" width="308" height="76" fill="#C6F135" stroke="#1A1915" strokeWidth="2" />
        <text x="278" y="238" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="700" fill="#1A1915" letterSpacing="1.5">
          2. ECDSA SIGN
        </text>
        <text x="278" y="256" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#1A1915">
          keccak256(borrower, amount, duration,
        </text>
        <text x="278" y="270" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#1A1915">
          collateral, deadline)
        </text>
        <text x="278" y="285" fontFamily="'IBM Plex Mono', monospace" fontSize="8.5" fill="#4A5E00">
          signed by the oracle key — never leaves the server
        </text>

        {/* ── Step 3: signature returned ── */}
        <line x1="250" y1="330" x2="120" y2="330" stroke="#1A1915" strokeWidth="1.5" markerEnd="url(#cl-arrow)" />
        <text x="128" y="323" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#1A1915" fontWeight="600">
          3. signed approval
        </text>

        {/* ── Step 4: submit on-chain ── */}
        <line x1="590" y1="105" x2="620" y2="105" stroke="#1A1915" strokeWidth="1.5" markerEnd="url(#cl-arrow)" />
        <text x="470" y="98" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fill="#1A1915" fontWeight="600">
          4. borrow(sig)
        </text>

        {/* Borrower → pool routing line (down the borrower lane and across) */}
        <path
          d="M 120 340 L 120 380 L 750 380 L 750 340"
          fill="none"
            stroke="#1A1915"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#cl-arrow)"
        />
        <text x="330" y="374" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#5C5A54">
          borrower relays the signature — the engine never touches their funds
        </text>

        {/* ── On-chain verification ── */}
        <rect x="636" y="80" width="228" height="150" fill="url(#cl-hatch)" stroke="#1A1915" strokeWidth="1" />
        <rect x="636" y="80" width="228" height="26" fill="#1A1915" />
        <text x="648" y="98" fontFamily="'IBM Plex Mono', monospace" fontSize="10" fontWeight="700" fill="#C6F135" letterSpacing="1.5">
          5. VERIFY ON-CHAIN
        </text>
        {[
          "recover signer == approvalSigner",
          "usedApprovals[hash] == false",
          "block.timestamp <= deadline",
          "msg.sender == signed borrower",
          "collateral >= band requirement",
        ].map((t, i) => (
          <text
            key={t}
            x="648"
            y={124 + i * 19}
            fontFamily="'IBM Plex Mono', monospace"
            fontSize="9.5"
            fill="#1A1915"
          >
            ✓ {t}
          </text>
        ))}

        {/* ── Disbursement ── */}
        <rect x="636" y="246" width="228" height="60" fill="#1B4332" stroke="#1A1915" strokeWidth="2" />
        <text x="648" y="268" fontFamily="'IBM Plex Mono', monospace" fontSize="11" fontWeight="700" fill="#C6F135" letterSpacing="1.5">
          6. FUNDS RELEASED
        </text>
        <text x="648" y="286" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#F2EFE8">
          collateral locked · LoanCreated emitted
        </text>

        {/* ── Feedback loop ── */}
        <path
          d="M 750 310 L 750 330 L 600 330"
          fill="none"
          stroke="#B45309"
          strokeWidth="1.5"
          markerEnd="url(#cl-arrow)"
        />
        <text x="600" y="324" textAnchor="end" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#B45309" fontWeight="600">
          events → listener → score updated
        </text>
      </svg>
    </div>
  );
}
