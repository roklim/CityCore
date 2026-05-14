import {
  BusinessCallout,
  buildHomepageViewModel,
  CapabilityStrip,
  CityPortalGrid,
  FeaturedBusinessGrid,
  GatewayHero,
  PublicFooter,
  PublicHeader,
} from "../components/public-home";
import { getHomepageSurfaceData } from "../lib/public-runtime";
import styles from "../components/public-home/public-home.module.css";

export default async function HomePage() {
  const surfaceData = await getHomepageSurfaceData();
  const viewModel = buildHomepageViewModel(surfaceData);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <PublicHeader chooserLabel={viewModel.chooserLabel} />

        <main className={styles.main}>
          <GatewayHero
            copy={viewModel.hero}
            trustPoints={viewModel.heroTrustPoints}
            insights={viewModel.heroInsights}
          />

          {viewModel.degraded ? (
            <div className={styles.statusBanner}>
              <p>{viewModel.degradedMessage}</p>
            </div>
          ) : null}

          <CityPortalGrid copy={viewModel.citySection} portals={viewModel.cityPortals} />
          <CapabilityStrip
            capabilities={viewModel.capabilities}
            copy={viewModel.capabilitySection}
          />
          <FeaturedBusinessGrid
            businesses={viewModel.featuredBusinesses}
            copy={viewModel.businessSection}
          />
          <BusinessCallout copy={viewModel.callout} />
        </main>

        <PublicFooter copy={viewModel.footerContent} sections={viewModel.footerSections} />
      </div>
    </div>
  );
}
