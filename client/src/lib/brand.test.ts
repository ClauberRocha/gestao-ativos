import { describe, expect, it } from "vitest";
import { MR_PAY_LOGO_URL } from "./brand";

describe("Mr Pay Ativos brand configuration", () => {
  it("exposes the configured application title", () => {
    expect(import.meta.env.VITE_APP_TITLE).toBe("Mr Pay Ativos");
  });

  it("uses the official persistent Mr Pay logo asset", () => {
    expect(MR_PAY_LOGO_URL).toBe("/manus-storage/mr-pay-logo_129989d0.svg");
  });
});
