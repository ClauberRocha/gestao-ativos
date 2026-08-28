import { describe, expect, it } from "vitest";

describe("Mr Pay Ativos brand configuration", () => {
  it("exposes the configured application title", () => {
    expect(import.meta.env.VITE_APP_TITLE).toBe("Mr Pay Ativos");
  });
});
