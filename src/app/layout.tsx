import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Every page depends on the signed-in user; never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "HeadsApp: know when your stack gets hacked", template: "%s · HeadsApp" },
  description: "HeadsApp watches security news 24/7 and sends you a WhatsApp message when something hits a tool you use.",
  metadataBase: new URL(process.env.APP_BASE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
