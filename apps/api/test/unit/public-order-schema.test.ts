import { describe, expect, it } from "vitest";

import { publicOrderSchema } from "../../src/platform-core/routes-pickup-ordering.js";

const validOrder = {
  name: "Pickup Visitor",
  email: "pickup@example.test",
  phone: "+39 333 123 4567",
  notes: "Citofono Rossi, grazie.",
  pickupDate: "2026-08-16",
  pickupTime: "19:00",
  privacyAccepted: true,
  company: "",
  items: [{ serviceId: "service-1", quantity: 1 }],
};

describe("public pickup order schema", () => {
  it("accepts normal text", () => {
    expect(publicOrderSchema.safeParse(validOrder).success).toBe(true);
  });

  it.each([
    ["name", "<b>Pickup Visitor</b>"],
    ["phone", "<span>3331234567</span>"],
    ["notes", "<script>alert(1)</script>"],
  ] as const)("rejects HTML in %s when the frontend is bypassed", (field, value) => {
    expect(publicOrderSchema.safeParse({ ...validOrder, [field]: value }).success).toBe(false);
  });
});
