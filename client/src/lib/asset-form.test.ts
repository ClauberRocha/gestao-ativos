import { describe, expect, it } from "vitest";
import { ASSET_SAVED_MESSAGE, getAssetSaveAction } from "./asset-form";

describe("asset save feedback", () => {
  it("uses the requested success message", () => {
    expect(ASSET_SAVED_MESSAGE).toBe("Ativo Salvo com sucesso");
  });

  it("changes the save action to close after a successful save", () => {
    expect(getAssetSaveAction({ demoMode: false, saveCompleted: false, isNew: false })).toEqual({
      label: "Salvar alterações",
      kind: "save",
    });
    expect(getAssetSaveAction({ demoMode: false, saveCompleted: true, isNew: false })).toEqual({
      label: "Fechar",
      kind: "close",
    });
  });
});
