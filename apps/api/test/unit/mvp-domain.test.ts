import { describe, expect, it } from "vitest";

import {
  buildCategoryTree,
  canSetCategoryParent,
  canTransitionInquiryStatus,
  getBusinessPublishReadiness,
  validateOpeningWeek,
} from "../../src/platform-core/mvp-domain.js";
import { createInquiryRateLimiter } from "../../src/platform-core/inquiry-guard.js";
import { publicInquirySchema } from "../../src/platform-core/mvp-schemas.js";

const publishable = {
  name: "Demo",
  slug: "demo",
  cityStatus: "active" as const,
  cityActive: true,
  publicSubtitle: "Scheda demo",
  publicDescription: null,
  publicEmail: "info@example.test",
  publicPhone: null,
  website: null,
  activeCategoryCount: 1,
};

describe("MVP domain", () => {
  it("accepts complete publish readiness and reports missing requirements", () => {
    expect(getBusinessPublishReadiness(publishable).canPublish).toBe(true);
    const result = getBusinessPublishReadiness({
      ...publishable,
      publicSubtitle: null,
      activeCategoryCount: 0,
      publicEmail: null,
    });
    expect(result.missingRequirements).toEqual(
      expect.arrayContaining(["description", "active_category", "public_contact"]),
    );
  });

  it("builds category trees and blocks cycles", () => {
    const tree = buildCategoryTree([
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
    ]);
    expect(tree[0].children.map((item) => item.id)).toEqual(["b"]);
    expect(
      canSetCategoryParent(
        "a",
        "b",
        new Map([
          ["a", null],
          ["b", "a"],
        ]),
      ),
    ).toBe(false);
  });

  it("keeps roots, nested children, orphaned categories and empty trees deterministic", () => {
    expect(buildCategoryTree([])).toEqual([]);
    const tree = buildCategoryTree([
      { id: "root-b", parentId: null },
      { id: "orphan", parentId: "missing" },
      { id: "root-a", parentId: null },
      { id: "child", parentId: "root-a" },
      { id: "grandchild", parentId: "child" },
    ]);
    expect(tree.map((item) => item.id)).toEqual(["root-b", "orphan", "root-a"]);
    expect(tree[2].children[0].children[0].id).toBe("grandchild");
  });

  it("validates closed days, invalid times and overlapping intervals", () => {
    const valid = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: weekday === 6,
      intervals: weekday === 6 ? [] : [{ opensAt: "09:00", closesAt: "12:00" }],
    }));
    expect(validateOpeningWeek(valid).valid).toBe(true);
    expect(
      validateOpeningWeek([
        {
          ...valid[0],
          intervals: [
            { opensAt: "09:00", closesAt: "12:00" },
            { opensAt: "11:00", closesAt: "13:00" },
          ],
        },
        ...valid.slice(1),
      ]).valid,
    ).toBe(false);
    expect(validateOpeningWeek([{ ...valid[0], isClosed: true }, ...valid.slice(1)]).valid).toBe(
      false,
    );
  });

  it("validates inquiry privacy, honeypot and HTML rejection", () => {
    const valid = {
      name: "Mario Rossi",
      email: "mario@example.test",
      message: "Vorrei maggiori informazioni.",
      privacyAccepted: true,
    };
    expect(publicInquirySchema.safeParse(valid).success).toBe(true);
    expect(publicInquirySchema.safeParse({ ...valid, privacyAccepted: false }).success).toBe(false);
    expect(publicInquirySchema.safeParse({ ...valid, company: "bot" }).success).toBe(true);
    expect(publicInquirySchema.safeParse({ ...valid, name: "<b>Mario</b>" }).success).toBe(false);
    expect(publicInquirySchema.safeParse({ ...valid, phone: "<b>333</b>" }).success).toBe(false);
    expect(
      publicInquirySchema.safeParse({ ...valid, message: "<b>test</b> con HTML" }).success,
    ).toBe(false);
  });

  it("accepts adjacent and split opening intervals but rejects equal, inverted and duplicate days", () => {
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isClosed: false,
      intervals: [{ opensAt: "09:00", closesAt: "12:00" }],
    }));
    days[0].intervals = [
      { opensAt: "09:00", closesAt: "12:00" },
      { opensAt: "12:00", closesAt: "18:00" },
    ];
    expect(validateOpeningWeek(days).valid).toBe(true);
    expect(
      validateOpeningWeek([
        { ...days[0], intervals: [{ opensAt: "09:00", closesAt: "09:00" }] },
        ...days.slice(1),
      ]).valid,
    ).toBe(false);
    expect(
      validateOpeningWeek([
        { ...days[0], intervals: [{ opensAt: "18:00", closesAt: "09:00" }] },
        ...days.slice(1),
      ]).valid,
    ).toBe(false);
    expect(validateOpeningWeek([{ ...days[0], weekday: 1 }, ...days.slice(1)]).valid).toBe(false);
  });

  it("limits inquiry submissions and supports allowed status transitions", () => {
    const limiter = createInquiryRateLimiter(5, 1000);
    expect(limiter.allows("127.0.0.1", 0)).toBe(true);
    expect(limiter.allows("127.0.0.1", 1)).toBe(true);
    expect(limiter.allows("127.0.0.1", 2)).toBe(true);
    expect(limiter.allows("127.0.0.1", 3)).toBe(true);
    expect(limiter.allows("127.0.0.1", 4)).toBe(true);
    expect(limiter.allows("127.0.0.1", 5)).toBe(false);
    expect(limiter.allows("127.0.0.2", 5)).toBe(true);
    expect(limiter.allows("127.0.0.1", 1001)).toBe(true);
    limiter.clear();
    expect(limiter.allows("127.0.0.1", 1001)).toBe(true);
    expect(canTransitionInquiryStatus("new", "read")).toBe(true);
    expect(canTransitionInquiryStatus("read", "closed")).toBe(true);
    expect(canTransitionInquiryStatus("closed", "closed")).toBe(true);
    expect(canTransitionInquiryStatus("closed", "read")).toBe(false);
  });
});
