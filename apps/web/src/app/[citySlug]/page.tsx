import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityUtilityHome } from "../../components/public-home/city-utility-home";
import { getPublicCitySurfaceData } from "../../lib/public-runtime";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { citySlug } = await params;
  const surface = await getPublicCitySurfaceData(citySlug);

  if (!surface) {
    return { title: "Città non trovata", robots: { index: false, follow: false } };
  }

  if (surface.degraded) {
    const canonical = `/${encodeURIComponent(citySlug)}`;
    const title = "Directory cittadina temporaneamente non disponibile";
    const description = "I dati pubblici della città non sono disponibili in questo momento.";

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { type: "website", locale: "it_IT", title, description, url: canonical },
      robots: { index: false, follow: false },
    };
  }

  const { city } = surface;
  const title = `Attività e servizi a ${city.name}`;
  const description =
    city.publicHeroDescription ??
    `Esplora le attività pubblicate a ${city.name}, consulta servizi e orari e contattale direttamente.`;
  const canonical = `/${encodeURIComponent(city.slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "it_IT", title, description, url: canonical },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const surface = await getPublicCitySurfaceData(citySlug);

  if (!surface) {
    notFound();
  }

  return <CityUtilityHome surface={surface} />;
}
