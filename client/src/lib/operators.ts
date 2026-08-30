import { isSupabaseConfigured, supabase, type Profile } from "./supabase";
import type { User } from "@supabase/supabase-js";

export const sampleProfiles: Profile[] = [
  {
    id: "user-3",
    full_name: "Clauber Rocha",
    email: "clauber.rocha@mrpay.com.br",
    role: "admin",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "user-1",
    full_name: "Marina Ribeiro",
    email: "marina.ribeiro@mrpay.com.br",
    role: "operador",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "user-2",
    full_name: "Carlos Mendes",
    email: "carlos.mendes@mrpay.com.br",
    role: "operador",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: "user-4",
    full_name: "Juliana Lima",
    email: "juliana.lima@mrpay.com.br",
    role: "operador",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: "user-5",
    full_name: "Roberto Alves",
    email: "roberto.alves@mrpay.com.br",
    role: "operador",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

let localProfilesStore: Profile[] = [...sampleProfiles];

export async function getProfiles(options: {
  query?: string;
  role?: "admin" | "operador" | "Todos";
  isDemo?: boolean;
  user?: User | null;
} = {}): Promise<Profile[]> {
  const { query, role, isDemo, user } = options;

  if (isSupabaseConfigured && user && !isDemo) {
    try {
      let req = supabase.from("profiles").select("id, full_name, email, role, created_at, updated_at").order("created_at", { ascending: false });
      if (role && role !== "Todos") {
        req = req.eq("role", role);
      }
      if (query && query.trim()) {
        const safe = query.trim().replace(/[%,()]/g, "");
        req = req.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
      }

      const { data, error } = await req;
      if (!error && data && data.length > 0) {
        return data as Profile[];
      }
    } catch (err) {
      console.warn("[Profiles] Fallback to local store:", err);
    }
  }

  let filtered = [...localProfilesStore];

  if (role && role !== "Todos") {
    filtered = filtered.filter((p) => p.role === role);
  }
  if (query && query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter((p) =>
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }

  return filtered;
}

export async function updateProfileRole(
  profileId: string,
  newRole: "admin" | "operador",
  user?: User | null
): Promise<void> {
  // Update local store
  localProfilesStore = localProfilesStore.map((p) =>
    p.id === profileId ? { ...p, role: newRole, updated_at: new Date().toISOString() } : p
  );

  if (isSupabaseConfigured && user) {
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", profileId);
    if (error) throw error;
  }
}

export async function updateProfileName(
  profileId: string,
  fullName: string,
  user?: User | null
): Promise<void> {
  localProfilesStore = localProfilesStore.map((p) =>
    p.id === profileId ? { ...p, full_name: fullName, updated_at: new Date().toISOString() } : p
  );

  if (isSupabaseConfigured && user) {
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profileId);
    if (error) throw error;
  }
}

export async function createOperator(
  data: { email: string; full_name: string; role: "admin" | "operador" },
  user?: User | null
): Promise<Profile> {
  const newProfile: Profile = {
    id: `user-${Date.now()}`,
    full_name: data.full_name,
    email: data.email,
    role: data.role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localProfilesStore = [newProfile, ...localProfilesStore];
  return newProfile;
}
