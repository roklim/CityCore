import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { createCssVariables } from "@platform/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Platform V2",
    template: "%s | Platform V2",
  },
  description: "Foundation professionale del nuovo marketplace multi-citta e multi-modulo.",
};

const rootVariables = createCssVariables() as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it">
      <body className="app-body" style={rootVariables}>
        {children}
      </body>
    </html>
  );
}
