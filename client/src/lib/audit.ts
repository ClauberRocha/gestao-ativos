import { isSupabaseConfigured, supabase, type Asset, type AuditAction, type AuditLog, type FieldChange, type Profile } from "./supabase";
import type { User } from "@supabase/supabase-js";

export const AUDIT_ACTIONS: Array<AuditAction | "Todas"> = ["Todas", "CREATE", "UPDATE", "DELETE"];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Criação",
  UPDATE: "Atualização",
  DELETE: "Exclusão",
};

export const FIELD_LABELS: Record<string, string> = {
  patrimonio: "Patrimônio",
  descricao: "Descrição",
  numero_serie: "Número de Série",
  conta_cliente: "Conta Cliente",
  local: "Localização",
  status: "Status",
  conservacao: "Conservação",
  valor_aquisicao: "Valor de Aquisição",
  observacoes: "Observações",
};

export const sampleAudits: AuditLog[] = [
  {
    id: "audit-1",
    asset_id: "sample-1",
    patrimonio: "MR PAY 0001",
    action: "UPDATE",
    user_id: "user-1",
    user_name: "Marina Ribeiro",
    user_email: "marina.ribeiro@mrpay.com.br",
    changes: {
      status: { old: "Em estoque", new: "Ativo" },
      local: { old: "Expedição Matriz", new: "São Paulo / SP" },
      conta_cliente: { old: null, new: "SEFAZ" },
    },
    notes: "Alocado no guichê 04; conferência de entrega realizada sem ressalvas.",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "audit-2",
    asset_id: "sample-6",
    patrimonio: "DESK 0151",
    action: "UPDATE",
    user_id: "user-2",
    user_name: "Carlos Mendes",
    user_email: "carlos.mendes@mrpay.com.br",
    changes: {
      status: { old: "Ativo", new: "Defeito" },
      conservacao: { old: "Bom", new: "Ruim" },
      observacoes: { old: "Em uso na recepção", new: "Falha intermitente no SSD; aguardando RMA." },
    },
    notes: "Abertura de chamado técnico para troca em garantia.",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "audit-3",
    asset_id: "sample-10",
    patrimonio: "MR PAY 0014",
    action: "CREATE",
    user_id: "user-3",
    user_name: "Clauber Rocha",
    user_email: "clauber.rocha@mrpay.com.br",
    changes: {
      patrimonio: { old: null, new: "MR PAY 0014" },
      descricao: { old: null, new: "PIN PAD Ingenico AXIUM DX8000" },
      numero_serie: { old: null, new: "AXD8-2026-0014" },
      status: { old: null, new: "Em estoque" },
      local: { old: null, new: "Osasco / SP" },
    },
    notes: "Cadastro inicial do lote recebido pelo fornecedor Ingenico.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "audit-4",
    asset_id: "sample-3",
    patrimonio: "TOTEM 0012",
    action: "UPDATE",
    user_id: "user-1",
    user_name: "Marina Ribeiro",
    user_email: "marina.ribeiro@mrpay.com.br",
    changes: {
      local: { old: "Galpão Logística", new: "Brasília / DF" },
      conta_cliente: { old: "Em preparação", new: "Banco do Brasil" },
    },
    notes: "Transferência física autorizada pela gerência de operações.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "audit-5",
    asset_id: null,
    patrimonio: "DESK 0099",
    action: "DELETE",
    user_id: "user-3",
    user_name: "Clauber Rocha",
    user_email: "clauber.rocha@mrpay.com.br",
    changes: {
      status: { old: "Defeito", new: "Excluído / Descarte" },
    },
    notes: "Equipamento antigo baixado por descarte patrimonial autorizado.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    id: "audit-6",
    asset_id: "sample-8",
    patrimonio: "TOTEM 0015",
    action: "UPDATE",
    user_id: "user-2",
    user_name: "Carlos Mendes",
    user_email: "carlos.mendes@mrpay.com.br",
    changes: {
      status: { old: "Em estoque", new: "Ativo" },
      local: { old: "Laboratório de Testes", new: "Guarulhos / SP" },
      conta_cliente: { old: null, new: "Poupatempo" },
    },
    notes: "Instalação e homologação concluídas no saguão de atendimento.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
];

let localAuditsStore: AuditLog[] = [...sampleAudits];

export function calculateAssetDiff(
  oldAsset: Partial<Asset> | null | undefined,
  newAsset: Partial<Asset>
): Record<string, FieldChange> {
  const diff: Record<string, FieldChange> = {};
  if (!oldAsset) {
    Object.keys(newAsset).forEach((key) => {
      const val = (newAsset as any)[key];
      if (val !== undefined && val !== null && val !== "" && key !== "id" && key !== "created_at" && key !== "updated_at") {
        diff[key] = { old: null, new: val };
      }
    });
    return diff;
  }

  const fieldsToCheck: Array<keyof Asset> = [
    "patrimonio",
    "descricao",
    "numero_serie",
    "conta_cliente",
    "local",
    "status",
    "conservacao",
    "valor_aquisicao",
    "observacoes",
  ];

  fieldsToCheck.forEach((field) => {
    const oldVal = oldAsset[field];
    const newVal = newAsset[field];

    const normalize = (v: any) => (v === undefined || v === null ? "" : String(v).trim());
    if (normalize(oldVal) !== normalize(newVal)) {
      diff[field] = { old: oldVal ?? null, new: newVal ?? null };
    }
  });

  return diff;
}

export async function recordAssetAudit(options: {
  assetId?: string | null;
  patrimonio: string;
  action: AuditAction;
  user?: User | null;
  profile?: Profile | null;
  changes?: Record<string, FieldChange>;
  notes?: string | null;
}): Promise<AuditLog> {
  const { assetId, patrimonio, action, user, profile, changes = {}, notes } = options;

  const newLog: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    asset_id: assetId ?? null,
    patrimonio,
    action,
    user_id: user?.id ?? profile?.id ?? null,
    user_name: profile?.full_name ?? user?.user_metadata?.full_name ?? "Operador",
    user_email: profile?.email ?? user?.email ?? null,
    changes,
    notes: notes ?? (action === "CREATE" ? "Cadastro de ativo" : action === "UPDATE" ? "Atualização de dados" : "Exclusão de ativo"),
    created_at: new Date().toISOString(),
  };

  // Prepend to local memory store
  localAuditsStore = [newLog, ...localAuditsStore];

  // If Supabase is connected, attempt remote insert
  if (isSupabaseConfigured && user) {
    try {
      const { data, error } = await supabase.from("asset_audits").insert({
        asset_id: assetId ?? null,
        patrimonio,
        action,
        user_id: user.id,
        user_name: newLog.user_name,
        user_email: newLog.user_email,
        changes,
        notes: newLog.notes,
      }).select().maybeSingle();

      if (!error && data) {
        return data as AuditLog;
      }
    } catch (err) {
      console.warn("[Audit] Could not save remote audit, kept in local session store:", err);
    }
  }

  return newLog;
}

export async function getAssetAudits(options: {
  assetId?: string;
  patrimonio?: string;
  action?: AuditAction | "Todas";
  query?: string;
  user?: User | null;
  isDemo?: boolean;
} = {}): Promise<AuditLog[]> {
  const { assetId, patrimonio, action, query, user, isDemo } = options;

  if (isSupabaseConfigured && user && !isDemo) {
    try {
      let req = supabase.from("asset_audits").select("*").order("created_at", { ascending: false });
      if (assetId) req = req.eq("asset_id", assetId);
      if (patrimonio) req = req.ilike("patrimonio", `%${patrimonio}%`);
      if (action && action !== "Todas") req = req.eq("action", action);
      if (query && query.trim()) {
        const safe = query.trim().replace(/[%,()]/g, "");
        req = req.or(`patrimonio.ilike.%${safe}%,user_name.ilike.%${safe}%,user_email.ilike.%${safe}%,notes.ilike.%${safe}%`);
      }

      const { data, error } = await req.limit(100);
      if (!error && data && data.length > 0) {
        return data as AuditLog[];
      }
    } catch (err) {
      console.warn("[Audit] Falling back to local audits store:", err);
    }
  }

  let filtered = [...localAuditsStore];

  if (assetId) {
    filtered = filtered.filter((log) => log.asset_id === assetId);
  }
  if (patrimonio) {
    const p = patrimonio.toLowerCase();
    filtered = filtered.filter((log) => log.patrimonio.toLowerCase().includes(p));
  }
  if (action && action !== "Todas") {
    filtered = filtered.filter((log) => log.action === action);
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter((log) =>
      log.patrimonio.toLowerCase().includes(q) ||
      (log.user_name && log.user_name.toLowerCase().includes(q)) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.notes && log.notes.toLowerCase().includes(q))
    );
  }

  return filtered;
}

/**
 * Export audit log to Excel Spreadsheet XML
 */
export function exportAuditsToExcel(audits: AuditLog[], options: { filename?: string } = {}) {
  const { filename = `Auditoria_Alteracoes_MR_PAY_${new Date().toISOString().slice(0, 10)}.xls` } = options;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const sanitizeXml = (str: string | number | null | undefined): string => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  let rowsXml = "";

  // Title Row
  rowsXml += `
    <Row ss:Height="28">
      <Cell ss:MergeAcross="6" ss:StyleID="sTitle">
        <Data ss:Type="String">MR PAY · RELATÓRIO DE AUDITORIA DE ALTERAÇÕES</Data>
      </Cell>
    </Row>
    <Row ss:Height="18">
      <Cell ss:MergeAcross="6" ss:StyleID="sSubtitle">
        <Data ss:Type="String">Emissão: ${formattedDate} às ${formattedTime} | Total: ${audits.length} eventos registrados</Data>
      </Cell>
    </Row>
    <Row ss:Height="10"></Row>
  `;

  // Header Row
  rowsXml += `
    <Row ss:Height="24">
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Data / Hora</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Ação</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Patrimônio</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Operador Responsável</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">E-mail</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Campos Modificados</Data></Cell>
      <Cell ss:StyleID="sHeader"><Data ss:Type="String">Observações / Motivo</Data></Cell>
    </Row>
  `;

  audits.forEach((audit, index) => {
    const isEven = index % 2 === 0;
    const rowStyle = isEven ? "sRowEven" : "sRowOdd";
    const actionLabel = AUDIT_ACTION_LABELS[audit.action] || audit.action;
    const actionStyle = `sAction_${audit.action}`;

    const dateStr = new Date(audit.created_at).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const diffSummary = audit.changes
      ? Object.entries(audit.changes)
          .map(([key, change]) => `${FIELD_LABELS[key] || key}: [${change.old || "—"}] ➔ [${change.new || "—"}]`)
          .join("; ")
      : "Sem detalhes";

    rowsXml += `
      <Row ss:Height="22">
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(dateStr)}</Data></Cell>
        <Cell ss:StyleID="${actionStyle}"><Data ss:Type="String">${sanitizeXml(actionLabel)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}Bold"><Data ss:Type="String">${sanitizeXml(audit.patrimonio)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(audit.user_name || "Operador")}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(audit.user_email || "—")}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(diffSummary)}</Data></Cell>
        <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${sanitizeXml(audit.notes || "—")}</Data></Cell>
      </Row>
    `;
  });

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="15" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sSubtitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#64748B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="sRowEven">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="sRowOdd">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="sRowEvenBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="sRowOddBold">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="sAction_CREATE">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#047857"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1FAE5"/></Borders>
  </Style>
  <Style ss:ID="sAction_UPDATE">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#B45309"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEF3C7"/></Borders>
  </Style>
  <Style ss:ID="sAction_DELETE">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9" ss:Bold="1" ss:Color="#B91C1C"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FEE2E2"/></Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Auditoria">
  <Table ss:ExpandedColumnCount="7" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="18">
   <Column ss:Width="125"/>
   <Column ss:Width="95"/>
   <Column ss:Width="110"/>
   <Column ss:Width="140"/>
   <Column ss:Width="175"/>
   <Column ss:Width="260"/>
   <Column ss:Width="260"/>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
