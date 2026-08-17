import type { Metadata } from "next";
import "./globals.css";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Toaster } from "@/components/ui/Toaster";
import { Web3Provider } from "@/lib/web3/provider";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://credlayer.vercel.app";

const DESCRIPTION =
  "CredLayer prices credit, not just collateral. An off-chain risk engine cryptographically co-signs every loan, letting on-chain contracts lend at 40% collateral where pure on-chain protocols demand 150%.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CredLayer — Under-Collateralized Lending, Priced by Reputation",
    template: "%s · CredLayer",
  },
  description: DESCRIPTION,
  keywords: [
    "DeFi", "credit scoring", "under-collateralized lending", "Solidity",
    "Ethereum", "Spring Boot", "Next.js", "smart contracts",
  ],
  authors: [{ name: "Vandan Sheth" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "CredLayer",
    title: "CredLayer — Under-Collateralized Lending, Priced by Reputation",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "CredLayer — Under-Collateralized Lending, Priced by Reputation",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <CustomCursor />
          {children}
          <Toaster />
        </Web3Provider>
      </body>
    </html>
  );
}
