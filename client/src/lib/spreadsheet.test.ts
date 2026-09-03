import { describe, expect, it } from "vitest";
import { assetsToSpreadsheetRows, parseAssetSpreadsheet } from "./spreadsheet";
import type { Asset } from "./supabase";

function csvFile(contents: string, name = "ativos.csv") {
  return {
    name,
    arrayBuffer: async () => new TextEncoder().encode(contents).buffer,
  } as File;
}

describe("planilhas de ativos", () => {
  it("mapeia aliases conhecidos e preserva colunas novas em extra_data", async () => {
    const file = csvFile([
      "Patrimônio,Descrição,Número de série,Status,Conservação,Conta Cliente,Centro de custo",
      "MR PAY 9001,PIN PAD,SERIE-9001,Ativo,Bom,SEFAZ,OPERACOES",
    ].join("\n"));

    const result = await parseAssetSpreadsheet(file);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      patrimonio: "MR PAY 9001",
      descricao: "PIN PAD",
      numero_serie: "SERIE-9001",
      status: "Ativo",
      conservacao: "Bom",
      conta_cliente: "SEFAZ",
      extra_data: { "Centro de custo": "OPERACOES" },
    });
    expect(result.extraHeaders).toEqual(["Centro de custo"]);
  });

  it("bloqueia arquivos que não possuem todas as colunas obrigatórias", async () => {
    const file = csvFile("Patrimônio,Status\nMR PAY 1,Ativo");
    await expect(parseAssetSpreadsheet(file)).rejects.toThrow("Colunas obrigatórias ausentes");
  });

  it("inclui campos extras e oculta aquisição na exportação de operador", () => {
    const asset: Asset = {
      id: "00000000-0000-4000-8000-000000000001",
      patrimonio: "MR PAY 1",
      descricao: "DESKTOP",
      numero_serie: "SERIE-1",
      conta_cliente: "SEFAZ",
      local: "SP",
      status: "Ativo",
      conservacao: "Bom",
      valor_aquisicao: 2500,
      observacoes: null,
      extra_data: { "Centro de custo": "TI" },
    };

    const operatorRow = assetsToSpreadsheetRows([asset], false)[0];
    const adminRow = assetsToSpreadsheetRows([asset], true)[0];

    expect(operatorRow).not.toHaveProperty("Valor de aquisição");
    expect(operatorRow).toHaveProperty("Centro de custo", "TI");
    expect(adminRow).toHaveProperty("Valor de aquisição", 2500);
  });
});
