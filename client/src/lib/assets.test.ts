import { describe, expect, it } from "vitest";
import { sampleAssets, searchAssets } from "./assets";

describe("searchAssets", () => {
  it("finds an asset by patrimônio case-insensitively", () => {
    const result = searchAssets(sampleAssets, "mr pay 0001");
    expect(result).toHaveLength(1);
    expect(result[0]?.patrimonio).toBe("MR PAY 0001");
  });

  it("finds an asset by exact serial fragment", () => {
    const result = searchAssets(sampleAssets, "7200032211011635");
    expect(result.map((asset) => asset.patrimonio)).toEqual(["MR PAY 0001"]);
  });

  it("combines search and status filters", () => {
    const result = searchAssets(sampleAssets, "totem", "Ativo");
    expect(result).toHaveLength(2);
    expect(result.every((asset) => asset.status === "Ativo")).toBe(true);
  });

  it("returns an empty list for unmatched terms", () => {
    expect(searchAssets(sampleAssets, "SERIE-INEXISTENTE")).toEqual([]);
  });
});
