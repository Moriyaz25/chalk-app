import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { AppLockGuard } from "@/components/AppLockGuard";

export const metadata: Metadata = {
  title: "Chalk — handwritten messages for your people",
  description:
    "Send handwritten chalk messages to the people you care about. No typing — just draw.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chalk",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c2620",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("chalk-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme =
      stored === "dark" || (stored !== "light" && prefersDark) ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-paper text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>
          <ServiceWorkerRegister />
          <AppLockGuard>{children}</AppLockGuard>
        </ThemeProvider>
      </body>
    </html>
  );
}
