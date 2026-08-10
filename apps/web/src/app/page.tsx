import type { Metadata } from "next";
import { GlobalEntryHome } from "../components/public-home/global-entry-home";
import { getHomepageSurfaceData } from "../lib/public-runtime";

const homeDescription =
  "Scegli una città e trova attività locali, servizi, orari e contatti pubblicati su CityCore.";

export const metadata: Metadata = {
  title: "La tua città, tutto connesso",
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "it_IT",
    title: "CityCore — La tua città, tutto connesso",
    description: homeDescription,
    url: "/",
  },
};

export default async function HomePage() {
  const surfaceData = await getHomepageSurfaceData();

  return <GlobalEntryHome cities={surfaceData.featuredCities} degraded={surfaceData.degraded} />;
}
