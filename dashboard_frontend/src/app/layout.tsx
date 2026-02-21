import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { AIPanel } from "@/components/AIPanel";
import { AuthWrapper } from "@/components/AuthWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flash Tip Analytics Dashboard",
  description: "A Solana-native creator tipping platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen w-full flex overflow-hidden`}
      >
        <AuthWrapper>
          <Sidebar />

          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto hide-scrollbar p-6">
              {children}
            </main>
          </div>

          <AIPanel />
        </AuthWrapper>
      </body>
    </html>
  );
}
