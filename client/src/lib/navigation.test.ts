import { describe, expect, it } from "vitest";
import { getMenuHash } from "./navigation";

describe("menu navigation", () => {
  it("maps overview and inventory to real sections", () => {
    expect(getMenuHash("Visão geral")).toBe("#visao-geral");
    expect(getMenuHash("Inventário")).toBe("#inventario");
  });
});
