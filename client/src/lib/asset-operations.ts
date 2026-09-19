import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset } from "@/lib/supabase";

export type AssetRecordPayload = Omit<Asset, "id" | "created_at" | "updated_at" | "valor_aquisicao"> & {
  valor_aquisicao?: number | null;
};

export async function saveAssetRecord(
  client: SupabaseClient,
  assetId: string | null,
  payload: AssetRecordPayload,
) {
  if (assetId) {
    const result = await client.from("assets").update(payload).eq("id", assetId).select("id").single();
    if (result.error) throw result.error;
    return result.data;
  }

  const result = await client.from("assets").insert(payload).select("id").single();
  if (result.error) throw result.error;
  return result.data;
}

export async function clearAssetDatabase(client: SupabaseClient) {
  const { data, error } = await client.rpc("clear_assets");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function replaceAssetDatabase(client: SupabaseClient, rows: unknown[], sourceFile: string) {
  const { data, error } = await client.rpc("replace_assets", { payload: rows, source_file: sourceFile });
  if (error) throw error;
  return Number(data ?? rows.length);
}
