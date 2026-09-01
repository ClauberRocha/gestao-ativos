import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { parseExcelOrCsv, importAssetsBatch, type ParsedExcelResult } from "@/lib/excelImport";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import type { Profile } from "@/lib/supabase";

interface ImportExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onSuccess: () => void;
}

export default function ImportExcelDialog({
  open,
  onOpenChange,
  profile,
  onSuccess,
}: ImportExcelDialogProps) {
  const { user } = useSupabaseAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedExcelResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import mode
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [importing, setImporting] = useState(false);

  const handleReset = () => {
    setSelectedFile(null);
    setParsedData(null);
    setParseError(null);
    setParsing(false);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      setParseError("Formato de arquivo inválido. Por favor, envie uma planilha .xlsx, .xls ou arquivo .csv.");
      toast.error("Formato não suportado", {
        description: "Apenas arquivos Excel (.xlsx, .xls) ou CSV são permitidos.",
      });
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsing(true);

    try {
      const result = await parseExcelOrCsv(file);
      setParsedData(result);
      toast.success("Planilha processada com sucesso!", {
        description: `${result.totalRows} registros identificados e mapeados.`,
      });
    } catch (error) {
      console.error("Error parsing file:", error);
      const msg = error instanceof Error ? error.message : "Não foi possível ler o arquivo.";
      setParseError(msg);
      toast.error("Erro na leitura do arquivo", { description: msg });
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleExecuteImport = async () => {
    if (!parsedData || parsedData.items.length === 0) return;

    setImporting(true);
    try {
      const assetsToImport = parsedData.items.map((item) => item.asset);
      const res = await importAssetsBatch(assetsToImport, {
        replaceAll: importMode === "replace",
        filename: parsedData.filename,
        user,
        profile,
      });

      toast.success("Importação concluída com sucesso!", {
        description: `${res.importedCount} ativos foram gravados no sistema com auditoria.`,
      });

      handleReset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Falha na importação", {
        description:
          error instanceof Error
            ? error.message
            : "Verifique os dados da planilha e tente novamente.",
      });
    } finally {
      setImporting(false);
    }
  };

  const mappedCount = parsedData?.mappedColumns.filter((c) => c.mappedTo !== "extra").length ?? 0;
  const extraCount = parsedData?.mappedColumns.filter((c) => c.mappedTo === "extra").length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!importing) {
          if (!val) handleReset();
          onOpenChange(val);
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Importar Base Excel (.xlsx / .csv)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Substitua ou incremente o inventário com mapeamento inteligente e auditoria automática.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Upload Dropzone if no file or parsing */}
          {!parsedData ? (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer ${
                  dragOver
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-border/80 hover:border-emerald-500/60 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 shadow-sm">
                  {parsing ? (
                    <Loader2 className="size-7 animate-spin" />
                  ) : (
                    <UploadCloud className="size-7" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {parsing
                    ? "Lendo e mapeando planilha..."
                    : "Arraste e solte o arquivo aqui ou clique para selecionar"}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground max-w-md">
                  Suporte completo a arquivos Excel (<strong>.xlsx</strong>, <strong>.xls</strong>) e planilhas <strong>.csv</strong> delimitadas por vírgula ou ponto-e-vírgula.
                </p>

                <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <Sparkles className="size-3.5" />
                  Mapeamento automático de Patrimônio, Descrição, Série, Cliente, Status e campos adicionais
                </div>
              </div>

              {parseError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Erro na leitura do arquivo</p>
                    <p className="mt-0.5 leading-relaxed">{parseError}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Data Preview & Mode Configuration */
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{parsedData.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      <strong>{parsedData.totalRows}</strong> linhas encontradas ·{" "}
                      <strong>{mappedCount}</strong> colunas mapeadas
                      {extraCount > 0 && ` · ${extraCount} extras agrupadas em observações`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <RefreshCw className="size-3.5" /> Trocar arquivo
                </Button>
              </div>

              {/* Import Mode Options */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Modo de Importação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setImportMode("replace")}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      importMode === "replace"
                        ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                        : "border-border/80 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          Substituição Total (Recomendado)
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Limpa toda a base atual e insere exatamente os <strong>{parsedData.totalRows}</strong> ativos da planilha.
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="size-4 text-emerald-600 focus:ring-emerald-500 mt-1"
                      />
                    </div>
                  </div>

                  <div
                    onClick={() => setImportMode("merge")}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      importMode === "merge"
                        ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20"
                        : "border-border/80 hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800">
                          <ArrowRight className="size-3.5 text-slate-600" />
                          Mesclar / Adicionar
                        </span>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Atualiza ativos existentes pelo Patrimônio e insere novos registros sem apagar a base.
                        </p>
                      </div>
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "merge"}
                        onChange={() => setImportMode("merge")}
                        className="size-4 text-emerald-600 focus:ring-emerald-500 mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Mapped Columns Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Mapeamento Automático de Colunas
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    {mappedCount} reconhecidas
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl border border-border/70 bg-muted/20">
                  {parsedData.mappedColumns.map((col, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`text-[10px] py-0.5 px-2 rounded-md ${
                        col.mappedTo !== "extra"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {col.original} →{" "}
                      <strong className="ml-1">
                        {col.mappedTo !== "extra" ? col.mappedTo : "extra (observações)"}
                      </strong>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Table Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Pré-visualização dos Dados (Primeiros 8 registros)
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Exibindo {Math.min(8, parsedData.items.length)} de {parsedData.totalRows}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/80 bg-card">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border/80">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Patrimônio</th>
                        <th className="px-3 py-2.5">Descrição</th>
                        <th className="px-3 py-2.5">Nº de Série</th>
                        <th className="px-3 py-2.5">Cliente</th>
                        <th className="px-3 py-2.5">Local</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Conservação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {parsedData.items.slice(0, 8).map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="px-3 py-2 font-mono font-bold text-foreground">
                            {item.asset.patrimonio}
                          </td>
                          <td className="px-3 py-2 text-foreground truncate max-w-[200px]">
                            {item.asset.descricao}
                          </td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">
                            {item.asset.numero_serie}
                          </td>
                          <td className="px-3 py-2 text-foreground truncate max-w-[130px]">
                            {item.asset.conta_cliente || "—"}
                          </td>
                          <td className="px-3 py-2 text-foreground truncate max-w-[130px]">
                            {item.asset.local || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 rounded font-semibold border-border"
                            >
                              {item.asset.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.asset.conservacao || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 gap-2 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>

          {parsedData && (
            <Button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing}
              className="rounded-xl text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              {importing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Importando {parsedData.totalRows} ativos...
                </>
              ) : (
                <>
                  <FileUp className="size-3.5" />
                  Confirmar Importação de {parsedData.totalRows} Ativos
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
