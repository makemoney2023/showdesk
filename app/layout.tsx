import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { RoleShell } from "@/components/layout/RoleShell";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Show Desk",
  description:
    "Ringside critique capture, secretary review, and ADRK-aligned PDF delivery for Sieger shows.",
  applicationName: "Show Desk",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Show Desk",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1612",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <RoleShell>{children}</RoleShell>
      </body>
    </html>
  );
}
