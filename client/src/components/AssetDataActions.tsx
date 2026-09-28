import React, { useRef, useState } from "react";
import { ArrowDownToLine, FileSpreadsheet, Upload, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseAssetSpreadsheet, type ImportRow } from "@/lib/spreadsheet";

type ImportMode = "replace" | "append";
type DuplicateResult = { patrimonio: string[]; numero_serie: string[] };
type Preview = { rows: ImportRow[]; fileName: string; extraHeaders: string[]; mode: ImportMode; duplicates: DuplicateResult };

const emptyDuplicates: DuplicateResult = { patrimonio: [], numero_serie: [] };

type ReportEntry = { row: ImportRow; status: "Importado" | "Rejeitado"; reason: string };

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadImportReport(entries: ReportEntry[], sourceFile: string) {
  const headers = ["Resultado", "Motivo", "Patrimônio", "Descrição", "Número de série", "Conta Cliente", "Local", "Status", "Conservação", "Valor de aquisição", "Observações"];
  const lines = [headers, ...entries.map(({ row, status, reason }) => [status, reason, row.patrimonio, row.descricao, row.numero_serie, row.conta_cliente, row.local, row.status, row.conservacao, row.valor_aquisicao ?? "", row.observacoes])].map((line) => line.map(csvCell).join(";"));
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-importacao-${sourceFile.replace(/\.[^.]+$/, "")}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function AssetDataActions({ isAdmin, onImport, onBulkImport, validateImport, onExport }: { isAdmin: boolean; onImport: (rows: ImportRow[], fileName: string, extraHeaders: string[]) => Promise<void>; onBulkImport: (rows: ImportRow[], fileName: string) => Promise<void>; validateImport: (rows: ImportRow[]) => Promise<DuplicateResult>; onExport: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [requestedMode, setRequestedMode] = useState<ImportMode>("replace");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Preparando arquivo...");

  const inspectFile = async (file?: File, mode = requestedMode) => {
    if (!file) return;
    try {
      setProcessing(true);
      setProgress(10);
      setProgressLabel("Lendo arquivo...");
      const result = await parseAssetSpreadsheet(file);
      setProgress(45);
      setProgressLabel(mode === "append" ? "Validando duplicidades..." : "Preparando prévia...");
      const duplicates = mode === "append" ? await validateImport(result.rows) : emptyDuplicates;
      setProgress(100);
      setProgressLabel("Arquivo pronto para revisão...");
      setPreview({ ...result, fileName: file.name, mode, duplicates });
    } catch (error) {
      toast.error("Não foi possível ler a planilha", { description: error instanceof Error ? error.message : "Verifique o arquivo." });
    } finally { window.setTimeout(() => { setProcessing(false); setProgress(0); }, 250); }
  };

  const openPicker = (mode: ImportMode) => {
    setRequestedMode(mode);
    if (inputRef.current) {
      inputRef.current.accept = mode === "append" ? ".csv,text/csv" : ".xlsx,.xls,.csv";
      inputRef.current.value = "";
      inputRef.current.click();
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    try {
      setProcessing(true);
      setProgress(15); setProgressLabel("Validando dados...");
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      const rejectedRows = preview.mode === "append" ? preview.rows.filter((row) => preview.duplicates.patrimonio.includes(row.patrimonio) || preview.duplicates.numero_serie.includes(row.numero_serie)) : [];
      const acceptedRows = preview.mode === "append" ? preview.rows.filter((row) => !rejectedRows.includes(row)) : preview.rows;
      setProgress(70); setProgressLabel(preview.mode === "append" ? `Cadastrando ${acceptedRows.length} ativos...` : "Importando base...");
      if (preview.mode === "append" && acceptedRows.length > 0) await onBulkImport(acceptedRows, preview.fileName);
      if (preview.mode === "replace") await onImport(acceptedRows, preview.fileName, preview.extraHeaders);
      const reportEntries: ReportEntry[] = [
        ...acceptedRows.map((row) => ({ row, status: "Importado" as const, reason: "Cadastro concluído" })),
        ...rejectedRows.map((row) => ({ row, status: "Rejeitado" as const, reason: [preview.duplicates.patrimonio.includes(row.patrimonio) && "Patrimônio já cadastrado ou repetido no arquivo", preview.duplicates.numero_serie.includes(row.numero_serie) && "Número de série já cadastrado ou repetido no arquivo"].filter(Boolean).join("; ") })),
      ];
      downloadImportReport(reportEntries, preview.fileName);
      toast.success("Relatório de importação baixado", { description: `${acceptedRows.length} importados e ${rejectedRows.length} rejeitados.` });
      setProgress(100); setProgressLabel("Importação concluída");
      setPreview(null);
    } finally { window.setTimeout(() => { setProcessing(false); setProgress(0); }, 350); }
  };

  const duplicateCount = (preview?.duplicates.patrimonio.length ?? 0) + (preview?.duplicates.numero_serie.length ?? 0);
  return <div className="flex flex-wrap items-center gap-2">
    <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void inspectFile(event.target.files?.[0])} />
    {isAdmin && <><Button type="button" size="sm" variant="outline" disabled={processing} onClick={() => openPicker("replace")} className="h-9 rounded-xl text-xs"><Upload className="mr-1.5 size-3.5" /> Importar Base Excel</Button>
    <Button type="button" size="sm" variant="outline" disabled={processing} onClick={() => openPicker("append")} className="h-9 rounded-xl text-xs"><FileSpreadsheet className="mr-1.5 size-3.5" /> Importar ativos CSV</Button></>}
    <Button type="button" size="sm" variant="outline" onClick={onExport} className="h-9 rounded-xl text-xs"><ArrowDownToLine className="mr-1.5 size-3.5" /> Exportar para Excel</Button>
    {processing && <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-border bg-card p-4 shadow-xl" role="status" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium"><span>{progressLabel}</span><span className="font-mono text-muted-foreground">{progress}%</span></div><Progress value={progress} aria-label="Progresso da importação" /></div>}<Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{preview?.mode === "append" ? "Prévia do cadastro em massa" : "Prévia da importação"}</DialogTitle><DialogDescription>{preview?.fileName} · {preview?.rows.length ?? 0} registros válidos. {preview?.mode === "append" && duplicateCount ? `${duplicateCount} duplicidade(s) encontrada(s); as linhas serão rejeitadas e detalhadas no relatório.` : preview?.extraHeaders.length ? `Campos extras: ${preview.extraHeaders.join(", ")}.` : "Nenhum campo extra detectado."}</DialogDescription></DialogHeader><div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void inspectFile(event.dataTransfer.files?.[0], preview?.mode ?? requestedMode); }} className={`max-h-72 overflow-auto rounded-xl border p-3 text-xs ${dragging ? "border-primary bg-primary/5" : "border-border"}`}><div className="mb-3 flex items-center gap-2 text-muted-foreground"><FileSpreadsheet className="size-4" /> Arraste outro arquivo aqui para substituir a prévia.</div>{preview?.mode === "append" && duplicateCount > 0 && <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"><AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{preview.duplicates.patrimonio.length > 0 && <>Patrimônios duplicados: {preview.duplicates.patrimonio.join(", ")}. </>}{preview.duplicates.numero_serie.length > 0 && <>Números de série duplicados: {preview.duplicates.numero_serie.join(", ")}.</>}</span></div>}<table className="w-full border-collapse"><thead><tr className="border-b text-left"><th className="p-2">Patrimônio</th><th className="p-2">Número de série</th><th className="p-2">Status</th><th className="p-2">Conta cliente</th><th className="p-2">Local</th></tr></thead><tbody>{preview?.rows.slice(0, 8).map((row) => <tr key={`${row.patrimonio}-${row.numero_serie}`} className="border-b border-border/50"><td className={`p-2 font-mono ${preview.duplicates.patrimonio.includes(row.patrimonio) ? "font-semibold text-red-600" : ""}`}>{row.patrimonio}</td><td className={`p-2 font-mono ${preview.duplicates.numero_serie.includes(row.numero_serie) ? "font-semibold text-red-600" : ""}`}>{row.numero_serie}</td><td className="p-2">{row.status}</td><td className="p-2">{row.conta_cliente}</td><td className="p-2">{row.local || "—"}</td></tr>)}</tbody></table></div><DialogFooter><Button type="button" variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button type="button" disabled={processing || !preview?.rows.length} onClick={() => void confirmImport()}>{processing ? "Importando..." : preview?.mode === "append" ? "Cadastrar válidos e baixar relatório" : "Importar e baixar relatório"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
