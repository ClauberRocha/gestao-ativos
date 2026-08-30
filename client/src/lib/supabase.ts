import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type AssetStatus = "Entregue" | "Em estoque" | "Ativo" | "Defeito";

export type Asset = {
  id: string;
  patrimonio: string;
  descricao: string;
  numero_serie: string;
  conta_cliente: string | null;
  local: string | null;
  status: AssetStatus;
  conservacao: string | null;
  valor_aquisicao?: number | null;
  observacoes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: "admin" | "operador";
  created_at?: string;
  updated_at?: string;
};

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export type FieldChange = {
  old: string | number | null | undefined;
  new: string | number | null | undefined;
};

export type AuditLog = {
  id: string;
  asset_id?: string | null;
  patrimonio: string;
  action: AuditAction;
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  changes?: Record<string, FieldChange> | null;
  notes?: string | null;
  created_at: string;
};
