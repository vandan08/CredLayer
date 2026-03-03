import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Ticker } from "@/components/layout/Ticker";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { Web3Provider } from "@/lib/web3/provider";

export const metadata: Metadata = {
  title: "DeCredit Protocol",
  description: "Decentralized Credit Scoring & Under-Collateralized Lending",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>
          <CustomCursor />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-[220px] flex-1 flex flex-col">
              <Ticker />
              <div className="flex-1">{children}</div>
            </main>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}

