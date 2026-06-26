import { BottomNav } from "@/components/ui/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface flex min-h-dvh flex-col text-ink">
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  );
}
