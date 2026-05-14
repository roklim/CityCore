import type { Capability, HomepageViewModel } from "./home-content";
import { CapabilityIcon } from "./visuals";
import styles from "./public-home.module.css";

export function CapabilityStrip({
  capabilities,
  copy,
}: {
  capabilities: Capability[];
  copy: HomepageViewModel["capabilitySection"];
}) {
  return (
    <section className={styles.capabilitySection} id="capabilities">
      <div className={styles.capabilityLead}>
        <p className={styles.sectionEyebrow}>{copy.eyebrow}</p>
        <h2>
          {copy.titleLine1}
          <br />
          {copy.titleLine2}
        </h2>
      </div>

      <div className={styles.capabilityGrid}>
        {capabilities.map((capability) => (
          <article className={styles.capabilityCard} key={capability.title}>
            <div className={styles.capabilityIcon}>
              <CapabilityIcon icon={capability.icon} />
            </div>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
