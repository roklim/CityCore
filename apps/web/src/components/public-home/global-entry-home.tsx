import Link from "next/link";
import type { HomepageCityCard } from "../../lib/public-runtime";
import { PublicSiteHeader } from "../public-shell";
import { CityEntryForm } from "./city-entry-form";
import { demoVisualLabel, getDemoCityVisuals } from "./city-demo-visuals";
import styles from "./context-gateway.module.css";
import showcase from "./global-entry-showcase.module.css";

export function GlobalEntryHome({
  cities,
  degraded,
}: {
  cities: HomepageCityCard[];
  degraded: boolean;
}) {
  const featuredCities = cities.slice(0, 6);
  const visualSeed = featuredCities[0]?.slug ?? "citycore";
  const visuals = getDemoCityVisuals(visualSeed);
  const valueCards = [
    {
      label: "Scopri",
      title: "Attività locali",
      description:
        "Passa dalla città alla singola attività senza perderti in elenchi anonimi o risultati scollegati.",
      visual: visuals[0],
    },
    {
      label: "Organizzati",
      title: "Servizi e orari",
      description:
        "Trova in modo rapido ciò che è realmente pubblicato: servizi, disponibilità e informazioni utili.",
      visual: visuals[1],
    },
    {
      label: "Entra in contatto",
      title: "Un canale diretto",
      description:
        "Quando un'attività abilita i propri contatti, puoi raggiungerla o inviare una richiesta dalla sua scheda.",
      visual: visuals[2],
    },
  ];

  return (
    <div className={`${styles.contextStage} public-home-stage`}>
      <div className={`${styles.globalEntry} public-home-entry`}>
        <div className={`${styles.entryShell} public-home-shell`}>
          <PublicSiteHeader
            className={`${styles.entryHeader} public-home-header`}
            showChangeCity={false}
            showExplore={false}
          />

          <main className={showcase.home} id="main-content" tabIndex={-1}>
            <section className={showcase.hero} aria-labelledby="global-entry-title">
              <div className={showcase.heroCopy}>
                <p className={showcase.kicker}>La città, in un unico posto</p>
                <h1 className={showcase.title} id="global-entry-title">
                  Trova il meglio della tua città<span className={showcase.titleAccent}>.</span>
                </h1>
                <p className={showcase.lead}>
                  Scegli dove sei e passa subito ad attività, servizi, orari e contatti pubblicati
                  nella rete CityCore.
                </p>
                <ul className={showcase.capabilities} aria-label="Informazioni disponibili">
                  <li>Attività locali</li>
                  <li>Servizi e orari</li>
                  <li>Contatto diretto</li>
                </ul>

                <div className={showcase.searchBlock}>
                  {cities.length ? (
                    <CityEntryForm
                      cities={cities.map((city) => ({
                        slug: city.slug,
                        name: city.name,
                        qualifier: city.searchQualifier,
                      }))}
                    />
                  ) : (
                    <p
                      className={`${styles.emptyState} public-home-empty`}
                      id="citycore-city-search"
                      role="status"
                      tabIndex={-1}
                    >
                      Nessuna città è disponibile in questo momento. Torna presto per esplorare le
                      prime directory locali.
                    </p>
                  )}
                  {cities.length ? (
                    <p className={showcase.searchHint}>
                      Scrivi almeno due lettere: i suggerimenti compaiono mentre digiti e puoi
                      scegliere con mouse, touch o tastiera.
                    </p>
                  ) : null}
                </div>

                {degraded ? (
                  <p className={`${styles.degradedState} public-home-degraded`} role="status">
                    I dati aggiornati non sono disponibili. Stai visualizzando contenuti
                    dimostrativi.
                  </p>
                ) : null}
              </div>

              <div
                className={showcase.heroVisual}
                aria-label="Racconto visivo dimostrativo CityCore"
              >
                <div
                  className={showcase.heroPrimary}
                  role="img"
                  aria-label="Immagine dimostrativa di una città italiana e del suo territorio"
                  style={{ backgroundImage: `url("${visuals[0]}")` }}
                >
                  <span className={showcase.demoBadge}>{demoVisualLabel}</span>
                  <div className={showcase.heroCaption}>
                    <strong>Una porta d'ingresso alla città</strong>
                    <span>
                      Visual editoriale di supporto. Le informazioni pubblicate nelle schede
                      arrivano invece dai dati reali della piattaforma.
                    </span>
                  </div>
                </div>
                <div className={showcase.heroSecondaryStack}>
                  <div
                    className={showcase.heroSecondary}
                    role="img"
                    aria-label="Immagine dimostrativa di un centro urbano"
                    style={{ backgroundImage: `url("${visuals[1]}")` }}
                  >
                    <span className={showcase.demoBadge}>{demoVisualLabel}</span>
                  </div>
                  <div
                    className={showcase.heroSecondary}
                    role="img"
                    aria-label="Immagine dimostrativa di un paesaggio locale"
                    style={{ backgroundImage: `url("${visuals[2]}")` }}
                  >
                    <span className={showcase.demoBadge}>{demoVisualLabel}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={showcase.section} aria-labelledby="home-discovery-title">
              <div className={showcase.sectionHeading}>
                <div>
                  <p>Scopri CityCore</p>
                  <h2 id="home-discovery-title">Dalla città a ciò che ti serve</h2>
                </div>
                <p>
                  Un percorso unico e coerente: scegli la città, esplora le attività e apri una
                  scheda per vedere solo le informazioni realmente disponibili.
                </p>
              </div>

              <div className={showcase.valueGrid}>
                {valueCards.map((card) => (
                  <article className={showcase.valueCard} key={card.title}>
                    <div
                      className={showcase.valueVisual}
                      role="img"
                      aria-label={`${demoVisualLabel}: ${card.title}`}
                      style={{ backgroundImage: `url("${card.visual}")` }}
                    >
                      <span className={showcase.demoBadge}>{demoVisualLabel}</span>
                    </div>
                    <div className={showcase.valueCopy}>
                      <span>{card.label}</span>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {featuredCities.length ? (
              <section className={showcase.section} aria-labelledby="home-cities-title">
                <div className={showcase.sectionHeading}>
                  <div>
                    <p>Rete pubblica</p>
                    <h2 id="home-cities-title">Città da esplorare</h2>
                  </div>
                  <p>
                    Qui compaiono soltanto le città effettivamente pubblicate. La rete può crescere
                    senza trasformare la home in un elenco tecnico.
                  </p>
                </div>

                <div className={showcase.cityGrid}>
                  {featuredCities.map((city) => {
                    const cityVisual = getDemoCityVisuals(city.slug)[0];
                    return (
                      <Link className={showcase.cityCard} href={city.href} key={city.slug}>
                        <div
                          className={showcase.cityVisual}
                          role="img"
                          aria-label={`${demoVisualLabel} per ${city.name}`}
                          style={{ backgroundImage: `url("${cityVisual}")` }}
                        >
                          <span className={showcase.demoBadge}>{demoVisualLabel}</span>
                        </div>
                        <div className={showcase.cityCopy}>
                          <div>
                            <span className={showcase.cityEyebrow}>
                              {city.searchQualifier || "Guida locale"}
                            </span>
                            <h3>{city.name}</h3>
                            <p>Apri la città e scopri le attività già pubblicate.</p>
                          </div>
                          <span className={showcase.cityArrow} aria-hidden="true">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className={showcase.networkNote} aria-label="Visione della rete CityCore">
              <strong>Una rete che cresce città per città.</strong>
              <p>
                CityCore non finge di avere copertura dove ancora non c'è: ogni nuova città entra
                nella rete quando è attiva e può offrire una directory reale. La stessa esperienza
                rimane coerente dalla home globale fino alla singola attività.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
