import { describe, expect, it, vi } from "vitest";
import { clearAssetDatabase, replaceAssetDatabase, saveAssetRecord } from "@/lib/asset-operations";

function clientFrom(overrides: Record<string, unknown>) {
  return overrides as never;
}

describe("asset operations", () => {
  it("updates an existing asset and returns its id", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "asset-1" }, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const client = clientFrom({ from: vi.fn(() => ({ update })) });

    await expect(saveAssetRecord(client, "asset-1", {
      patrimonio: "MR PAY 0001",
      descricao: "PIN PAD",
      numero_serie: "123",
      conta_cliente: "SEFAZ",
      local: "São Paulo",
      status: "Ativo",
      conservacao: "Bom",
      observacoes: null,
      extra_data: {},
      valor_aquisicao: 1250.5,
    })).resolves.toEqual({ id: "asset-1" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ valor_aquisicao: 1250.5 }));
    expect(eq).toHaveBeenCalledWith("id", "asset-1");
  });

  it("propagates the Supabase error instead of masking a failed save", async () => {
    const error = new Error("permission denied");
    const insert = vi.fn().mockResolvedValue({ data: null, error });
    const client = clientFrom({ from: vi.fn(() => ({ insert })) });

    await expect(saveAssetRecord(client, null, {
      patrimonio: "MR PAY 0002",
      descricao: "DESKTOP",
      numero_serie: "456",
      conta_cliente: null,
      local: null,
      status: "Em estoque",
      conservacao: null,
      observacoes: null,
      extra_data: {},
      valor_aquisicao: null,
    })).rejects.toThrow("permission denied");
  });

  it("creates a new asset without requiring a post-insert read", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = clientFrom({ from: vi.fn(() => ({ insert })) });

    await expect(saveAssetRecord(client, null, {
      patrimonio: "MR PAY 0003",
      descricao: "TOTEM",
      numero_serie: "789",
      conta_cliente: "SEFAZ",
      local: "São Paulo",
      status: "Em estoque",
      conservacao: "Novo",
      observacoes: null,
      extra_data: {},
      valor_aquisicao: null,
    })).resolves.toBeNull();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ patrimonio: "MR PAY 0003" }));
  });

  it("uses the protected clear_assets RPC and returns the removed count", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 12, error: null });
    await expect(clearAssetDatabase(clientFrom({ rpc }))).resolves.toBe(12);
    expect(rpc).toHaveBeenCalledWith("clear_assets");
  });

  it("uses the transactional replacement RPC and propagates failures", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error("replacement failed") });
    const rows = [{ patrimonio: "MR PAY 0003" }];
    await expect(replaceAssetDatabase(clientFrom({ rpc }), rows, "base.xlsx")).rejects.toThrow("replacement failed");
    expect(rpc).toHaveBeenCalledWith("replace_assets", { payload: rows, source_file: "base.xlsx" });
  });
});
