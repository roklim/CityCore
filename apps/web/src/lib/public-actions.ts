export type PublicBusinessPrimaryAction = {
  label: string;
  heading: string;
  href: string;
  external?: boolean;
};

export function getPublicBusinessPrimaryAction({
  pickupOrderAvailable,
  inquiryAvailable,
  phoneHref,
  emailHref,
  website,
}: {
  pickupOrderAvailable: boolean;
  inquiryAvailable: boolean;
  phoneHref: string | null;
  emailHref: string | null;
  website: string | null;
}): PublicBusinessPrimaryAction {
  if (pickupOrderAvailable) {
    return { label: "Ordina e ritira", heading: "Ordina per il ritiro", href: "#order" };
  }

  if (inquiryAvailable) {
    return { label: "Invia una richiesta", heading: "Invia una richiesta", href: "#contact" };
  }

  if (phoneHref) {
    return { label: "Chiama", heading: "Contatta l’attività", href: phoneHref };
  }

  if (emailHref) {
    return { label: "Scrivi", heading: "Contatta l’attività", href: emailHref };
  }

  if (website) {
    return {
      label: "Visita il sito",
      heading: "Scopri l’attività",
      href: website,
      external: true,
    };
  }

  return { label: "Vedi i servizi", heading: "Scopri cosa offre", href: "#services" };
}

export type CityMobileNavigationItem = {
  label: string;
  href: string;
  icon: "home" | "places" | "profile";
  current?: "location";
};

export function getCityMobileNavigation(citySlug: string): CityMobileNavigationItem[] {
  const encodedCitySlug = encodeURIComponent(citySlug);

  return [
    { label: "Home", href: "/", icon: "home" },
    {
      label: "Attività",
      href: `/${encodedCitySlug}#directory`,
      icon: "places",
      current: "location",
    },
    { label: "Operatori", href: "/admin/login", icon: "profile" },
  ];
}
