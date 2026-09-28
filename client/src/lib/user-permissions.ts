export type UserRole = "admin" | "gestor" | "usuario" | "operador";

export function canCreateUsers(isAuthenticated: boolean, role: UserRole | null | undefined): boolean {
  return isAuthenticated && role === "admin";
}

export function getUserCreationMode(isAuthenticated: boolean, role: UserRole | null | undefined): "signup" | "login" {
  return canCreateUsers(isAuthenticated, role) ? "signup" : "login";
}
