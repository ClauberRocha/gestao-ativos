import React, { useRef, useState } from "react";
import { ArrowDownToLine, FileSpreadsheet, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { parseAssetSpreadsheet, type ImportRow } from "@/lib/spreadsheet";

export default function AssetDataActions({ isAdmin, onImport, onExport, onClear }: { isAdmin: boolean; onImport: (rows: ImportRow[], fileName: string, extraHeaders: string[]) => Promise<void>; onExport: () => void; onClear: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ rows: ImportRow[]; fileName: string; extraHeaders: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);

  const inspectFile = async (file?: File) => {
    if (!file) return;
    try {
      setProcessing(true);
      const result = await parseAssetSpreadsheet(file);
      setPreview({ ...result, fileName: file.name });
    } catch (error) {
      toast.error("Não foi possível ler a planilha", { description: error instanceof Error ? error.message : "Verifique o arquivo." });
    } finally { setProcessing(false); }
  };

  const confirmImport = async () => {
    if (!preview) return;
    try { setProcessing(true); await onImport(preview.rows, preview.fileName, preview.extraHeaders); setPreview(null); } finally { setProcessing(false); }
  };

  return <div className="flex flex-wrap items-center gap-2">
    <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void inspectFile(event.target.files?.[0])} />
    <Button type="button" size="sm" variant="outline" disabled={!isAdmin || processing} onClick={() => inputRef.current?.click()} className="h-9 rounded-xl text-xs"><Upload className="mr-1.5 size-3.5" /> Importar Base Excel</Button>
    <Button type="button" size="sm" variant="outline" onClick={onExport} className="h-9 rounded-xl text-xs"><ArrowDownToLine className="mr-1.5 size-3.5" /> Exportar para Excel</Button>
    {isAdmin && <Button type="button" size="sm" variant="ghost" onClick={() => void onClear()} className="h-9 rounded-xl text-xs text-destructive hover:bg-red-50 hover:text-destructive"><X className="mr-1.5 size-3.5" /> Limpar Base Atual</Button>}
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Prévia da importação</DialogTitle><DialogDescription>{preview?.fileName} · {preview?.rows.length ?? 0} registros válidos. {preview?.extraHeaders.length ? `Campos extras: ${preview.extraHeaders.join(", ")}.` : "Nenhum campo extra detectado."}</DialogDescription></DialogHeader><div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void inspectFile(event.dataTransfer.files?.[0]); }} className={`max-h-72 overflow-auto rounded-xl border p-3 text-xs ${dragging ? "border-primary bg-primary/5" : "border-border"}`}><div className="mb-3 flex items-center gap-2 text-muted-foreground"><FileSpreadsheet className="size-4" /> Arraste outro arquivo aqui para substituir a prévia.</div><table className="w-full border-collapse"><thead><tr className="border-b text-left"><th className="p-2">Patrimônio</th><th className="p-2">Status</th><th className="p-2">Conservação</th><th className="p-2">Conta cliente</th><th className="p-2">Local</th></tr></thead><tbody>{preview?.rows.slice(0, 8).map((row) => <tr key={`${row.patrimonio}-${row.numero_serie}`} className="border-b border-border/50"><td className="p-2 font-mono">{row.patrimonio}</td><td className="p-2">{row.status}</td><td className="p-2">{row.conservacao}</td><td className="p-2">{row.conta_cliente}</td><td className="p-2">{row.local || "—"}</td></tr>)}</tbody></table></div><DialogFooter><Button type="button" variant="outline" onClick={() => setPreview(null)}>Cancelar</Button><Button type="button" disabled={processing} onClick={() => void confirmImport()}>{processing ? "Importando..." : "Confirmar importação"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
