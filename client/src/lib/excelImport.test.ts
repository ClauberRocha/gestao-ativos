import { describe, expect, it } from "vitest";
import {
  identifyField,
  normalizeHeader,
  normalizeStatus,
  parseCurrencyValue,
} from "./excelImport";

describe("excelImport utilities", () => {
  describe("normalizeHeader & identifyField", () => {
    it("identifies standard asset fields regardless of accents and casing", () => {
      expect(identifyField("Patrimônio")).toBe("patrimonio");
      expect(identifyField("patrimonio")).toBe("patrimonio");
      expect(identifyField("Código do Patrimônio")).toBe("patrimonio");
      expect(identifyField("TAG")).toBe("patrimonio");

      expect(identifyField("Descrição")).toBe("descricao");
      expect(identifyField("descricao_do_ativo")).toBe("descricao");
      expect(identifyField("Equipamento")).toBe("descricao");
      expect(identifyField("Modelo")).toBe("descricao");

      expect(identifyField("Número de Série")).toBe("numero_serie");
      expect(identifyField("Numero de Serie")).toBe("numero_serie");
      expect(identifyField("Serial Number")).toBe("numero_serie");
      expect(identifyField("S/N")).toBe("numero_serie");

      expect(identifyField("Conta Cliente")).toBe("conta_cliente");
      expect(identifyField("Cliente")).toBe("conta_cliente");

      expect(identifyField("Localização")).toBe("local");
      expect(identifyField("Local")).toBe("local");
      expect(identifyField("Filial")).toBe("local");

      expect(identifyField("Status")).toBe("status");
      expect(identifyField("Situação")).toBe("status");

      expect(identifyField("Conservação")).toBe("conservacao");
      expect(identifyField("Estado de Conservação")).toBe("conservacao");

      expect(identifyField("Valor de Aquisição")).toBe("valor_aquisicao");
      expect(identifyField("Preço")).toBe("valor_aquisicao");
      expect(identifyField("Custo")).toBe("valor_aquisicao");

      expect(identifyField("Observações")).toBe("observacoes");
    });

    it("marks unknown / custom columns as 'extra' to be retained in observations", () => {
      expect(identifyField("Fabricante")).toBe("extra");
      expect(identifyField("Lote")).toBe("extra");
      expect(identifyField("Nota Fiscal")).toBe("extra");
      expect(identifyField("Centro de Custo")).toBe("extra");
    });
  });

  describe("normalizeStatus", () => {
    it("maps strings to valid AssetStatus", () => {
      expect(normalizeStatus("Ativo")).toBe("Ativo");
      expect(normalizeStatus("Em operação")).toBe("Ativo");
      expect(normalizeStatus("instalado")).toBe("Ativo");

      expect(normalizeStatus("Em estoque")).toBe("Em estoque");
      expect(normalizeStatus("Disponível")).toBe("Em estoque");
      expect(normalizeStatus("Reserva")).toBe("Em estoque");

      expect(normalizeStatus("Entregue")).toBe("Entregue");
      expect(normalizeStatus("Expedido")).toBe("Entregue");

      expect(normalizeStatus("Defeito")).toBe("Defeito");
      expect(normalizeStatus("Manutenção")).toBe("Defeito");
      expect(normalizeStatus("Danificado")).toBe("Defeito");

      // Default fallback
      expect(normalizeStatus("")).toBe("Em estoque");
      expect(normalizeStatus(null)).toBe("Em estoque");
    });
  });

  describe("parseCurrencyValue", () => {
    it("handles multiple currency formats", () => {
      expect(parseCurrencyValue("R$ 1.250,50")).toBe(1250.5);
      expect(parseCurrencyValue("3.890,00")).toBe(3890);
      expect(parseCurrencyValue("450,25")).toBe(450.25);
      expect(parseCurrencyValue("6840")).toBe(6840);
      expect(parseCurrencyValue(512.5)).toBe(512.5);
      expect(parseCurrencyValue("")).toBeNull();
      expect(parseCurrencyValue(null)).toBeNull();
    });
  });
});
