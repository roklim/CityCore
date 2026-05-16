export function createLookup<TValue extends { code: string }>(items: readonly TValue[]) {
  return Object.fromEntries(items.map((item) => [item.code, item])) as Record<
    TValue["code"],
    TValue
  >;
}
