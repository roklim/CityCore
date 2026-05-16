import { notFound } from "next/navigation";
import { CityUtilityHome } from "../../components/public-home/city-utility-home";
import { getPublicCitySurfaceData } from "../../lib/public-runtime";

type CityPageProps = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: CityPageProps) {
  const { citySlug } = await params;
  const surface = await getPublicCitySurfaceData(citySlug);

  if (!surface) {
    notFound();
  }

  return <CityUtilityHome surface={surface.city} />;
}
