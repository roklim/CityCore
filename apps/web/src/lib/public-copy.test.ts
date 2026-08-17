import { describe, expect, it } from "vitest";

import { getContextualBusinessSummary } from "./public-copy";

describe("getContextualBusinessSummary", () => {
  it("removes the repeated business and city lead-in from demo summaries", () => {
    expect(
      getContextualBusinessSummary(
        "Scopri Mucho Gusto a Cagli: consulta informazioni, servizi e contatti.",
        "Mucho Gusto",
        "Cagli",
      ),
    ).toBe("Consulta informazioni, servizi e contatti.");
  });

  it("keeps authored copy when it does not repeat the context", () => {
    expect(
      getContextualBusinessSummary(
        "Pizza contemporanea, forno e proposte stagionali.",
        "Mucho Gusto",
        "Cagli",
      ),
    ).toBe("Pizza contemporanea, forno e proposte stagionali.");
  });

  it("normalizes accidental whitespace without changing the message", () => {
    expect(
      getContextualBusinessSummary(
        "  Una   cucina locale con ingredienti stagionali.  ",
        "Mucho Gusto",
        "Cagli",
      ),
    ).toBe("Una cucina locale con ingredienti stagionali.");
  });
});
