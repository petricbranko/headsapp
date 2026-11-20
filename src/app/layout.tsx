import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Every page depends on the signed-in user; never prerender.
export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", axes: ["opsz"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "HeadsApp: know when your stack gets hacked", template: "%s · HeadsApp" },
  description: "HeadsApp watches security news 24/7 and sends you a Telegram message when something hits a tool you use.",
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
