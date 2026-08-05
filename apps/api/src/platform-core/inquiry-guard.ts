type RateLimitEntry = { count: number; resetAt: number };

export function createInquiryRateLimiter(limit = 5, windowMs = 10 * 60 * 1_000) {
  const entries = new Map<string, RateLimitEntry>();

  return {
    allows(address: string, now = Date.now()) {
      const previous = entries.get(address);
      if (!previous || previous.resetAt <= now) {
        entries.set(address, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (previous.count >= limit) return false;
      previous.count += 1;
      return true;
    },
    clear() {
      entries.clear();
    },
  };
}
