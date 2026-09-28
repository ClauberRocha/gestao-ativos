import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { recordAudit } from "@/lib/audit";

type UserProfile = { id: string; full_name: string | null; email: string | null; role: "admin" | "gestor" | "usuario" | "operador"; created_at: string };

const roleLabels: Record<UserProfile["role"], string> = { admin: "Administrador", gestor: "Gestor", usuario: "Usuário", operador: "Usuário" };
const roleStyles: Record<UserProfile["role"], string> = { admin: "border-violet-200 bg-violet-50 text-violet-700", gestor: "border-sky-200 bg-sky-50 text-sky-700", usuario: "border-slate-200 bg-slate-50 text-slate-700", operador: "border-slate-200 bg-slate-50 text-slate-700" };

export default function UserManagementPanel() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar os usuários", { description: error.message });
    else setProfiles((data ?? []) as UserProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => { void loadProfiles(); }, [loadProfiles]);

  const updateRole = async (profile: UserProfile, role: UserProfile["role"]) => {
    if (role === profile.role) return;
    setUpdatingId(profile.id);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profile.id);
    if (error) toast.error("Não foi possível atualizar o cargo", { description: error.message });
    else {
      setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, role } : item));
      await recordAudit(authData.user?.id, "update", { entity: "profile", profile_id: profile.id, previous_role: profile.role, new_role: role });
      toast.success("Cargo atualizado", { description: `${profile.full_name || profile.email || "Usuário"} agora é ${roleLabels[role]}.` });
    }
    setUpdatingId(null);
  };

  return <section id="usuarios" className="scroll-mt-24 space-y-5" data-testid="user-management-panel">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-700"><ShieldCheck className="size-3" /> Área administrativa</div><h1 className="text-2xl font-semibold tracking-tight">Usuários e cargos</h1><p className="mt-1 text-sm text-muted-foreground">Consulte os acessos criados e o nível de permissão de cada pessoa.</p></div><Button type="button" variant="outline" size="sm" onClick={() => void loadProfiles()} disabled={loading} className="h-9 rounded-xl"><RefreshCw className={`mr-2 size-3.5 ${loading ? "animate-spin" : ""}`} /> Atualizar</Button></div>
    <div className="grid gap-3 sm:grid-cols-3"><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Users className="size-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p><p className="font-mono text-xl font-semibold">{profiles.length}</p></div></CardContent></Card><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck className="size-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Gestores</p><p className="font-mono text-xl font-semibold">{profiles.filter((profile) => profile.role === "gestor").length}</p></div></CardContent></Card><Card className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><UserRound className="size-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usuários</p><p className="font-mono text-xl font-semibold">{profiles.filter((profile) => profile.role === "usuario" || profile.role === "operador").length}</p></div></CardContent></Card></div>
    <Card className="overflow-hidden rounded-2xl"><CardHeader className="border-b border-border/70 px-5 py-4"><CardTitle className="text-sm">Contas cadastradas</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto">{loading ? <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando usuários...</div> : profiles.length === 0 ? <div className="p-6 text-sm text-muted-foreground">Nenhum usuário encontrado.</div> : <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b bg-muted/20 text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="px-5 py-3 font-semibold">Usuário</th><th className="px-5 py-3 font-semibold">E-mail</th><th className="px-5 py-3 font-semibold">Cargo</th><th className="px-5 py-3 font-semibold">Criado em</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id} className="border-b border-border/50 last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(profile.full_name || profile.email || "U").slice(0, 2).toUpperCase()}</span><span className="font-medium">{profile.full_name || "Sem nome"}</span></div></td><td className="px-5 py-4 text-muted-foreground">{profile.email || "E-mail não disponível"}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><select aria-label={`Cargo de ${profile.full_name || profile.email || "usuário"}`} value={profile.role === "operador" ? "usuario" : profile.role} disabled={updatingId === profile.id} onChange={(event) => void updateRole(profile, event.target.value as UserProfile["role"])} className={`h-8 rounded-lg border px-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-ring ${roleStyles[profile.role] || roleStyles.usuario}`}><option value="admin">Administrador</option><option value="gestor">Gestor</option><option value="usuario">Usuário</option></select>{updatingId === profile.id && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}</div></td><td className="px-5 py-4 text-muted-foreground">{new Date(profile.created_at).toLocaleDateString("pt-BR")}</td></tr>)}</tbody></table>}</div></CardContent></Card>
  </section>;
}
