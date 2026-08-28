export type AppTheme = "light" | "dark";

export function getNextTheme(theme: AppTheme): AppTheme {
  return theme === "light" ? "dark" : "light";
}

export function getThemeToggleLabel(theme: AppTheme): string {
  return theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";
}

export function getThemeToggleTitle(theme: AppTheme): string {
  return theme === "dark" ? "Modo claro" : "Modo escuro";
}
