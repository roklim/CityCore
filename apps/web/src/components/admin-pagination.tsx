import Link from "next/link";
import { pageHref } from "../lib/admin-query";

export function AdminPagination({
  pathname,
  page,
  totalPages,
  total,
  query,
  pageParam = "page",
}: {
  pathname: string;
  page: number;
  totalPages: number;
  total: number;
  query: Record<string, string | number | boolean | undefined>;
  pageParam?: string;
}) {
  if (totalPages <= 1) {
    return total > 0 ? <p className="pagination-summary">{total} risultati</p> : null;
  }

  return (
    <nav className="admin-pagination" aria-label="Paginazione risultati">
      <p aria-live="polite" className="pagination-summary">
        Pagina {page} di {totalPages} · {total} risultati
      </p>
      <div className="admin-pagination-actions">
        {page > 1 ? (
          <Link
            aria-label={`Vai alla pagina ${page - 1}`}
            className="admin-button ghost-button"
            href={pageHref(pathname, query, page - 1, pageParam)}
            rel="prev"
          >
            Precedente
          </Link>
        ) : (
          <span className="admin-button ghost-button is-disabled" aria-disabled="true">
            Precedente
          </span>
        )}
        {page < totalPages ? (
          <Link
            aria-label={`Vai alla pagina ${page + 1}`}
            className="admin-button ghost-button"
            href={pageHref(pathname, query, page + 1, pageParam)}
            rel="next"
          >
            Successiva
          </Link>
        ) : (
          <span className="admin-button ghost-button is-disabled" aria-disabled="true">
            Successiva
          </span>
        )}
      </div>
    </nav>
  );
}
