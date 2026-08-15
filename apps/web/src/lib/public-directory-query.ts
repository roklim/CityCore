export type PublicDirectoryFilters = {
  query: string;
  category: string;
};

export function readPublicDirectoryFilters(searchParams: URLSearchParams): PublicDirectoryFilters {
  return {
    query: searchParams.get("q") ?? "",
    category: searchParams.get("category") || "all",
  };
}

export function updatePublicDirectorySearchParams(
  searchParams: URLSearchParams,
  changes: Partial<PublicDirectoryFilters>,
) {
  const next = new URLSearchParams(searchParams.toString());

  if (changes.query !== undefined) {
    const query = changes.query.trim();
    if (query) next.set("q", query);
    else next.delete("q");
  }

  if (changes.category !== undefined) {
    if (changes.category && changes.category !== "all") next.set("category", changes.category);
    else next.delete("category");
  }

  return next;
}
