import { Sidebar } from "@/components/layout/Sidebar";
import { Ticker } from "@/components/layout/Ticker";

/**
 * Chrome for the authenticated-ish protocol app (dashboard, borrow, lend,
 * history, governance). The marketing landing page at `/` sits outside this
 * group so it can run full-bleed without the sidebar.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="lg:ml-[220px] flex-1 flex flex-col overflow-x-hidden max-w-full lg:max-w-[calc(100vw-220px)]">
        <Ticker />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
