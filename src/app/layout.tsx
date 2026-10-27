import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { site } from "@/content/story";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

function deploymentUrl(): URL {
  const host = process.env.VERCEL_URL;
  if (host) return new URL(`https://${host}`);
  return new URL("http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: deploymentUrl(),
  applicationName: site.name,
  title: site.name,
  description: site.description,
  openGraph: {
    title: site.name,
    description: site.description,
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: "#06101c",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${instrument.variable}`}>
      <body className="bg-navy font-sans text-paper antialiased">{children}</body>
    </html>
  );
}
