import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { createCssVariables } from "@platform/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CityCore",
    template: "%s | CityCore",
  },
  description:
    "CityCore e la piattaforma cittadina che unisce attivita locali, utenti e operativita semplice da mobile.",
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
