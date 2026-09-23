import { describe, expect, it } from "vitest";
import { filterAssetRows, type AssetFilters } from "@/pages/Home";
import { sampleAssets } from "@/lib/assets";

const baseFilters: AssetFilters = { query: "", status: "Todos", conservacao: "", contaCliente: "", createdFrom: "", createdTo: "", modifiedFrom: "", modifiedTo: "" };

describe("asset advanced filters", () => {
  it("combines conservation, account and creation date filters", () => {
    const first = sampleAssets[0];
    const result = filterAssetRows(sampleAssets, { ...baseFilters, conservacao: first.conservacao ?? "", contaCliente: first.conta_cliente ?? "", createdFrom: "1969-12-31", createdTo: "1970-01-02" });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((asset) => asset.conservacao === first.conservacao && asset.conta_cliente === first.conta_cliente)).toBe(true);
  });

  it("combines modification dates and returns no out-of-range rows", () => {
    const result = filterAssetRows(sampleAssets, { ...baseFilters, modifiedFrom: "2099-01-01" });
    expect(result).toEqual([]);
  });

  it("finds assets by description as well as identifiers", () => {
    const first = sampleAssets[0];
    const result = filterAssetRows(sampleAssets, { ...baseFilters, query: first.descricao });
    expect(result.some((asset) => asset.id === first.id)).toBe(true);
  });
});
