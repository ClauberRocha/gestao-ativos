import * as XLSX from "xlsx-js-style";
import type { Asset, AssetStatus } from "./supabase";

export type ImportRow = Omit<Asset, "id" | "created_at" | "updated_at" | "extra_data"> & { extra_data: Record<string, unknown> };

const FIELD_ALIASES: Record<string, keyof ImportRow> = {
  patrimonio: "patrimonio",
  descricao: "descricao",
  numeroserie: "numero_serie",
  numerodeserie: "numero_serie",
  serie: "numero_serie",
  contacliente: "conta_cliente",
  cliente: "conta_cliente",
  local: "local",
  status: "status",
  conservacao: "conservacao",
  valoraquisicao: "valor_aquisicao",
  observacoes: "observacoes",
};

const normalizeHeader = (value: unknown) => String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const asText = (value: unknown) => value == null ? "" : String(value).trim();
const allowedStatuses = new Set<AssetStatus>(["Entregue", "Em estoque", "Ativo", "Defeito"]);

export async function parseAssetSpreadsheet(file: File) {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error("Formato inválido. Selecione um arquivo .xlsx, .xls ou .csv.");
  const buffer = await file.arrayBuffer();
  const workbook = /\.csv$/i.test(file.name)
    ? XLSX.read(new TextDecoder("utf-8").decode(buffer), { type: "string", cellDates: true })
    : XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("A planilha não contém uma aba válida.");
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
  if (!rawRows.length) throw new Error("A planilha não contém registros para importar.");
  const headers = Object.keys(rawRows[0]);
  const mappedHeaders = new Map<string, keyof ImportRow>();
  for (const header of headers) {
    const field = FIELD_ALIASES[normalizeHeader(header)];
    if (field) mappedHeaders.set(header, field);
  }
  const missing = ["patrimonio", "descricao", "numero_serie", "status", "conservacao", "conta_cliente"].filter((field) => !Array.from(mappedHeaders.values()).includes(field as keyof ImportRow));
  if (missing.length) throw new Error(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);
  const extraHeaders = headers.filter((header) => !mappedHeaders.has(header));
  const rows: ImportRow[] = rawRows.map((raw, index) => {
    const base: Record<string, unknown> = { patrimonio: "", descricao: "", numero_serie: "", conta_cliente: "", local: "", status: "Em estoque", conservacao: "", valor_aquisicao: null, observacoes: "", extra_data: {} };
    mappedHeaders.forEach((field, header) => {
      const value = raw[header];
      if (field === "valor_aquisicao") base[field] = value === "" ? null : Number(value) || null;
      else if (field === "status") base[field] = allowedStatuses.has(asText(value) as AssetStatus) ? asText(value) as AssetStatus : "Em estoque";
      else base[field] = asText(value);
    });
    for (const header of extraHeaders) (base.extra_data as Record<string, unknown>)[header] = raw[header];
    if (!base.patrimonio || !base.descricao || !base.numero_serie || !base.status || !base.conservacao || !base.conta_cliente) throw new Error(`Registro ${index + 2}: Patrimônio, Descrição, Número de série, Status, Conservação e Conta Cliente são obrigatórios.`);
    return base as ImportRow;
  });
  return { rows, headers, extraHeaders };
}

export function assetsToSpreadsheetRows(assets: Asset[], includeAcquisition: boolean) {
  return assets.map((asset) => ({
    Patrimônio: asset.patrimonio,
    Descrição: asset.descricao,
    "Número de série": asset.numero_serie,
    "Conta Cliente": asset.conta_cliente ?? "",
    Local: asset.local ?? "",
    Status: asset.status,
    Conservação: asset.conservacao ?? "",
    ...(includeAcquisition ? { "Valor de aquisição": asset.valor_aquisicao ?? "" } : {}),
    Observações: asset.observacoes ?? "",
    ...asset.extra_data,
  }));
}

export function downloadAssetsXlsx(assets: Asset[], includeAcquisition: boolean, fileName = "mr-pay-ativos.xlsx") {
  const worksheet = XLSX.utils.json_to_sheet(assetsToSpreadsheetRows(assets, includeAcquisition));
  worksheet["!cols"] = [{ wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 42 }];
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) };
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    if (cell) cell.s = { fill: { fgColor: { rgb: "172554" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { vertical: "center" } };
  }
  const statusColors: Record<AssetStatus, string> = { Ativo: "DCFCE7", "Em estoque": "FEF3C7", Entregue: "E0F2FE", Defeito: "FEE2E2" };
  assets.forEach((asset, index) => {
    const cell = worksheet[`F${index + 2}`];
    if (cell) cell.s = { fill: { fgColor: { rgb: statusColors[asset.status] } }, font: { bold: true, color: { rgb: "0F172A" } } };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventário");
  XLSX.writeFile(workbook, fileName);
}
