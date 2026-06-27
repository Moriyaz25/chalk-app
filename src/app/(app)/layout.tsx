import { BottomNav } from "@/components/ui/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-surface flex min-h-dvh flex-col text-ink">
      <main className="min-w-0 flex-1">{children}</main>
      <BottomNav />
    </div>
  );
}
