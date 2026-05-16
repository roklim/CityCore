import { GlobalEntryHome } from "../components/public-home/global-entry-home";
import { getHomepageSurfaceData } from "../lib/public-runtime";

export default async function HomePage() {
  const surfaceData = await getHomepageSurfaceData();
  const activeCities = surfaceData.featuredCities.slice(0, 4);

  return <GlobalEntryHome cities={activeCities} />;
}
