// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({ user: null, loading: false, signOut: vi.fn(async () => undefined) }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: { from: vi.fn() },
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
});

describe("InitialAuthScreen", () => {
  afterEach(() => cleanup());

  it("renders the static access screen and login CTA without the carousel", () => {
    render(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);

    expect(screen.getByText("Faça login para acessar o sistema de ativos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar no Sistema" })).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByText("Controle patrimonial sem pontos cegos.")).toBeNull();
  });
});
