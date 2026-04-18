import CustomerView from "./views/CustomerView";
import TrackingView from "./views/TrackingView";
import AdminView from "./views/AdminView";
export default function App() {
  // Router minimale senza librerie: mantiene il progetto leggero mentre separa
  // pagina cliente, tracking ordine e area admin.
  const path = window.location.pathname;
  const orderIdFromQuery = new URLSearchParams(window.location.search).get(
    "ordine",
  );
  if (orderIdFromQuery) {
    return <TrackingView orderId={orderIdFromQuery} />;
  }
  if (path.startsWith("/ordine/")) {
    return (
      <TrackingView orderId={decodeURIComponent(path.split("/")[2] || "")} />
    );
  }
  return path.startsWith("/admin") ? <AdminView /> : <CustomerView />;
}


