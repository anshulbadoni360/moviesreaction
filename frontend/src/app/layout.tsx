import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { AnalysisProvider } from "@/context/AnalysisContext";
import { AnalysisProgressToast } from "@/components/ui/AnalysisProgressToast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monet Labs — Video Intelligence Platform",
  description: "Editorial Precision Video Performance & Audience Response Intelligence",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-bg text-text-primary min-h-screen flex flex-col antialiased">
        <AnalysisProvider>
          <Navbar />
          <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8">
            {children}
          </main>
          <AnalysisProgressToast />
        </AnalysisProvider>
      </body>
    </html>
  );
}
