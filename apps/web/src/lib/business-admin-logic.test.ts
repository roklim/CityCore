import { describe, expect, it } from "vitest";
import {
  buildOpeningWeekPayload,
  buildSocialLinksFromForm,
  readinessReasonLabel,
  validateOpeningWeek,
} from "./business-admin-logic";

describe("business admin form logic", () => {
  it("maps only supported social fields to socialLinks", () => {
    const formData = new FormData();
    formData.set("instagram", "https://instagram.com/citycore");
    formData.set("linkedin", "https://linkedin.com/company/citycore");
    formData.set("unsupported", "https://example.com");
    expect(buildSocialLinksFromForm(formData)).toEqual({
      instagram: "https://instagram.com/citycore",
      linkedin: "https://linkedin.com/company/citycore",
    });
  });

  it("maps the complete opening-hours form to the atomic API payload", () => {
    const formData = new FormData();
    for (let weekday = 0; weekday < 7; weekday += 1) {
      formData.set(`day-${weekday}-count`, weekday === 0 ? "2" : "0");
      if (weekday > 0) formData.set(`day-${weekday}-closed`, "on");
    }
    formData.set("day-0-opens-0", "09:00");
    formData.set("day-0-closes-0", "13:00");
    formData.set("day-0-opens-1", "15:00");
    formData.set("day-0-closes-1", "19:00");

    const payload = buildOpeningWeekPayload(formData);
    expect(payload.days).toHaveLength(7);
    expect(payload.days[0]).toEqual({
      weekday: 0,
      isClosed: false,
      note: null,
      intervals: [
        { opensAt: "09:00", closesAt: "13:00" },
        { opensAt: "15:00", closesAt: "19:00" },
      ],
    });
    expect(payload.days[1].isClosed).toBe(true);
  });

  it("detects overlapping opening intervals", () => {
    expect(
      validateOpeningWeek([
        {
          weekday: 0,
          isClosed: false,
          note: null,
          intervals: [
            { opensAt: "09:00", closesAt: "13:00" },
            { opensAt: "12:00", closesAt: "18:00" },
          ],
        },
      ]),
    ).toContain("Le fasce del giorno 1 si sovrappongono.");
  });

  it("maps readiness reasons to Italian labels", () => {
    expect(readinessReasonLabel("description")).toBe("Descrizione pubblica mancante");
    expect(readinessReasonLabel("active_category")).toBe("Categoria attiva mancante");
    expect(readinessReasonLabel("unknown")).toBe("Requisito di pubblicazione non soddisfatto");
  });
});
