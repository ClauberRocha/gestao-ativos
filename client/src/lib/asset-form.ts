export const ASSET_SAVED_MESSAGE = "Ativo Salvo com sucesso";

export type AssetSaveAction = {
  label: string;
  kind: "save" | "close";
};

export function getAssetSaveAction({
  demoMode,
  saveCompleted,
  isNew,
}: {
  demoMode: boolean;
  saveCompleted: boolean;
  isNew: boolean;
}): AssetSaveAction {
  if (demoMode || saveCompleted) {
    return { label: "Fechar", kind: "close" };
  }

  return {
    label: isNew ? "Cadastrar ativo" : "Salvar alterações",
    kind: "save",
  };
}
