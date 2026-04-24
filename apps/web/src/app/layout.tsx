import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { createCssVariables } from "@platform/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Platform V2",
    template: "%s | Platform V2",
  },
  description:
    "Foundation professionale del nuovo marketplace multi-citta e multi-modulo.",
};

const rootVariables = createCssVariables() as CSSProperties;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="app-body" style={rootVariables}>
        {children}
      </body>
    </html>
  );
}
