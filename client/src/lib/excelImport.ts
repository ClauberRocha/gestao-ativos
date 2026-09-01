import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured, type Asset, type AssetStatus, type Profile } from "./supabase";
import { getLocalAssets, saveLocalAssets, clearLocalAssets } from "./assets";
import { recordAssetAudit } from "./audit";
import type { User } from "@supabase/supabase-js";

export interface ParsedExcelResult {
  filename: string;
  totalRows: number;
  columnsFound: string[];
  mappedColumns: { original: string; mappedTo: keyof Asset | "extra" }[];
  items: {
    asset: Omit<Asset, "id">;
    originalRow: Record<string, any>;
    warnings: string[];
    extraFields: Record<string, any>;
  }[];
  duplicateCount: number;
}

// Normalizes header string to match standard field names
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// Determines the mapped asset key from the normalized header
export function identifyField(header: string): keyof Asset | "extra" {
  const norm = normalizeHeader(header);

  // Valor Aquisicao (check before generic 'valor')
  if (
    norm.includes("valor") ||
    norm.includes("preco") ||
    norm === "custo" ||
    norm.includes("custo_aquisicao") ||
    norm === "cost" ||
    norm === "price"
  ) {
    return "valor_aquisicao";
  }

  // Numero de Serie (check before 'serie')
  if (
    norm.includes("serie") ||
    norm.includes("serial") ||
    norm === "sn" ||
    norm === "s_n" ||
    norm === "n_s" ||
    norm === "ns"
  ) {
    return "numero_serie";
  }

  // Patrimonio
  if (
    norm.includes("patrimonio") ||
    norm.includes("tombamento") ||
    norm === "tag" ||
    norm === "codigo" ||
    norm === "cod" ||
    norm === "asset_id"
  ) {
    return "patrimonio";
  }

  // Descricao
  if (
    norm.includes("descricao") ||
    norm.includes("equipamento") ||
    norm.includes("modelo") ||
    norm === "item" ||
    norm.includes("nome") ||
    norm === "tipo" ||
    norm.includes("description")
  ) {
    return "descricao";
  }

  // Conta Cliente
  if (
    norm.includes("cliente") ||
    norm.includes("conta") ||
    norm.includes("contrato") ||
    norm.includes("empresa") ||
    norm.includes("client") ||
    norm.includes("customer")
  ) {
    return "conta_cliente";
  }

  // Local
  if (
    norm.includes("local") ||
    norm.includes("filial") ||
    norm.includes("cidade") ||
    norm === "uf" ||
    norm.includes("unidade") ||
    norm.includes("setor") ||
    norm.includes("posto") ||
    norm.includes("location")
  ) {
    return "local";
  }

  // Status
  if (
    norm === "status" ||
    norm.includes("situacao") ||
    norm === "estado" ||
    norm === "state"
  ) {
    return "status";
  }

  // Conservacao
  if (
    norm.includes("conservac") ||
    norm.includes("condic") ||
    norm.includes("condition")
  ) {
    return "conservacao";
  }

  // Observacoes
  if (
    norm.includes("observac") ||
    norm === "nota" ||
    norm === "notas" ||
    norm === "obs" ||
    norm.includes("detalhe") ||
    norm.includes("comment")
  ) {
    return "observacoes";
  }

  return "extra";
}

// Normalizes status string to strict AssetStatus union
export function normalizeStatus(raw: any): AssetStatus {
  if (!raw) return "Em estoque";
  const s = String(raw)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    s.includes("defeito") ||
    s.includes("manutenc") ||
    s.includes("avaria") ||
    s.includes("quebrad") ||
    s.includes("danificad") ||
    s.includes("rma")
  ) {
    return "Defeito";
  }
  if (
    s.includes("entregue") ||
    s.includes("expedid") ||
    s.includes("transito") ||
    s.includes("enviad")
  ) {
    return "Entregue";
  }
  if (
    s.includes("ativo") ||
    s.includes("operac") ||
    s.includes("operando") ||
    s.includes("em uso") ||
    s.includes("instalad")
  ) {
    return "Ativo";
  }
  if (
    s.includes("estoque") ||
    s.includes("disponiv") ||
    s.includes("armazenad") ||
    s.includes("reserva")
  ) {
    return "Em estoque";
  }
  return "Em estoque";
}

// Normalizes currency values
export function parseCurrencyValue(raw: any): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;

  const str = String(raw).trim().replace(/R\$/g, "").replace(/\s/g, "");
  // Handle Brazilian formatting: 1.250,50 -> 1250.50
  if (str.includes(",") && str.includes(".")) {
    const cleaned = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  if (str.includes(",")) {
    const num = parseFloat(str.replace(",", "."));
    return isNaN(num) ? null : num;
  }
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// Parse file (XLSX, XLS, CSV)
export async function parseExcelOrCsv(file: File): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha não contém nenhuma aba ou dados legíveis.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: "",
    raw: false,
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error("O arquivo selecionado está vazio ou não possui linhas de dados.");
  }

  const columnsFound = Object.keys(rawRows[0] || {});
  const mappedColumns = columnsFound.map((col) => ({
    original: col,
    mappedTo: identifyField(col),
  }));

  const seenPatrimonios = new Set<string>();
  let duplicateCount = 0;

  const items = rawRows.map((row, index) => {
    const warnings: string[] = [];
    const extraFields: Record<string, any> = {};

    let patrimonio = "";
    let descricao = "";
    let numero_serie = "";
    let conta_cliente: string | null = null;
    let local: string | null = null;
    let status: AssetStatus = "Em estoque";
    let conservacao: string | null = "Bom";
    let valor_aquisicao: number | null = null;
    let observacoes = "";

    // Iterate through row properties
    for (const [key, rawVal] of Object.entries(row)) {
      const val = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
      const field = identifyField(key);

      switch (field) {
        case "patrimonio":
          patrimonio = val;
          break;
        case "descricao":
          descricao = val;
          break;
        case "numero_serie":
          numero_serie = val;
          break;
        case "conta_cliente":
          conta_cliente = val || null;
          break;
        case "local":
          local = val || null;
          break;
        case "status":
          status = normalizeStatus(val);
          break;
        case "conservacao":
          conservacao = val || "Bom";
          break;
        case "valor_aquisicao":
          valor_aquisicao = parseCurrencyValue(val);
          break;
        case "observacoes":
          observacoes = val;
          break;
        case "extra":
        default:
          if (val) {
            extraFields[key] = val;
          }
          break;
      }
    }

    // Validation & Fallbacks
    if (!patrimonio) {
      patrimonio = `MRPAY-${String(index + 1).padStart(4, "0")}`;
      warnings.push("Patrimônio não informado na linha; gerado identificador automático.");
    }

    if (!descricao) {
      descricao = "Equipamento patrimonial";
      warnings.push("Descrição ausente; preenchida com valor padrão.");
    }

    if (!numero_serie) {
      numero_serie = `SN-${Date.now().toString().slice(-4)}-${index + 1}`;
      warnings.push("Número de série não informado; gerado S/N provisório.");
    }

    // Check duplicates in sheet
    if (seenPatrimonios.has(patrimonio.toUpperCase())) {
      duplicateCount++;
      warnings.push(`Patrimônio duplicado (${patrimonio}) detectado na planilha.`);
    } else {
      seenPatrimonios.add(patrimonio.toUpperCase());
    }

    // Append extra fields to observations so no data is lost
    let finalObservacoes = observacoes;
    const extraEntries = Object.entries(extraFields);
    if (extraEntries.length > 0) {
      const extraStr = extraEntries.map(([k, v]) => `${k}: ${v}`).join(" | ");
      finalObservacoes = finalObservacoes
        ? `${finalObservacoes} [Campos extras: ${extraStr}]`
        : `[Campos extras: ${extraStr}]`;
    }

    const asset: Omit<Asset, "id"> = {
      patrimonio,
      descricao,
      numero_serie,
      conta_cliente,
      local,
      status,
      conservacao,
      valor_aquisicao,
      observacoes: finalObservacoes || null,
    };

    return {
      asset,
      originalRow: row,
      warnings,
      extraFields,
    };
  });

  return {
    filename: file.name,
    totalRows: items.length,
    columnsFound,
    mappedColumns,
    items,
    duplicateCount,
  };
}

// Clean entire database
export async function cleanEntireDatabase(options: {
  user?: User | null;
  profile?: Profile | null;
}): Promise<{ success: boolean; message: string; count: number }> {
  const { user, profile } = options;

  if (!isSupabaseConfigured || !user) {
    // Local / Demo clean
    const current = getLocalAssets();
    const count = current.length;
    clearLocalAssets();

    await recordAssetAudit({
      patrimonio: "TODOS OS ATIVOS",
      action: "DELETE",
      user,
      profile,
      changes: { status: { old: "Base completa", new: "Base limpa (0 registros)" } },
      notes: `Limpeza total da base local executada com sucesso (${count} registros removidos).`,
    });

    return {
      success: true,
      message: `Base local limpa com sucesso. ${count} registros foram removidos.`,
      count,
    };
  }

  // Supabase clean
  try {
    // Delete all records from assets table
    const { count, error } = await supabase
      .from("assets")
      .delete({ count: "exact" })
      .not("id", "is", null);

    if (error) throw error;

    await recordAssetAudit({
      patrimonio: "BASE DE DADOS",
      action: "DELETE",
      user,
      profile,
      changes: { status: { old: "Base preenchida", new: "Base limpa" } },
      notes: `Limpeza completa da base de dados realizada no Supabase (${count ?? 0} registros excluídos).`,
    });

    return {
      success: true,
      message: `Base de dados limpa com sucesso. ${count ?? 0} registros removidos.`,
      count: count ?? 0,
    };
  } catch (error) {
    console.error("Error cleaning database:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Erro ao tentar limpar a base no banco de dados."
    );
  }
}

// Batch import assets
export async function importAssetsBatch(
  items: Omit<Asset, "id">[],
  options: {
    replaceAll: boolean;
    filename: string;
    user?: User | null;
    profile?: Profile | null;
  }
): Promise<{ success: boolean; importedCount: number; warnings: string[] }> {
  const { replaceAll, filename, user, profile } = options;
  const warnings: string[] = [];

  if (!isSupabaseConfigured || !user) {
    // Local storage mode
    let updated: Asset[] = [];
    if (replaceAll) {
      clearLocalAssets();
      updated = items.map((item, idx) => ({
        ...item,
        id: `imported-${Date.now()}-${idx}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    } else {
      const existing = getLocalAssets();
      const existingMap = new Map(existing.map((a) => [a.patrimonio.toUpperCase(), a]));
      items.forEach((item, idx) => {
        const key = item.patrimonio.toUpperCase();
        if (existingMap.has(key)) {
          const old = existingMap.get(key)!;
          existingMap.set(key, { ...old, ...item, updated_at: new Date().toISOString() });
        } else {
          existingMap.set(key, {
            ...item,
            id: `imported-${Date.now()}-${idx}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      });
      updated = Array.from(existingMap.values());
    }

    saveLocalAssets(updated);

    await recordAssetAudit({
      patrimonio: "IMPORTAÇÃO EXCEL",
      action: "CREATE",
      user,
      profile,
      changes: {
        patrimonio: { old: null, new: `${items.length} ativos importados` },
      },
      notes: `Importação de planilha "${filename}" em modo ${
        replaceAll ? "Substituição Total" : "Mesclagem / Atualização"
      } (${items.length} registros processados).`,
    });

    return {
      success: true,
      importedCount: items.length,
      warnings,
    };
  }

  // Supabase Mode
  try {
    if (replaceAll) {
      // Clear database first
      await supabase.from("assets").delete().not("id", "is", null);
    }

    // Insert in batches of 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("assets").upsert(batch, {
        onConflict: "patrimonio",
      });
      if (error) {
        console.error("Batch upsert error:", error);
        throw error;
      }
    }

    // Record audit log for import
    await recordAssetAudit({
      patrimonio: "IMPORTAÇÃO EXCEL",
      action: "CREATE",
      user,
      profile,
      changes: {
        patrimonio: { old: null, new: `${items.length} ativos importados` },
      },
      notes: `Importação do arquivo "${filename}" via Excel (${items.length} registros inseridos/atualizados). Modo: ${
        replaceAll ? "Substituição Total" : "Adição/Atualização"
      }.`,
    });

    return {
      success: true,
      importedCount: items.length,
      warnings,
    };
  } catch (error) {
    console.error("Failed to import assets to Supabase:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Ocorreu uma falha ao importar os dados para o Supabase."
    );
  }
}
