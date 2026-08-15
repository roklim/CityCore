import { describe, expect, it } from "vitest";

import {
  validatePublicInquiryValues,
  validatePublicPickupValues,
  type PublicInquiryFormValues,
  type PublicPickupFormValues,
} from "./public-form-validation";

const validInquiry: PublicInquiryFormValues = {
  name: "Mario & Figli",
  email: "mario@example.test",
  phone: "+39 333 123 4567",
  message: "Vorrei informazioni sui vostri servizi, grazie!",
  privacyAccepted: true,
  company: "",
};

const validPickup: PublicPickupFormValues = {
  name: "Mario & Figli",
  email: "mario@example.test",
  phone: "+39 333 123 4567",
  notes: "Citofono Rossi, grazie.",
  privacyAccepted: true,
  company: "",
};

describe("public form validation", () => {
  it("rejects HTML in inquiry name, phone and message with field-specific errors", () => {
    expect(validatePublicInquiryValues({ ...validInquiry, name: "<b>Mario</b>" }).name).toBe(
      "Il nome non può contenere HTML.",
    );
    expect(validatePublicInquiryValues({ ...validInquiry, phone: "<b>333</b>" }).phone).toBe(
      "Il telefono non può contenere HTML.",
    );
    expect(
      validatePublicInquiryValues({
        ...validInquiry,
        message: "<script>alert(1)</script> Vorrei informazioni.",
      }).message,
    ).toBe("Il messaggio non può contenere HTML.");
  });

  it("accepts normal inquiry text with legitimate punctuation and symbols", () => {
    expect(validatePublicInquiryValues(validInquiry)).toEqual({});
  });

  it("rejects HTML in pickup name, phone and notes with field-specific errors", () => {
    expect(
      validatePublicPickupValues({ ...validPickup, name: "<i>Mario</i>" }, 1, "19:00").name,
    ).toBe("Il nome non può contenere HTML.");
    expect(
      validatePublicPickupValues({ ...validPickup, phone: "<span>333</span>" }, 1, "19:00").phone,
    ).toBe("Il telefono non può contenere HTML.");
    expect(
      validatePublicPickupValues({ ...validPickup, notes: "<b>Senza cipolla</b>" }, 1, "19:00")
        .notes,
    ).toBe("Le note non possono contenere HTML.");
  });

  it("accepts a valid pickup contact payload", () => {
    expect(validatePublicPickupValues(validPickup, 1, "19:00")).toEqual({});
  });
});
