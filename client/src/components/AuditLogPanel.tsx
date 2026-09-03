import React, { useMemo, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  asset_patrimonio: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  login: "Login",
  logout: "Logoff",
  create: "Inclusão",
  update: "Edição",
  delete: "Exclusão",
  import: "Importação",
  export: "Exportação",
  clear: "Limpeza",
};

function describeDetails(log: AuditLogEntry) {
  const details = log.details ?? {};
  if (log.action === "import") return `${details.imported_count ?? details.count ?? 0} registros importados`;
  if (log.action === "export") return `${details.count ?? 0} registros exportados`;
  if (log.action === "clear") return `${details.removed_count ?? 0} registros removidos`;
  if (log.action === "update") {
    const oldValue = details.old as Record<string, unknown> | undefined;
    const newValue = details.new as Record<string, unknown> | undefined;
    if (oldValue && newValue) {
      const fields = Object.keys(newValue).filter((key) => JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]));
      return fields.length
        ? fields.slice(0, 4).map((field) => `${field}: ${String(oldValue[field] ?? "—")} → ${String(newValue[field] ?? "—")}`).join("; ")
        : "Registro atualizado";
    }
  }
  return log.asset_patrimonio ? `Ativo ${log.asset_patrimonio}` : "Evento do sistema";
}

export default function AuditLogPanel({ logs, loading, onRefresh }: { logs: AuditLogEntry[]; loading: boolean; onRefresh: () => void }) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("Todos");
  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesAction = action === "Todos" || log.action === action;
      const matchesTerm = !term || (log.actor_email ?? "").toLowerCase().includes(term) || (log.asset_patrimonio ?? "").toLowerCase().includes(term);
      return matchesAction && matchesTerm;
    });
  }, [logs, query, action]);

  return <section id="logs" className="scroll-mt-24 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h1 className="text-2xl font-semibold tracking-tight">Logs do sistema</h1></div><p className="mt-1 text-sm text-muted-foreground">Acessos, importações, exportações e alterações patrimoniais, disponíveis apenas para administradores.</p></div>
      <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="rounded-xl"><RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} />Atualizar logs</Button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_10px_40px_-32px_rgba(15,23,42,0.55)]">
      <div className="grid gap-2 border-b border-border/70 p-4 sm:grid-cols-[minmax(0,1fr)_220px]"><Input aria-label="Buscar logs por usuário ou patrimônio" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar usuário ou patrimônio..." className="h-9 rounded-lg" /><Select value={action} onValueChange={setAction}><SelectTrigger aria-label="Filtrar logs por ação" className="h-9 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Todos">Todas as ações</SelectItem>{Object.entries(actionLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data e hora</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Ativo</TableHead><TableHead>Detalhes</TableHead><TableHead>Dispositivo / IP</TableHead></TableRow></TableHeader><TableBody>
        {loading ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">Carregando logs...</TableCell></TableRow> : filteredLogs.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">Nenhum evento encontrado.</TableCell></TableRow> : filteredLogs.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString("pt-BR")}</TableCell><TableCell><p className="max-w-48 truncate text-xs font-medium">{log.actor_email ?? "Usuário do sistema"}</p><p className="font-mono text-[10px] text-muted-foreground">{log.actor_id?.slice(0, 8) ?? "sem-id"}</p></TableCell><TableCell><Badge variant="outline" className="whitespace-nowrap text-[10px]">{actionLabels[log.action] ?? log.action}</Badge></TableCell><TableCell className="font-mono text-xs">{log.asset_patrimonio ?? "—"}</TableCell><TableCell className="min-w-56 text-xs text-muted-foreground">{describeDetails(log)}</TableCell><TableCell className="max-w-64 text-[10px] text-muted-foreground"><p className="line-clamp-2">{log.user_agent ?? "Dispositivo não informado"}</p><p className="mt-1 font-mono">IP: {log.ip_address ?? "não disponível"}</p></TableCell></TableRow>)}
      </TableBody></Table></div>
    </div>
  </section>;
}
