import { useEffect, useState } from "react";
import CustomerView from "./views/CustomerView";
import TrackingView from "./views/TrackingView";
import AdminView from "./views/AdminView";
import PlatformLanding from "./views/PlatformLanding";
import CityHome from "./views/CityHome";
import PlatformAdminView from "./views/PlatformAdminView";
import { getPublicCity } from "./lib/api";

function cleanPath(pathname) {
  return (pathname || "/").replace(/\/+$/, "") || "/";
}

function businessSlugFromPath(pathname) {
  const firstSegment = cleanPath(pathname).split("/").filter(Boolean)[0];
  if (!firstSegment) return "";
  if (["admin", "ordine", "p"].includes(firstSegment)) return "";
  return firstSegment;
}

export default function App() {
  // Router minimale senza librerie: `/` e' la ricerca citta, `/:citySlug`
  // la directory locale e gli URL business legacy restano compatibili.
  const path = cleanPath(window.location.pathname);
  const orderIdFromQuery = new URLSearchParams(window.location.search).get(
    "ordine",
  );
  const businessSlug = businessSlugFromPath(path);
  const segments = path.split("/").filter(Boolean);
  const firstSegment = segments[0] || "";
  const secondSegment = segments[1] || "";
  const [cityRoute, setCityRoute] = useState({ slug: "", checked: false });

  useEffect(() => {
    let cancelled = false;
    async function resolveCityRoute() {
      if (!firstSegment || ["admin", "ordine", "p"].includes(firstSegment)) {
        setCityRoute({ slug: "", checked: true });
        return;
      }
      try {
        await getPublicCity(firstSegment);
        if (!cancelled) setCityRoute({ slug: firstSegment, checked: true });
      } catch {
        if (!cancelled) setCityRoute({ slug: "", checked: true });
      }
    }
    setCityRoute({ slug: "", checked: false });
    resolveCityRoute();
    return () => {
      cancelled = true;
    };
  }, [firstSegment]);

  if (path === "/") {
    return <PlatformLanding />;
  }

  if (
    path === "/admin" ||
    path === "/admin/cities" ||
    path === "/admin/businesses" ||
    path === "/admin/users" ||
    path === "/admin/settings"
  ) {
    return <PlatformAdminView />;
  }

  if (orderIdFromQuery) {
    return <TrackingView orderId={orderIdFromQuery} />;
  }

  if (firstSegment && !cityRoute.checked) {
    return <PlatformLanding loadingRoute />;
  }

  if (cityRoute.slug && segments.length === 1) {
    return <CityHome citySlug={cityRoute.slug} />;
  }

  if (cityRoute.slug && secondSegment) {
    if (
      path === `/${cityRoute.slug}/${secondSegment}/admin` ||
      path.startsWith(`/${cityRoute.slug}/${secondSegment}/admin/`)
    ) {
      return <AdminView />;
    }

    if (path.startsWith(`/${cityRoute.slug}/${secondSegment}/ordine/`)) {
      return (
        <TrackingView
          orderId={decodeURIComponent(path.split("/")[4] || "")}
        />
      );
    }

    return <CustomerView />;
  }

  if (businessSlug) {
    if (
      path === `/${businessSlug}/admin` ||
      path.startsWith(`/${businessSlug}/admin/`)
    ) {
      return <AdminView />;
    }

    if (path.startsWith(`/${businessSlug}/ordine/`)) {
      return (
        <TrackingView
          orderId={decodeURIComponent(path.split("/")[3] || "")}
        />
      );
    }

    return <CustomerView />;
  }

  if (path.startsWith("/ordine/")) {
    return (
      <TrackingView orderId={decodeURIComponent(path.split("/")[2] || "")} />
    );
  }

  return path.startsWith("/admin") ? <PlatformAdminView /> : <CustomerView />;
}
