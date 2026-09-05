import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { marketingShareMetadata } from "@/lib/domain/marketing-share-metadata";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const marketing = marketingShareMetadata();

export const metadata: Metadata = {
  ...marketing,
  metadataBase: new URL(siteUrl()),
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
        {children}
      </body>
    </html>
  );
}
