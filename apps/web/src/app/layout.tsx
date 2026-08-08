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
    "CityCore è la piattaforma city-first che connette attività locali, persone e operatività semplici da mobile.",
};

const rootVariables = createCssVariables() as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="it">
      <body className="app-body" style={rootVariables}>
        <a className="skip-link" href="#main-content">
          Vai al contenuto principale
        </a>
        {children}
      </body>
    </html>
  );
}
