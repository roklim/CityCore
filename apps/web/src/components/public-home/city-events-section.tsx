import Link from "next/link";

import { formatPublicEventSchedule, type PublicCityEventCard } from "../../lib/public-events";
import styles from "./city-showcase.module.css";

type CityEventsSectionProps = {
  events: PublicCityEventCard[];
  total: number;
  unavailable: boolean;
};

export function CityEventsSection({ events, total, unavailable }: CityEventsSectionProps) {
  const title = unavailable
    ? "Eventi temporaneamente non disponibili"
    : events.length
      ? "Prossimi eventi"
      : "Nessun evento in programma";

  return (
    <section id="events" aria-labelledby="city-events-title">
      <div className={styles.sectionHeading}>
        <div>
          <p>Agenda locale</p>
          <h2 id="city-events-title">{title}</h2>
        </div>

        {unavailable ? (
          <p className={styles.eventNotice} role="status">
            La directory delle attività resta consultabile. Riprova più tardi per gli appuntamenti
            pubblicati.
          </p>
        ) : events.length ? (
          <p>
            Appuntamenti pubblicati con data, luogo e organizzatore, ordinati cronologicamente.
            {total > events.length
              ? ` Anteprima dei primi ${events.length} eventi su ${total}.`
              : null}
          </p>
        ) : (
          <p className={styles.eventNotice}>
            L’agenda è attiva, ma non contiene appuntamenti futuri.
          </p>
        )}
      </div>

      {events.length ? (
        <div className={styles.eventGrid}>
          {events.map((event) => (
            <article className={styles.eventCard} key={event.id}>
              <time className={styles.eventDate} dateTime={event.startsAt}>
                {formatPublicEventSchedule(event)}
              </time>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              <div className={styles.eventVenue}>
                <strong>{event.venueName}</strong>
                {event.addressLine1 ? <span>{event.addressLine1}</span> : null}
              </div>
              {event.organizerHref ? (
                <Link className={styles.eventOrganizer} href={event.organizerHref}>
                  Organizzato da {event.organizer.name}
                </Link>
              ) : (
                <span className={styles.eventOrganizer}>Organizzato da {event.organizer.name}</span>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
