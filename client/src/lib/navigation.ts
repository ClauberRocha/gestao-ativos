export type MenuSection = "Inventário" | "Visão geral";

export function getMenuHash(section: MenuSection): "#inventario" | "#visao-geral" {
  return section === "Visão geral" ? "#visao-geral" : "#inventario";
}
