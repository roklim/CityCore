export type AdminCityLookupItem = {
  id: string;
  name: string;
  slug: string;
  province: string | null;
  region: string | null;
  country: string;
  status: "active" | "coming_soon" | "disabled";
  active: boolean;
  timezone: string | null;
  registryExternalId: string | null;
  countryName: string | null;
  admin1Name: string | null;
  admin2Name: string | null;
  activeCategoryCount: number;
  businessCount: number;
};

export type AdminBusinessLookupItem = {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "paused" | "disabled";
  city: {
    id: string;
    name: string;
    slug: string;
    status: "active" | "coming_soon" | "disabled";
    active: boolean;
  };
};

export type AdminCityLookupResponse = {
  status: "ok";
  items: AdminCityLookupItem[];
};

export type AdminBusinessLookupResponse = {
  status: "ok";
  items: AdminBusinessLookupItem[];
};
