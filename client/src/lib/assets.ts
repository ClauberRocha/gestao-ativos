import type { Asset, AssetStatus } from "./supabase";

export const ASSET_STATUSES: AssetStatus[] = ["Ativo", "Em estoque", "Entregue", "Defeito"];

export const sampleAssets: Asset[] = [
  {
    id: "sample-1",
    patrimonio: "MR PAY 0001",
    descricao: "PIN PAD Ingenico Lane/3000",
    numero_serie: "7200032211011635",
    conta_cliente: "SEFAZ",
    local: "São Paulo / SP",
    status: "Ativo",
    conservacao: "Bom",
    valor_aquisicao: 389.9,
    observacoes: "Alocado no guichê 04; última conferência sem ressalvas.",
  },
  {
    id: "sample-2",
    patrimonio: "MR PAY 0002",
    descricao: "PIN PAD Ingenico Lane/3000",
    numero_serie: "7200032211011642",
    conta_cliente: "SEFAZ",
    local: "São Paulo / SP",
    status: "Ativo",
    conservacao: "Bom",
    valor_aquisicao: 389.9,
    observacoes: "Alocado no guichê 07.",
  },
  {
    id: "sample-3",
    patrimonio: "TOTEM 0012",
    descricao: "Totem de autoatendimento 24 pol.",
    numero_serie: "TOT-2024-00012",
    conta_cliente: "Banco do Brasil",
    local: "Brasília / DF",
    status: "Em estoque",
    conservacao: "Novo",
    valor_aquisicao: 6840,
    observacoes: "Aguardando instalação no ponto Norte.",
  },
  {
    id: "sample-4",
    patrimonio: "TOTEM 0008",
    descricao: "Totem de autoatendimento 24 pol.",
    numero_serie: "TOT-2024-00008",
    conta_cliente: "Detran SP",
    local: "Campinas / SP",
    status: "Entregue",
    conservacao: "Bom",
    valor_aquisicao: 6840,
    observacoes: "Entregue ao operador logístico em 14/08/2026.",
  },
  {
    id: "sample-5",
    patrimonio: "DESK 0148",
    descricao: "Desktop Dell OptiPlex 7010",
    numero_serie: "8XK3PZ4",
    conta_cliente: "SEFAZ",
    local: "São Paulo / SP",
    status: "Ativo",
    conservacao: "Regular",
    valor_aquisicao: 3290,
    observacoes: "Estação de retaguarda do atendimento.",
  },
  {
    id: "sample-6",
    patrimonio: "DESK 0151",
    descricao: "Desktop Lenovo ThinkCentre M70s",
    numero_serie: "PC1A7K29",
    conta_cliente: "Prefeitura de Santos",
    local: "Santos / SP",
    status: "Defeito",
    conservacao: "Ruim",
    valor_aquisicao: 2980,
    observacoes: "Falha intermitente no SSD; aguardando RMA.",
  },
  {
    id: "sample-7",
    patrimonio: "MR PAY 0007",
    descricao: "PIN PAD Verifone VX 690",
    numero_serie: "VX690-0098712",
    conta_cliente: "Caixa Econômica Federal",
    local: "Belo Horizonte / MG",
    status: "Em estoque",
    conservacao: "Novo",
    valor_aquisicao: 512.5,
    observacoes: "Reserva técnica lacrada.",
  },
  {
    id: "sample-8",
    patrimonio: "TOTEM 0015",
    descricao: "Totem de autoatendimento 32 pol.",
    numero_serie: "TOT-2025-00015",
    conta_cliente: "Poupatempo",
    local: "Guarulhos / SP",
    status: "Ativo",
    conservacao: "Bom",
    valor_aquisicao: 8920,
    observacoes: "Operando no saguão principal.",
  },
  {
    id: "sample-9",
    patrimonio: "DESK 0132",
    descricao: "Desktop HP ProDesk 400 G7",
    numero_serie: "BRHPD400G7-0132",
    conta_cliente: "Hospital Regional",
    local: "Ribeirão Preto / SP",
    status: "Entregue",
    conservacao: "Bom",
    valor_aquisicao: 3110,
    observacoes: "Recebido pelo time de infraestrutura local.",
  },
  {
    id: "sample-10",
    patrimonio: "MR PAY 0014",
    descricao: "PIN PAD Ingenico AXIUM DX8000",
    numero_serie: "AXD8-2026-0014",
    conta_cliente: "Mercado Livre",
    local: "Osasco / SP",
    status: "Defeito",
    conservacao: "Regular",
    valor_aquisicao: 1190,
    observacoes: "Tela sem resposta após atualização de firmware.",
  },
  {
    id: "sample-11",
    patrimonio: "TOTEM 0003",
    descricao: "Totem de autoatendimento 24 pol.",
    numero_serie: "TOT-2023-00003",
    conta_cliente: "Poupatempo",
    local: "São José dos Campos / SP",
    status: "Ativo",
    conservacao: "Regular",
    valor_aquisicao: 6420,
    observacoes: "Em operação com pequeno desgaste no gabinete.",
  },
  {
    id: "sample-12",
    patrimonio: "DESK 0164",
    descricao: "Desktop Dell OptiPlex 7020",
    numero_serie: "9QZ6ML2",
    conta_cliente: "Receita Federal",
    local: "Curitiba / PR",
    status: "Em estoque",
    conservacao: "Novo",
    valor_aquisicao: 3550,
    observacoes: "Kit completo separado para expedição.",
  },
];

export const ASSETS_STORAGE_KEY = "mrpay_assets_store";

export function getLocalAssets(): Asset[] {
  try {
    const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
    if (saved !== null) {
      return JSON.parse(saved) as Asset[];
    }
  } catch (e) {
    console.warn("Could not read local assets", e);
  }
  return sampleAssets;
}

export function saveLocalAssets(assets: Asset[]): void {
  try {
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
  } catch (e) {
    console.warn("Could not save local assets", e);
  }
}

export function clearLocalAssets(): void {
  try {
    localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify([]));
  } catch (e) {
    console.warn("Could not clear local assets", e);
  }
}

export function searchAssets(assets: Asset[], query: string, status?: AssetStatus | "Todos") {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  return assets.filter((asset) => {
    const matchesSearch = !normalizedQuery || [asset.patrimonio, asset.numero_serie]
      .some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
    const matchesStatus = !status || status === "Todos" || asset.status === status;
    return matchesSearch && matchesStatus;
  });
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

