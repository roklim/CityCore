type DemoBusinessVisualSource = {
  slug: string;
  name: string;
  categoryLabel: string;
  categories: readonly { name: string }[];
  services?: readonly string[];
};

const CITY_DEMO_VISUALS = [
  "https://images.unsplash.com/photo-1733057064260-2158ad18c8e1?auto=format&fit=crop&w=1600&q=82",
  "https://images.unsplash.com/photo-1778414702226-fe3ac26a9f88?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1769102472300-07f038ab9229?auto=format&fit=crop&w=1200&q=80",
] as const;

const BUSINESS_DEMO_VISUALS = [
  "https://images.unsplash.com/photo-1534649643822-e7431de08af6?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1569230516306-5a8cb5586399?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1778414702226-fe3ac26a9f88?auto=format&fit=crop&w=1200&q=82",
  "https://images.unsplash.com/photo-1733057064260-2158ad18c8e1?auto=format&fit=crop&w=1200&q=82",
] as const;

function hashString(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 17);
}

export function getDemoCityVisuals(citySlug: string) {
  const offset = hashString(citySlug) % CITY_DEMO_VISUALS.length;
  return CITY_DEMO_VISUALS.map(
    (_, index) => CITY_DEMO_VISUALS[(offset + index) % CITY_DEMO_VISUALS.length],
  );
}

export function getDemoBusinessVisual(business: DemoBusinessVisualSource, index = 0) {
  const searchable = [
    business.name,
    business.categoryLabel,
    ...business.categories.map((category) => category.name),
    ...(business.services ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("it-IT");

  if (/pizza|pizzeria|ristor|food|cibo|trattoria|bar|cafe|caff/i.test(searchable)) {
    return BUSINESS_DEMO_VISUALS[index % 2];
  }

  return BUSINESS_DEMO_VISUALS[(hashString(business.slug) + index) % BUSINESS_DEMO_VISUALS.length];
}

export const demoVisualLabel = "Immagine dimostrativa";
