import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  History,
  Info,
  Layers,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/DashboardLayout";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  FIELD_LABELS,
  exportAuditsToExcel,
  getAssetAudits,
  sampleAudits,
} from "@/lib/audit";
import { isSupabaseConfigured, type AuditAction, type AuditLog, type FieldChange, type Profile } from "@/lib/supabase";

const PAGE_SIZE = 8;

const actionBadges: Record<AuditAction, { label: string; class: string; icon: typeof PlusCircle }> = {
  CREATE: {
    label: "Criação",
    class: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: PlusCircle,
  },
  UPDATE: {
    label: "Atualização",
    class: "border-amber-200 bg-amber-50 text-amber-700",
    icon: RefreshCw,
  },
  DELETE: {
    label: "Exclusão",
    class: "border-rose-200 bg-rose-50 text-rose-700",
    icon: Trash2,
  },
};

function ActionBadge({ action }: { action: AuditAction }) {
  const meta = actionBadges[action] || actionBadges.UPDATE;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.class}`}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}

function DiffDialog({
  audit,
  open,
  onOpenChange,
}: {
  audit: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!audit) return null;

  const changesEntries = Object.entries(audit.changes || {});
  const formattedDate = new Date(audit.created_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-xl bg-slate-950 text-white">
                <History className="size-4" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Trilha de Auditoria #{audit.id.slice(-6)}
              </span>
            </div>
            <ActionBadge action={audit.action} />
          </div>
          <DialogTitle className="mt-2 text-lg tracking-tight">
            Alteração em <span className="font-mono text-primary">{audit.patrimonio}</span>
          </DialogTitle>
          <DialogDescription>
            Registrado em {formattedDate} por {audit.user_name || "Operador"} ({audit.user_email || "sem e-mail"}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="size-3.5" />
              <span className="font-semibold text-foreground">Motivo / Observação da Operação:</span>
            </div>
            <p className="mt-1 pl-5 text-muted-foreground">{audit.notes || "Nenhuma observação registrada."}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Campos Modificados ({changesEntries.length}):</p>
            {changesEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma alteração detalhada de campo.</p>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/70 overflow-hidden">
                {changesEntries.map(([field, change]) => (
                  <div key={field} className="grid grid-cols-3 gap-2 bg-card p-2.5 text-xs">
                    <div className="font-medium text-foreground">
                      {FIELD_LABELS[field] || field}
                    </div>
                    <div className="rounded bg-rose-50/80 px-2 py-1 font-mono text-[11px] text-rose-800 line-through">
                      {change.old === null || change.old === undefined || change.old === "" ? "— (vazio)" : String(change.old)}
                    </div>
                    <div className="rounded bg-emerald-50 px-2 py-1 font-mono text-[11px] font-semibold text-emerald-800">
                      {change.new === null || change.new === undefined || change.new === "" ? "— (removido)" : String(change.new)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditPage({ onExit }: { onExit?: () => void }) {
  const { user } = useSupabaseAuth();
  const [audits, setAudits] = useState<AuditLog[]>(sampleAudits);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "Todas">("Todas");
  const [page, setPage] = useState(1);
  const [selectedAudit, setSelectedAudit] = useState<AuditLog | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadAudits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssetAudits({
        action: actionFilter,
        query,
        user,
      });
      setAudits(data);
    } catch (error) {
      toast.error("Não foi possível carregar o log de auditoria", {
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
      });
    } finally {
      setLoading(false);
    }
  }, [actionFilter, query, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAudits(), 150);
    return () => window.clearTimeout(timer);
  }, [loadAudits]);

  const metrics = useMemo(() => {
    return {
      total: audits.length,
      updates: audits.filter((a) => a.action === "UPDATE").length,
      creates: audits.filter((a) => a.action === "CREATE").length,
      deletes: audits.filter((a) => a.action === "DELETE").length,
    };
  }, [audits]);

  const totalPages = Math.max(1, Math.ceil(audits.length / PAGE_SIZE));
  const paginatedAudits = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return audits.slice(start, start + PAGE_SIZE);
  }, [audits, page]);

  const handleExport = () => {
    setExporting(true);
    try {
      exportAuditsToExcel(audits, {
        filename: `Auditoria_Ativos_MR_PAY_${new Date().toISOString().slice(0, 10)}.xls`,
      });
      toast.success("Trilha de auditoria exportada com sucesso!", {
        description: `${audits.length} registros exportados para o Excel.`,
      });
    } catch {
      toast.error("Erro ao exportar planilha.");
    } finally {
      setExporting(false);
    }
  };

  const openDiff = (audit: AuditLog) => {
    setSelectedAudit(audit);
    setDiffOpen(true);
  };

  return (
    <DashboardLayout onOpenAuth={() => undefined} onExit={onExit}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <ClipboardList className="size-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Governança & Rastreabilidade
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Auditoria de Alterações
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Histórico cronológico e imutável de todas as criações, edições de custódia e baixas realizadas por operadores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || audits.length === 0}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold hover:bg-muted"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Exportar Trilha (Excel)
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total de Eventos</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metrics.total}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Ações registradas no sistema</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <History className="size-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Atualizações de Custódia</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-700">{metrics.updates}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Transferências e status</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <RefreshCw className="size-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Novos Cadastros</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-700">{metrics.creates}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Ativos integrados à base</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <PlusCircle className="size-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Exclusões / Baixas</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-rose-700">{metrics.deletes}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Ações restritas ao administrador</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
                <Trash2 className="size-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Table Section */}
        <section className="rounded-2xl border border-border/70 bg-card shadow-[0_12px_40px_-32px_rgba(15,23,42,0.5)]">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Buscar por patrimônio, operador ou observação..."
                  className="h-9 rounded-xl pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={actionFilter}
                  onValueChange={(val) => {
                    setActionFilter(val as AuditAction | "Todas");
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-40 rounded-xl text-xs">
                    <SelectValue placeholder="Tipo de Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_ACTIONS.map((act) => (
                      <SelectItem key={act} value={act} className="text-xs">
                        {act === "Todas" ? "Todas as ações" : AUDIT_ACTION_LABELS[act]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(query || actionFilter !== "Todas") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setActionFilter("Todas");
                      setPage(1);
                    }}
                    className="h-9 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="mr-1 size-3.5" /> Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-40">Data / Hora</TableHead>
                  <TableHead className="w-32">Ação</TableHead>
                  <TableHead className="w-36">Patrimônio</TableHead>
                  <TableHead className="w-56">Operador Responsável</TableHead>
                  <TableHead>Resumo das Alterações</TableHead>
                  <TableHead className="w-24 text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                      Carregando registros de auditoria...
                    </TableCell>
                  </TableRow>
                ) : paginatedAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <History className="size-6 text-muted-foreground/50" />
                        <p className="mt-2 text-xs font-semibold">Nenhum evento de auditoria encontrado</p>
                        <p className="text-[11px] text-muted-foreground">Ajuste os filtros de busca para visualizar os registros.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedAudits.map((audit) => {
                    const changesKeys = Object.keys(audit.changes || {});
                    const dateStr = new Date(audit.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const initials = audit.user_name?.slice(0, 2).toUpperCase() || "OP";

                    return (
                      <TableRow key={audit.id} className="group hover:bg-muted/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {dateStr}
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={audit.action} />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-semibold tracking-tight text-foreground">
                            {audit.patrimonio}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-6 border border-border/80">
                              <AvatarFallback className="bg-slate-900 text-[9px] font-bold text-white">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-foreground">{audit.user_name || "Operador"}</p>
                              <p className="truncate text-[10px] text-muted-foreground">{audit.user_email || "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            {changesKeys.length === 0 ? (
                              <span className="text-xs text-muted-foreground">{audit.notes || "—"}</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {changesKeys.slice(0, 3).map((k) => {
                                  const c = audit.changes?.[k];
                                  return (
                                    <span
                                      key={k}
                                      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                    >
                                      <span className="font-semibold text-foreground">{FIELD_LABELS[k] || k}:</span>
                                      <span>{c?.new ? String(c.new) : "—"}</span>
                                    </span>
                                  );
                                })}
                                {changesKeys.length > 3 && (
                                  <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    +{changesKeys.length - 3} mais
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDiff(audit)}
                            className="h-7 gap-1 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary/10"
                          >
                            <Eye className="size-3.5" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{audits.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, audits.length)}</span> de{" "}
              <span className="font-medium text-foreground">{audits.length}</span> eventos
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1 || loading}
                onClick={() => setPage((c) => Math.max(1, c - 1))}
                className="size-8 rounded-lg"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">
                Página {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
                className="size-8 rounded-lg"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <DiffDialog audit={selectedAudit} open={diffOpen} onOpenChange={setDiffOpen} />
    </DashboardLayout>
  );
}
