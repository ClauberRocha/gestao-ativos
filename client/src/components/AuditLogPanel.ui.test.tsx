// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuditLogPanel, { type AuditLogEntry } from "./AuditLogPanel";

const log: AuditLogEntry = {
  id: "log-1",
  actor_id: "213e5feb-b4e5-45f7-9161-d88d257b2216",
  actor_email: "admin@mrpay.com.br",
  action: "update",
  entity_type: "asset",
  asset_patrimonio: "MR PAY 0001",
  details: {
    old: { local: "Estoque", status: "Em estoque" },
    new: { local: "Cliente", status: "Ativo" },
  },
  ip_address: null,
  user_agent: "Mozilla/5.0",
  created_at: "2026-09-03T12:00:00.000Z",
};

describe("AuditLogPanel", () => {
  it("exibe usuário, ação, patrimônio, campos alterados e estado do IP", () => {
    render(<AuditLogPanel logs={[log]} loading={false} onRefresh={vi.fn()} />);

    expect(screen.getByText("Logs do sistema")).toBeTruthy();
    expect(screen.getByText("admin@mrpay.com.br")).toBeTruthy();
    expect(screen.getByText("Edição")).toBeTruthy();
    expect(screen.getByText("MR PAY 0001")).toBeTruthy();
    expect(screen.getByText(/local: Estoque → Cliente; status: Em estoque → Ativo/)).toBeTruthy();
    expect(screen.getByText("IP: não disponível")).toBeTruthy();
  });
});
