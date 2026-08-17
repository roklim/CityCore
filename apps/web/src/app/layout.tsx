import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { createCssVariables } from "@platform/ui";
import { resolvePublicSiteUrl } from "../lib/public-links";
import "./globals.css";
import "./premium.css";

const metadataBase = resolvePublicSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NODE_ENV,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
);

export const metadata: Metadata = {
  ...(metadataBase ? { metadataBase } : {}),
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
