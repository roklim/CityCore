import CustomerView from "./views/CustomerView";
import TrackingView from "./views/TrackingView";
import AdminView from "./views/AdminView";
import PlatformHome from "./views/PlatformHome";

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
  // Router minimale senza librerie: `/` e' la console piattaforma, `/:slug`
  // e' l'app pubblica del singolo business.
  const path = cleanPath(window.location.pathname);
  const orderIdFromQuery = new URLSearchParams(window.location.search).get(
    "ordine",
  );
  const businessSlug = businessSlugFromPath(path);

  if (path === "/") {
    return <PlatformHome />;
  }

  if (orderIdFromQuery) {
    return <TrackingView orderId={orderIdFromQuery} />;
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

  return path.startsWith("/admin") ? <AdminView /> : <CustomerView />;
}
