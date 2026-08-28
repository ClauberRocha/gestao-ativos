import { describe, expect, it } from "vitest";
import { getNextTheme, getThemeToggleLabel, getThemeToggleTitle } from "./theme";

describe("theme controls", () => {
  it("alternates between light and dark themes", () => {
    expect(getNextTheme("light")).toBe("dark");
    expect(getNextTheme("dark")).toBe("light");
  });

  it("provides accessible labels for the next theme", () => {
    expect(getThemeToggleLabel("light")).toBe("Ativar modo escuro");
    expect(getThemeToggleLabel("dark")).toBe("Ativar modo claro");
    expect(getThemeToggleTitle("light")).toBe("Modo escuro");
    expect(getThemeToggleTitle("dark")).toBe("Modo claro");
  });
});
