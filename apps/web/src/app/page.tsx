import { GlobalEntryHome } from "../components/public-home/global-entry-home";
import { getHomepageSurfaceData } from "../lib/public-runtime";

export default async function HomePage() {
  const surfaceData = await getHomepageSurfaceData();

  return <GlobalEntryHome cities={surfaceData.featuredCities} degraded={surfaceData.degraded} />;
}
