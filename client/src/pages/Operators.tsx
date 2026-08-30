import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit2,
  History,
  KeyRound,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
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
import { sampleAudits } from "@/lib/audit";
import {
  createOperator,
  getProfiles,
  sampleProfiles,
  updateProfileName,
  updateProfileRole,
} from "@/lib/operators";
import { isSupabaseConfigured, supabase, type Profile } from "@/lib/supabase";

const PAGE_SIZE = 8;

export default function OperatorsPage({ onExit }: { onExit?: () => void }) {
  const { user } = useSupabaseAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>(sampleProfiles);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Todos" | "admin" | "operador">("Todos");
  const [page, setPage] = useState(1);

  // Modals
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [targetProfile, setTargetProfile] = useState<Profile | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "operador">("operador");
  const [savingRole, setSavingRole] = useState(false);

  const [nameModalOpen, setNameModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newOperatorEmail, setNewOperatorEmail] = useState("");
  const [newOperatorRole, setNewOperatorRole] = useState<"admin" | "operador">("operador");
  const [creating, setCreating] = useState(false);

  const isAdmin = currentUserProfile?.role === "admin" || !user; // in demo or logged admin

  const loadCurrentProfile = useCallback(async () => {
    if (!user) {
      setCurrentUserProfile({ id: "demo-admin", full_name: "Administrador Demo", email: "admin@mrpay.com.br", role: "admin" });
      return;
    }
    const { data } = await supabase.from("profiles").select("id, full_name, email, role").eq("id", user.id).maybeSingle();
    setCurrentUserProfile((data as Profile | null) ?? { id: user.id, full_name: user.user_metadata?.full_name ?? null, email: user.email ?? null, role: "operador" });
  }, [user]);

  const loadOperatorsList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getProfiles({
        query,
        role: roleFilter,
        user,
      });
      setProfiles(list);
    } catch (error) {
      toast.error("Não foi possível carregar a lista de operadores", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, user]);

  useEffect(() => {
    void loadCurrentProfile();
  }, [loadCurrentProfile]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOperatorsList(), 150);
    return () => window.clearTimeout(timer);
  }, [loadOperatorsList]);

  // Activity counts from audit logs
  const activityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sampleAudits.forEach((audit) => {
      const emailKey = audit.user_email?.toLowerCase();
      const nameKey = audit.user_name?.toLowerCase();
      if (emailKey) counts[emailKey] = (counts[emailKey] || 0) + 1;
      if (nameKey) counts[nameKey] = (counts[nameKey] || 0) + 1;
    });
    return counts;
  }, []);

  const metrics = useMemo(() => {
    return {
      total: profiles.length,
      admins: profiles.filter((p) => p.role === "admin").length,
      operators: profiles.filter((p) => p.role === "operador").length,
    };
  }, [profiles]);

  const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE));
  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return profiles.slice(start, start + PAGE_SIZE);
  }, [profiles, page]);

  const openRoleChange = (p: Profile) => {
    setTargetProfile(p);
    setNewRole(p.role === "admin" ? "operador" : "admin");
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!targetProfile) return;

    // Safety check: Don't allow demoting if only 1 admin exists
    if (targetProfile.role === "admin" && newRole === "operador" && metrics.admins <= 1) {
      toast.error("Ação não permitida", {
        description: "O sistema deve possuir pelo menos um administrador ativo.",
      });
      return;
    }

    setSavingRole(true);
    try {
      await updateProfileRole(targetProfile.id, newRole, user);
      toast.success(`Perfil de ${targetProfile.full_name || "operador"} alterado!`, {
        description: `Novo nível de acesso: ${newRole === "admin" ? "Administrador" : "Operador"}.`,
      });
      setRoleModalOpen(false);
      await loadOperatorsList();
    } catch (error) {
      toast.error("Erro ao alterar perfil", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const openNameEdit = (p: Profile) => {
    setTargetProfile(p);
    setEditName(p.full_name || "");
    setNameModalOpen(true);
  };

  const handleSaveName = async () => {
    if (!targetProfile || !editName.trim()) return;
    setSavingName(true);
    try {
      await updateProfileName(targetProfile.id, editName.trim(), user);
      toast.success("Nome atualizado com sucesso");
      setNameModalOpen(false);
      await loadOperatorsList();
    } catch (error) {
      toast.error("Erro ao salvar nome", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOperatorEmail || !newOperatorName) return;

    setCreating(true);
    try {
      await createOperator({
        email: newOperatorEmail.trim(),
        full_name: newOperatorName.trim(),
        role: newOperatorRole,
      }, user);

      toast.success("Operador registrado!", {
        description: `${newOperatorName} foi adicionado à equipe com perfil ${newOperatorRole}.`,
      });
      setCreateModalOpen(false);
      setNewOperatorName("");
      setNewOperatorEmail("");
      setNewOperatorRole("operador");
      await loadOperatorsList();
    } catch (error) {
      toast.error("Erro ao registrar operador", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <DashboardLayout onOpenAuth={() => undefined} onExit={onExit}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                <Users className="size-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Administração & Acessos
              </p>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Gestão de Operadores
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Controle de usuários autorizados, atribuição de perfis administrativos e governança de permissões RLS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 rounded-xl text-xs font-semibold shadow-sm"
            >
              <UserPlus className="size-3.5" /> Adicionar Operador
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total de Operadores</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{metrics.total}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Usuários cadastrados na plataforma</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Users className="size-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Administradores</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-indigo-700">{metrics.admins}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Acesso irrestrito e exclusão</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <ShieldCheck className="size-4" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operadores de Campo</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-sky-700">{metrics.operators}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Edição cadastral e conferência</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <UserCheck className="size-4" />
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
                  placeholder="Buscar por nome ou e-mail corporativo..."
                  className="h-9 rounded-xl pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-40 rounded-xl text-xs">
                    <SelectValue placeholder="Filtrar Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos" className="text-xs">Todos os perfis</SelectItem>
                    <SelectItem value="admin" className="text-xs">Administradores</SelectItem>
                    <SelectItem value="operador" className="text-xs">Operadores</SelectItem>
                  </SelectContent>
                </Select>

                {(query || roleFilter !== "Todos") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setRoleFilter("Todos");
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
                  <TableHead className="w-64">Operador</TableHead>
                  <TableHead className="w-56">E-mail</TableHead>
                  <TableHead className="w-36">Perfil de Acesso</TableHead>
                  <TableHead className="w-40">Data de Cadastro</TableHead>
                  <TableHead className="w-32 text-center">Atividades</TableHead>
                  <TableHead className="w-44 text-right">Ações Administrativas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-xs text-muted-foreground">
                      Carregando lista de operadores...
                    </TableCell>
                  </TableRow>
                ) : paginatedProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="size-6 text-muted-foreground/50" />
                        <p className="mt-2 text-xs font-semibold">Nenhum operador encontrado</p>
                        <p className="text-[11px] text-muted-foreground">Ajuste os filtros ou adicione um novo operador.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProfiles.map((p) => {
                    const initials = p.full_name?.slice(0, 2).toUpperCase() || p.email?.slice(0, 2).toUpperCase() || "OP";
                    const isTargetAdmin = p.role === "admin";
                    const activity = activityCounts[p.email?.toLowerCase() || ""] || activityCounts[p.full_name?.toLowerCase() || ""] || 0;
                    const dateStr = p.created_at
                      ? new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "—";

                    return (
                      <TableRow key={p.id} className="group hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-border/80">
                              <AvatarFallback className={isTargetAdmin ? "bg-indigo-950 font-bold text-white text-xs" : "bg-slate-800 font-bold text-white text-xs"}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{p.full_name || "Sem nome cadastrado"}</p>
                              <p className="text-[10px] text-muted-foreground">ID · {p.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{p.email || "—"}</span>
                        </TableCell>
                        <TableCell>
                          {isTargetAdmin ? (
                            <Badge variant="outline" className="gap-1.5 rounded-md border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              <ShieldCheck className="size-3 text-indigo-600" /> Administrador
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1.5 rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              <UserRound className="size-3 text-slate-600" /> Operador
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {dateStr}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                            {activity} {activity === 1 ? "ação" : "ações"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openNameEdit(p)}
                              className="h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                              title="Editar nome"
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRoleChange(p)}
                              className={`h-8 rounded-xl px-2.5 text-xs font-semibold ${
                                isTargetAdmin
                                  ? "border-amber-200 bg-amber-50/70 text-amber-800 hover:bg-amber-100"
                                  : "border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100"
                              }`}
                            >
                              {isTargetAdmin ? "Rebaixar para Operador" : "Promover a Admin"}
                            </Button>
                          </div>
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
              Exibindo <span className="font-medium text-foreground">{profiles.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, profiles.length)}</span> de{" "}
              <span className="font-medium text-foreground">{profiles.length}</span> operadores
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

      {/* Role Change Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <ShieldAlert className="size-5" />
            </div>
            <DialogTitle className="text-lg tracking-tight">
              {newRole === "admin" ? "Promover a Administrador" : "Rebaixar para Operador"}
            </DialogTitle>
            <DialogDescription>
              Você está alterando o perfil de acesso de <strong>{targetProfile?.full_name || targetProfile?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs leading-5 text-muted-foreground">
            {newRole === "admin" ? (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 text-indigo-900">
                <p className="font-semibold text-indigo-950">Permissões de Administrador:</p>
                <ul className="mt-1.5 list-disc pl-4 space-y-1">
                  <li>Visualização dos valores de aquisição financeira dos ativos.</li>
                  <li>Permissão para exclusão definitiva de registros patrimoniais.</li>
                  <li>Gestão completa de outros operadores e logs de auditoria.</li>
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-amber-900">
                <p className="font-semibold text-amber-950">Restrições de Operador:</p>
                <ul className="mt-1.5 list-disc pl-4 space-y-1">
                  <li>Não terá acesso a valores de aquisição financeira.</li>
                  <li>Não poderá excluir ativos do sistema (apenas atualizar status e custódia).</li>
                  <li>Não poderá gerenciar perfis de outros operadores.</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-between border-t border-border/60 pt-3">
            <Button variant="outline" onClick={() => setRoleModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSaveRole()}
              disabled={savingRole}
              className={`rounded-xl ${newRole === "admin" ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
            >
              {savingRole ? "Atualizando..." : `Confirmar para ${newRole === "admin" ? "Administrador" : "Operador"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Modal */}
      <Dialog open={nameModalOpen} onOpenChange={setNameModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Editar Nome do Operador</DialogTitle>
            <DialogDescription>
              Atualize a identificação exibida nos relatórios e trilha de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="opName">Nome completo</Label>
              <Input
                id="opName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Marina Ribeiro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNameModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveName()} disabled={savingName || !editName.trim()} className="rounded-xl">
              {savingName ? "Salvando..." : "Salvar Nome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Operator Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <UserPlus className="size-5" />
            </div>
            <DialogTitle className="text-lg tracking-tight">Adicionar Operador</DialogTitle>
            <DialogDescription>
              Cadastre um novo membro para a equipe com acesso operacional ou administrativo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOperator} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newOpName">Nome Completo</Label>
              <Input
                id="newOpName"
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                placeholder="Ex: Fernando Souza"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newOpEmail">E-mail Corporativo</Label>
              <Input
                id="newOpEmail"
                type="email"
                value={newOperatorEmail}
                onChange={(e) => setNewOperatorEmail(e.target.value)}
                placeholder="fernando.souza@mrpay.com.br"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newOpRole">Perfil Inicial</Label>
              <Select value={newOperatorRole} onValueChange={(val) => setNewOperatorRole(val as any)}>
                <SelectTrigger id="newOpRole" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operador">Operador (Acesso padrão)</SelectItem>
                  <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="border-t border-border/60 pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={creating || !newOperatorName || !newOperatorEmail} className="rounded-xl">
                {creating ? "Registrando..." : "Cadastrar Operador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
