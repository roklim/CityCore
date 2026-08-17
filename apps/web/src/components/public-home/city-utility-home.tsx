import Link from "next/link";
import type { PublicCitySurfaceData } from "../../lib/public-runtime";
import { PublicShell } from "../public-shell";
import { CityBusinessDirectory } from "./city-business-directory";
import {
  demoVisualLabel,
  getDemoBusinessVisual,
  getDemoCityVisuals,
} from "./city-demo-visuals";
import styles from "./city-showcase.module.css";

export function CityUtilityHome({ surface }: { surface: PublicCitySurfaceData }) {
  const { city, degraded, live } = surface;
  const activityLabel = city.businessCount === 1 ? "attività pubblicata" : "attività pubblicate";
  const heroDescription =
    city.publicHeroDescription ??
    "Scopri attività, servizi e luoghi utili da una pagina pensata per orientarti subito.";
  const heroTitle = city.publicHeroTitle?.trim() || `Scopri ${city.name}, a modo tuo.`;
  const locationLabel = [city.region, city.country].filter(Boolean).join(" · ");
  const cityVisuals = getDemoCityVisuals(city.slug);
  const featuredBusinesses = city.businesses.slice(0, 3);

  const editorialCards = [
    {
      label: "Muoversi e scoprire",
      title: "Centro e quartieri",
      description:
        "Parti dalla rete locale: attività, servizi e punti di riferimento raccolti in un unico spazio.",
      visual: cityVisuals[1],
    },
    {
      label: "Vivere il territorio",
      title: "Natura e tempo libero",
      description:
        "Una lettura più visiva della città, pensata per affiancare la directory senza trasformarla in un elenco freddo.",
      visual: cityVisuals[2],
    },
    {
      label: "Esperienze locali",
      title: "Sapori e attività",
      description:
        "Dalla ristorazione ai servizi di prossimità: le schede pubblicate restano il punto di accesso alle informazioni reali.",
      visual: featuredBusinesses[0]
        ? getDemoBusinessVisual(featuredBusinesses[0])
        : cityVisuals[0],
    },
  ];

  return (
    <PublicShell
      toneLabel={live ? locationLabel || "Guida locale" : "Anteprima directory"}
      title={heroTitle}
      description={heroDescription}
      contextLabel="Directory"
      contextHref={`/${city.slug}`}
      accentNote={live ? `${city.businessCount} ${activityLabel} nella directory` : undefined}
      breadcrumbs={[{ label: "Home", href: "/" }, { label: city.name }]}
      heroClassName="public-city-hero"
      heroActions={
        <nav className="cta-row" aria-label="Azioni principali della città">
          <Link className="cta-button" href={`/${city.slug}#directory`}>
            Esplora le attività
          </Link>
          <Link className="text-link" href="/#citycore-city-search">
            Cambia città
          </Link>
        </nav>
      }
      heroAside={
        <div className={styles.heroVisual} aria-label="Racconto visivo dimostrativo della città">
          <div
            className={styles.heroPrimary}
            role="img"
            aria-label="Immagine dimostrativa di un borgo italiano e del suo territorio"
            style={{ backgroundImage: `url("${cityVisuals[0]}")` }}
          >
            <span className={styles.demoBadge}>{demoVisualLabel}</span>
            <div className={styles.heroCaption}>
              <strong>{locationLabel || "Territorio locale"}</strong>
              <span>Visual editoriale di supporto: non rappresenta necessariamente un luogo specifico.</span>
            </div>
          </div>
          <div className={styles.heroSecondaryStack}>
            <div
              className={styles.heroSecondary}
              role="img"
              aria-label="Immagine dimostrativa di una strada del centro"
              style={{ backgroundImage: `url("${cityVisuals[1]}")` }}
            >
              <span className={styles.demoBadge}>{demoVisualLabel}</span>
            </div>
            <div
              className={styles.heroSecondary}
              role="img"
              aria-label="Immagine dimostrativa di un paesaggio urbano e naturale"
              style={{ backgroundImage: `url("${cityVisuals[2]}")` }}
            >
              <span className={styles.demoBadge}>{demoVisualLabel}</span>
            </div>
          </div>
        </div>
      }
    >
      <div className={styles.cityContent}>
        <section aria-labelledby="city-editorial-title">
          <div className={styles.sectionHeading}>
            <div>
              <p>Esplora il territorio</p>
              <h2 id="city-editorial-title">Più di una semplice directory</h2>
            </div>
            <p>
              La pagina città introduce il contesto e poi porta alle informazioni operative. Le
              immagini sono volutamente dimostrative; attività, categorie e dati della directory
              restano invece quelli pubblicati sulla piattaforma.
            </p>
          </div>

          <div className={styles.editorialGrid}>
            {editorialCards.map((card) => (
              <article className={styles.editorialCard} key={card.title}>
                <div
                  className={styles.editorialVisual}
                  role="img"
                  aria-label={`${demoVisualLabel}: ${card.title}`}
                  style={{ backgroundImage: `url("${card.visual}")` }}
                >
                  <span className={styles.demoBadge}>{demoVisualLabel}</span>
                </div>
                <div className={styles.editorialCopy}>
                  <span>{card.label}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {featuredBusinesses.length ? (
          <section aria-labelledby="city-featured-title">
            <div className={styles.sectionHeading}>
              <div>
                <p>In evidenza</p>
                <h2 id="city-featured-title">Attività da cui iniziare</h2>
              </div>
              <p>
                Una selezione compatta delle schede già pubblicate. Nessuna distanza inventata:
                mostriamo solo informazioni disponibili e rimandiamo alla scheda completa.
              </p>
            </div>

            <div className={styles.featuredGrid}>
              {featuredBusinesses.map((business, index) => {
                const categoryLabel =
                  business.categories.map((category) => category.name).join(" · ") ||
                  business.categoryLabel ||
                  "Attività locale";

                return (
                  <article className={styles.featuredCard} key={business.slug}>
                    <div
                      className={styles.featuredVisual}
                      role="img"
                      aria-label={`${demoVisualLabel} per ${business.name}`}
                      style={{ backgroundImage: `url("${getDemoBusinessVisual(business, index)}")` }}
                    >
                      <span className={styles.demoBadge}>{demoVisualLabel}</span>
                    </div>
                    <div className={styles.featuredCopy}>
                      <span className={styles.featuredEyebrow}>{categoryLabel}</span>
                      <h3>{business.name}</h3>
                      <p>{business.summary}</p>
                      {business.services.length ? (
                        <ul className={styles.featuredServices} aria-label="Servizi in evidenza">
                          {business.services.slice(0, 3).map((service) => (
                            <li key={service}>{service}</li>
                          ))}
                        </ul>
                      ) : null}
                      <Link className={styles.featuredLink} href={business.href}>
                        Apri la scheda <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="public-city-continuation" aria-label="Directory delle attività">
          <CityBusinessDirectory
            businesses={city.businesses}
            cityName={city.name}
            degraded={degraded}
          />
        </section>
      </div>
    </PublicShell>
  );
}
