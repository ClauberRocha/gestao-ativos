import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  MapPin,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ASSET_STATUSES, formatCurrency, sampleAssets, searchAssets } from "@/lib/assets";
import {
  calculateAssetDiff,
  getAssetAudits,
  recordAssetAudit,
  FIELD_LABELS,
} from "@/lib/audit";
import { isSupabaseConfigured, supabase, type Asset, type AssetStatus, type AuditLog, type Profile } from "@/lib/supabase";
import { exportAssetsToExcel, exportAssetSheetPDF } from "@/lib/exportUtils";

const PAGE_SIZE = 8;
type StatusFilter = AssetStatus | "Todos";
type AssetFormData = Omit<Asset, "id" | "created_at" | "updated_at">;

const statusStyles: Record<AssetStatus, string> = {
  Ativo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Em estoque": "border-amber-200 bg-amber-50 text-amber-700",
  Entregue: "border-sky-200 bg-sky-50 text-sky-700",
  Defeito: "border-red-200 bg-red-50 text-red-700",
};

const emptyForm: AssetFormData = {
  patrimonio: "",
  descricao: "",
  numero_serie: "",
  conta_cliente: "",
  local: "",
  status: "Em estoque",
  conservacao: "Novo",
  valor_aquisicao: null,
  observacoes: "",
};

function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge variant="outline" className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${statusStyles[status]}`}>
      <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { signIn, signUp } = useSupabaseAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        toast.success("Sessão iniciada", { description: "Inventário protegido carregado." });
      } else {
        await signUp(email, password, fullName);
        toast.success("Conta criada", { description: "Confirme seu e-mail se essa opção estiver ativa no Supabase." });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("Não foi possível concluir", {
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[430px]">
        <DialogHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <LockKeyhole className="size-4" />
          </div>
          <DialogTitle className="text-xl tracking-tight">
            {mode === "login" ? "Acessar o inventário" : "Criar acesso operacional"}
          </DialogTitle>
          <DialogDescription>
            {mode === "login"
              ? "Entre com suas credenciais do Supabase para consultar os ativos protegidos por RLS."
              : "O cadastro cria um perfil operador. Administradores podem promover usuários no banco."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pt-2">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Marina Ribeiro"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail corporativo</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com.br"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Processando..." : mode === "login" ? "Entrar com Supabase" : "Criar conta"}
            </Button>
          </DialogFooter>
        </form>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="text-center text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {mode === "login" ? "Ainda não tenho acesso" : "Já tenho uma conta"}
        </button>
      </DialogContent>
    </Dialog>
  );
}

function AssetForm({
  asset,
  form,
  setForm,
  isNew,
  isAdmin,
  saving,
  onSave,
  onDelete,
  onClose,
  demoMode,
}: {
  asset: Asset | null;
  form: AssetFormData;
  setForm: (form: AssetFormData) => void;
  isNew: boolean;
  isAdmin: boolean;
  saving: boolean;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
  demoMode: boolean;
}) {
  const { user } = useSupabaseAuth();
  const [activeTab, setActiveTab] = useState<"form" | "history">("form");
  const [assetAudits, setAssetAudits] = useState<AuditLog[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  const setField = <K extends keyof AssetFormData>(field: K, value: AssetFormData[K]) =>
    setForm({ ...form, [field]: value });

  useEffect(() => {
    if (asset?.id || asset?.patrimonio) {
      setLoadingAudits(true);
      getAssetAudits({
        assetId: asset.id,
        patrimonio: asset.patrimonio,
        user,
      })
        .then((res) => setAssetAudits(res))
        .finally(() => setLoadingAudits(false));
    } else {
      setAssetAudits([]);
    }
  }, [asset, user]);

  const handleExportPDF = () => {
    exportAssetSheetPDF(
      {
        id: asset?.id,
        patrimonio: form.patrimonio || "SEM PATRIMÔNIO",
        descricao: form.descricao || "Sem descrição",
        numero_serie: form.numero_serie || "S/N",
        conta_cliente: form.conta_cliente,
        local: form.local,
        status: form.status,
        conservacao: form.conservacao,
        valor_aquisicao: form.valor_aquisicao,
        observacoes: form.observacoes,
      },
      { isAdmin }
    );
    toast.success("Ficha do Ativo gerada para PDF / Impressão", {
      description: `A ficha de ${form.patrimonio || "ativo"} foi aberta para impressão e download.`,
    });
  };

  return (
    <SheetContent side="right" className="w-full gap-0 overflow-y-auto border-l border-border/70 p-0 sm:max-w-[540px]">
      <SheetHeader className="border-b border-border/70 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Boxes className="size-4" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {isNew ? "Novo cadastro" : "Registro do ativo"}
            </span>
          </div>
          {!isNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-8 gap-1.5 rounded-xl border-rose-200 bg-rose-50/60 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            >
              <FileText className="size-3.5 text-rose-600" /> Exportar PDF
            </Button>
          )}
        </div>
        <SheetTitle className="mt-2 text-xl tracking-tight">{isNew ? "Adicionar ativo" : asset?.patrimonio}</SheetTitle>
        <SheetDescription>
          {isNew
            ? "Cadastre o hardware e deixe a custódia pronta para acompanhamento."
            : "Revise os dados de identificação, localização, histórico e gere a ficha técnica em PDF."}
        </SheetDescription>

        {!isNew && (
          <div className="pt-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="form" className="rounded-lg text-xs font-semibold">
                  Dados Cadastrais
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-xs font-semibold gap-1.5">
                  <History className="size-3.5" />
                  Histórico ({assetAudits.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </SheetHeader>

      {activeTab === "form" ? (
        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="patrimonio">Patrimônio</Label>
              <Input
                id="patrimonio"
                value={form.patrimonio}
                onChange={(event) => setField("patrimonio", event.target.value)}
                placeholder="MR PAY 0001"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(event) => setField("descricao", event.target.value)}
                placeholder="PIN PAD Ingenico Lane/3000"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="numero_serie">Número de série</Label>
              <Input
                id="numero_serie"
                value={form.numero_serie}
                onChange={(event) => setField("numero_serie", event.target.value)}
                placeholder="7200032211011635"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(value) => setField("status", value as AssetStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conservacao">Conservação</Label>
              <Input
                id="conservacao"
                value={form.conservacao ?? ""}
                onChange={(event) => setField("conservacao", event.target.value)}
                placeholder="Bom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conta_cliente">Conta cliente</Label>
              <Input
                id="conta_cliente"
                value={form.conta_cliente ?? ""}
                onChange={(event) => setField("conta_cliente", event.target.value)}
                placeholder="SEFAZ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input
                id="local"
                value={form.local ?? ""}
                onChange={(event) => setField("local", event.target.value)}
                placeholder="São Paulo / SP"
              />
            </div>
            {isAdmin && (
              <div className="col-span-2 space-y-2">
                <Label htmlFor="valor_aquisicao">
                  Valor de aquisição <span className="text-[10px] font-normal text-muted-foreground">(somente admin)</span>
                </Label>
                <Input
                  id="valor_aquisicao"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_aquisicao ?? ""}
                  onChange={(event) =>
                    setField("valor_aquisicao", event.target.value === "" ? null : Number(event.target.value))
                  }
                  placeholder="0,00"
                />
              </div>
            )}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={form.observacoes ?? ""}
                onChange={(event) => setField("observacoes", event.target.value)}
                placeholder="Notas de conferência, RMA ou transferência..."
                className="flex min-h-28 w-full resize-y rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          {demoMode && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <p>Os dados exibidos são de demonstração. Execute a migration no Supabase para habilitar gravações reais.</p>
            </div>
          )}
          <Separator />
          <div className="flex items-start gap-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <p>
              Operadores podem editar dados operacionais e gerar a ficha técnica em PDF. O valor de aquisição permanece restrito aos administradores.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Linha do Tempo de Custódia</p>
            <span className="text-[11px] text-muted-foreground">{assetAudits.length} registros</span>
          </div>

          {loadingAudits ? (
            <p className="text-center text-xs text-muted-foreground py-8">Carregando histórico...</p>
          ) : assetAudits.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-6 text-center">
              <History className="mx-auto size-6 text-muted-foreground/50" />
              <p className="mt-2 text-xs font-semibold">Nenhum evento registrado ainda</p>
              <p className="text-[11px] text-muted-foreground">As alterações salvas aparecerão nesta linha do tempo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assetAudits.map((item) => {
                const dateStr = new Date(item.created_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const changes = Object.entries(item.changes || {});

                return (
                  <div key={item.id} className="rounded-xl border border-border/70 bg-card p-3 shadow-sm text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <span className="size-2 rounded-full bg-primary" />
                        {item.action === "CREATE" ? "Cadastrado" : item.action === "DELETE" ? "Excluído" : "Modificado"} por{" "}
                        <span className="text-primary">{item.user_name || "Operador"}</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">{dateStr}</span>
                    </div>

                    {item.notes && <p className="mt-1.5 text-[11px] text-muted-foreground italic">"{item.notes}"</p>}

                    {changes.length > 0 && (
                      <div className="mt-2.5 space-y-1 border-t border-border/50 pt-2">
                        {changes.map(([k, c]) => (
                          <div key={k} className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">{FIELD_LABELS[k] || k}:</span>
                            <span className="font-medium text-foreground">
                              {c.old ? `${c.old} ➔ ` : ""}
                              <span className="font-semibold text-primary">{c.new || "—"}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <SheetFooter className="border-t border-border/70 bg-muted/20 px-6 py-4">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isNew && isAdmin && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:bg-red-50 hover:text-destructive"
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Excluir
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPDF}
              className="rounded-xl border-border/80 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              <FileText className="mr-1.5 size-3.5 text-rose-600" />
              Ficha em PDF
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {demoMode ? (
              <Button type="button" onClick={onClose} variant="outline" className="rounded-xl">
                Fechar
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onSave}
                disabled={saving || !form.patrimonio || !form.descricao || !form.numero_serie}
                className="min-w-28 rounded-xl"
              >
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                {isNew ? "Cadastrar ativo" : "Salvar alterações"}
              </Button>
            )}
          </div>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}

function TableLoading() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-4 w-16" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Boxes;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
        </div>
        <div className={`flex size-9 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export default function Home({ onExit }: { onExit?: () => void }) {
  const { user, loading: authLoading } = useSupabaseAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assets, setAssets] = useState<Asset[]>(sampleAssets.slice(0, PAGE_SIZE));
  const [total, setTotal] = useState(sampleAssets.length);
  const [metrics, setMetrics] = useState({ total: sampleAssets.length, stock: 3, clients: 7, defects: 2 });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("Todos");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isAdmin = profile?.role === "admin";

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("id, full_name, role").eq("id", user.id).maybeSingle();
    setProfile((data as Profile | null) ?? { id: user.id, full_name: user.user_metadata?.full_name ?? null, role: "operador" });
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    if (!user || !isSupabaseConfigured) {
      const filtered = searchAssets(sampleAssets, query, status);
      setTotal(filtered.length);
      setAssets(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
      setMetrics({
        total: sampleAssets.length,
        stock: sampleAssets.filter((asset) => asset.status === "Em estoque").length,
        clients: sampleAssets.filter((asset) => asset.status === "Ativo" || asset.status === "Entregue").length,
        defects: sampleAssets.filter((asset) => asset.status === "Defeito").length,
      });
      setUsingDemoData(true);
      setLoading(false);
      return;
    }
    try {
      let request = supabase.from("assets_inventory").select("*", { count: "exact" }).order("updated_at", { ascending: false });
      if (status !== "Todos") request = request.eq("status", status);
      if (query.trim()) {
        const safeQuery = query.trim().replace(/[%,()]/g, "");
        request = request.or(`patrimonio.ilike.%${safeQuery}%,numero_serie.ilike.%${safeQuery}%`);
      }
      const from = (page - 1) * PAGE_SIZE;
      const [{ data, error, count }, summary] = await Promise.all([
        request.range(from, from + PAGE_SIZE - 1),
        supabase.from("assets_inventory").select("status"),
      ]);
      if (error) throw error;
      if (summary.error) throw summary.error;
      const summaryRows = (summary.data ?? []) as Array<{ status: AssetStatus }>;
      setAssets((data ?? []) as Asset[]);
      setTotal(count ?? 0);
      setMetrics({
        total: summaryRows.length,
        stock: summaryRows.filter((row) => row.status === "Em estoque").length,
        clients: summaryRows.filter((row) => row.status === "Ativo" || row.status === "Entregue").length,
        defects: summaryRows.filter((row) => row.status === "Defeito").length,
      });
      setUsingDemoData(false);
    } catch (error) {
      const filtered = searchAssets(sampleAssets, query, status);
      setTotal(filtered.length);
      setAssets(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
      setUsingDemoData(true);
      setConnectionError(error instanceof Error ? error.message : "A tabela ainda não está disponível.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAssets(), 180);
    return () => window.clearTimeout(timer);
  }, [loadAssets]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visibleRangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const visibleRangeEnd = Math.min(page * PAGE_SIZE, total);
  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };
  const updateStatus = (value: StatusFilter) => {
    setStatus(value);
    setPage(1);
  };
  const resetFilters = () => {
    setQuery("");
    setStatus("Todos");
    setPage(1);
  };
  const openNewAsset = () => {
    if (!user) {
      setAuthOpen(true);
      toast.info("Entre para cadastrar um ativo");
      return;
    }
    setEditingAsset(null);
    setForm(emptyForm);
    setSheetOpen(true);
  };
  const openAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setForm({
      patrimonio: asset.patrimonio,
      descricao: asset.descricao,
      numero_serie: asset.numero_serie,
      conta_cliente: asset.conta_cliente ?? "",
      local: asset.local ?? "",
      status: asset.status,
      conservacao: asset.conservacao ?? "",
      valor_aquisicao: asset.valor_aquisicao ?? null,
      observacoes: asset.observacoes ?? "",
    });
    setSheetOpen(true);
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      let dataToExport: Asset[] = [];
      if (!user || !isSupabaseConfigured || usingDemoData) {
        dataToExport = searchAssets(sampleAssets, query, status);
      } else {
        let request = supabase.from("assets_inventory").select("*").order("patrimonio", { ascending: true });
        if (status !== "Todos") request = request.eq("status", status);
        if (query.trim()) {
          const safeQuery = query.trim().replace(/[%,()]/g, "");
          request = request.or(`patrimonio.ilike.%${safeQuery}%,numero_serie.ilike.%${safeQuery}%`);
        }
        const { data, error } = await request;
        if (error) throw error;
        dataToExport = (data as Asset[]) || [];
      }

      if (dataToExport.length === 0) {
        toast.warning("Nenhum ativo encontrado para exportação", {
          description: "Ajuste os filtros ou realize uma busca diferente.",
        });
        return;
      }

      const filterLabel =
        status === "Todos"
          ? query
            ? `Busca: "${query}"`
            : "Todos os status"
          : `Status: ${status}${query ? ` | Busca: "${query}"` : ""}`;

      exportAssetsToExcel(dataToExport, {
        isAdmin,
        filterLabel,
        filename: `Inventario_Ativos_MR_PAY_${new Date().toISOString().slice(0, 10)}.xls`,
      });

      toast.success("Planilha Excel exportada com sucesso!", {
        description: `${dataToExport.length} ativos salvos no arquivo Excel.`,
      });
    } catch (error) {
      toast.error("Erro ao exportar planilha Excel", {
        description: error instanceof Error ? error.message : "Tente novamente.",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  const saveAsset = async () => {
    if (!user && !usingDemoData) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        conta_cliente: form.conta_cliente || null,
        local: form.local || null,
        conservacao: form.conservacao || null,
        observacoes: form.observacoes || null,
        valor_aquisicao: isAdmin ? form.valor_aquisicao : undefined,
      };

      if (!usingDemoData && user) {
        const result = editingAsset
          ? await supabase.from("assets").update(payload).eq("id", editingAsset.id)
          : await supabase.from("assets").insert(payload);
        if (result.error) throw result.error;
      }

      // Record audit log
      if (editingAsset) {
        const diff = calculateAssetDiff(editingAsset, form);
        await recordAssetAudit({
          assetId: editingAsset.id,
          patrimonio: form.patrimonio,
          action: "UPDATE",
          user,
          profile,
          changes: diff,
          notes: form.observacoes || "Atualização de dados cadastrais",
        });
      } else {
        const diff = calculateAssetDiff(null, form);
        await recordAssetAudit({
          patrimonio: form.patrimonio,
          action: "CREATE",
          user,
          profile,
          changes: diff,
          notes: form.observacoes || "Cadastro inicial do ativo",
        });
      }

      toast.success(editingAsset ? "Ativo atualizado" : "Ativo cadastrado", {
        description: `${form.patrimonio} foi salvo no inventário e registrado na auditoria.`,
      });
      setSheetOpen(false);
      await loadAssets();
    } catch (error) {
      toast.error("Não foi possível salvar", {
        description: error instanceof Error ? error.message : "Verifique os campos e tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteAsset = async () => {
    if (!editingAsset || !isAdmin) return;
    if (!window.confirm(`Excluir o ativo ${editingAsset.patrimonio}?`)) return;

    if (!usingDemoData && user) {
      const { error } = await supabase.from("assets").delete().eq("id", editingAsset.id);
      if (error) {
        toast.error("Exclusão não permitida", { description: error.message });
        return;
      }
    }

    await recordAssetAudit({
      assetId: editingAsset.id,
      patrimonio: editingAsset.patrimonio,
      action: "DELETE",
      user,
      profile,
      changes: { status: { old: editingAsset.status, new: "Excluído" } },
      notes: "Exclusão definitiva de ativo pelo administrador",
    });

    toast.success("Ativo excluído e registrado na trilha de auditoria");
    setSheetOpen(false);
    await loadAssets();
  };

  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location === "/inventario") {
      const el = document.getElementById("inventario-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else if (location === "/visao-geral" || location === "/") {
      const el = document.getElementById("visao-geral-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location]);

  return (
    <DashboardLayout onOpenAuth={() => setAuthOpen(true)} onExit={onExit}>
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section id="visao-geral-section" className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-950 px-6 py-7 text-white shadow-[0_18px_55px_-28px_rgba(15,23,42,0.6)] sm:px-8 sm:py-8">
          <div className="absolute -right-20 -top-28 size-80 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[38%] size-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Sparkles className="size-3 text-cyan-300" /> MR Pay · Asset command center
              </div>
              <h1 className="max-w-xl text-3xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-4xl">
                Controle patrimonial sem pontos cegos.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                Localize cada Totem, Pin Pad e Desktop com uma operação preparada para conferência, transferência e atendimento.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-white/10 pt-5 sm:flex sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Ativos monitorados</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{metrics.total}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Em operação</p>
                <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">{metrics.clients}</p>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="size-1.5 rounded-full bg-emerald-400" /> {usingDemoData ? "Demonstração local" : "Sincronizado com Supabase"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total de ativos" value={metrics.total} detail="Base patrimonial" icon={Boxes} tone="bg-indigo-50 text-indigo-700" />
          <KpiCard label="Em estoque" value={metrics.stock} detail="Disponíveis para alocação" icon={PackageCheck} tone="bg-amber-50 text-amber-700" />
          <KpiCard label="Em clientes" value={metrics.clients} detail="Ativos ou entregues" icon={Users} tone="bg-emerald-50 text-emerald-700" />
          <KpiCard label="Com defeito" value={metrics.defects} detail="Aguardando tratativa" icon={CircleAlert} tone="bg-red-50 text-red-700" />
        </section>

        <section id="inventario-section" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between scroll-mt-24">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Inventário</h2>
              <Badge variant="secondary" className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {total} registros
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Consulte patrimônio ou número de série em uma única busca e exporte relatórios.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/auditoria")}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <History className="size-3.5 text-indigo-600" /> Auditoria
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/operadores")}
              className="h-9 gap-1.5 rounded-xl border-border/80 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Users className="size-3.5 text-sky-600" /> Operadores
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={exportingExcel || total === 0}
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-emerald-300/80 bg-emerald-50/60 px-3 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-100 hover:text-emerald-900"
            >
              {exportingExcel ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-700" />
              )}
              Exportar Excel
            </Button>
            <Button onClick={openNewAsset} size="sm" className="h-9 rounded-xl px-3 text-xs shadow-sm">
              <Plus className="mr-1.5 size-3.5" /> Novo ativo
            </Button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_10px_40px_-32px_rgba(15,23,42,0.55)]">
          <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="relative min-w-0 flex-1 sm:max-w-[480px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="asset-search-input"
                aria-label="Buscar por patrimônio ou número de série"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Buscar patrimônio ou número de série..."
                className="h-10 rounded-xl border-border/80 bg-muted/35 pl-9 pr-9 text-sm shadow-none focus-visible:bg-background"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateQuery("")}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
                <SlidersHorizontal className="size-3.5" /> Filtrar por
              </div>
              <Select value={status} onValueChange={(value) => updateStatus(value as StatusFilter)}>
                <SelectTrigger aria-label="Filtrar por status" className="h-10 w-full rounded-xl bg-muted/35 text-xs sm:w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os status</SelectItem>
                  {ASSET_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {connectionError && (
            <div className="flex flex-col gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong>Modo demonstração:</strong> a tabela Supabase não respondeu. Execute{" "}
                <code className="rounded bg-amber-100 px-1">supabase/schema.sql</code> no SQL Editor para carregar os dados reais.
              </span>
              <button type="button" onClick={() => setConnectionError(null)} className="font-semibold underline underline-offset-2">
                Ocultar
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[152px]">Patrimônio</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente / local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conservação</TableHead>
                  <TableHead>Número de série</TableHead>
                  <TableHead className="text-right">Aquisição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableLoading />
                ) : assets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-muted">
                          <Search className="size-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-semibold">Nenhum ativo encontrado</p>
                        <p className="mt-1 text-xs text-muted-foreground">Ajuste os termos de busca ou limpe os filtros.</p>
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 text-xs">
                          Limpar filtros
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  assets.map((asset) => (
                    <TableRow
                      key={asset.id}
                      className="group cursor-pointer"
                      tabIndex={0}
                      onClick={() => openAsset(asset)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") openAsset(asset);
                      }}
                    >
                      <TableCell>
                        <span className="font-mono text-xs font-semibold tracking-tight text-foreground">{asset.patrimonio}</span>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[220px]">
                          <p className="truncate text-sm font-medium">{asset.descricao}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">ID · {asset.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold">{asset.conta_cliente || "—"}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="size-3" /> {asset.local || "Local não informado"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={asset.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{asset.conservacao || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-[11px] text-muted-foreground">{asset.numero_serie}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs font-medium text-muted-foreground">
                          {isAdmin ? formatCurrency(asset.valor_aquisicao) : "••••••"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{visibleRangeStart}–{visibleRangeEnd}</span> de{" "}
              <span className="font-medium text-foreground">{total}</span> ativos
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                aria-label="Página anterior"
                disabled={page === 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="size-8 rounded-lg bg-background"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <span className="min-w-16 text-center text-xs font-medium text-muted-foreground">
                Página {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Próxima página"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="size-8 rounded-lg bg-background"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-sm font-semibold">RLS por perfil</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Operadores consultam e atualizam. Exclusões ficam restritas ao admin.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <Search className="size-4 text-indigo-700" />
            </div>
            <p className="text-sm font-semibold">Busca operacional</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Patrimônio e série são priorizados para uma conferência em segundos.</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <ArrowDownToLine className="size-4" />
            </div>
            <p className="text-sm font-semibold">Exportação & Fichas PDF</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Exportação para Excel e geração de Ficha Cadastral em PDF para controle e custódia.</p>
          </div>
        </section>

        <div className="flex flex-col gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>MR Pay · Gestão de Ativos · v1.0.0.1</span>
          <span className="flex items-center gap-1.5">
            <Check className="size-3 text-emerald-600" /> {user ? `${profile?.role === "admin" ? "Admin" : "Operador"} conectado` : "Modo demonstração"}
          </span>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <AssetForm
          asset={editingAsset}
          form={form}
          setForm={setForm}
          isNew={!editingAsset}
          isAdmin={isAdmin}
          saving={saving}
          onSave={() => void saveAsset()}
          onDelete={() => void deleteAsset()}
          onClose={() => setSheetOpen(false)}
          demoMode={usingDemoData}
        />
      </Sheet>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      {authLoading && (
        <div className="pointer-events-none fixed bottom-4 right-4 rounded-full border border-border/70 bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-lg">
          Verificando sessão...
        </div>
      )}
    </DashboardLayout>
  );
}
