import { supabase } from "./supabase";

export type AuditAction = "login" | "logout" | "create" | "update" | "delete" | "import" | "export" | "clear";

export async function recordAudit(actorId: string | undefined, action: AuditAction, details: Record<string, unknown> = {}, entity?: { id?: string; patrimonio?: string }) {
  if (!actorId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId)) return;
  try {
    const authData = typeof supabase.auth.getUser === "function" ? await supabase.auth.getUser() : null;
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: actorId,
      actor_email: authData?.data.user?.email ?? null,
      action,
      entity_type: entity ? "asset" : "system",
      entity_id: entity?.id ?? null,
      asset_patrimonio: entity?.patrimonio ?? null,
      details,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) console.warn("Não foi possível registrar auditoria", error.message);
  } catch (error) {
    console.warn("Não foi possível registrar auditoria", error);
  }
}
