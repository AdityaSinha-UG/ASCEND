import type { Metadata } from "next";
import "@/styles/globals.css";
import { GameProvider } from "@/store/gameContext";
import { AscendAtmosphereBackground } from "@/components/layout/AscendAtmosphereBackground";

export const metadata: Metadata = {
  title: {
    template: "%s | ASCEND",
    default: "ASCEND — AI-Powered Life RPG",
  },
  description:
    "Transform your real-life goals into an adaptive RPG progression system.",
  icons: {
    icon: "/logo/ascend-logo.png",
    apple: "/logo/ascend-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--color-bg-base)] text-[var(--color-text-primary)] antialiased min-h-dvh flex flex-col relative">
        <AscendAtmosphereBackground />
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
