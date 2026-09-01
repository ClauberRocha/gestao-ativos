// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the active access message, seven navigation dots and the login CTA", () => {
    render(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);

    expect(screen.getByText("Faça login para acessar o sistema de ativos")).toBeTruthy();
    expect(screen.getByText("Controle patrimonial sem pontos cegos.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar no Sistema" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(7);
  });

  it("changes the message manually and advances automatically after five seconds", () => {
    vi.useFakeTimers();
    render(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);

    fireEvent.click(screen.getByRole("tab", { name: "Exibir mensagem 3" }));
    act(() => vi.advanceTimersByTime(220));
    expect(screen.getByText("Gestão patrimonial para quem exige o melhor.")).toBeTruthy();

    act(() => vi.advanceTimersByTime(5000 + 220));
    expect(screen.getByText("Automatize o controle, otimize seu tempo.")).toBeTruthy();
  });

  it("pauses while the pointer is over the card", () => {
    vi.useFakeTimers();
    render(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);
    const card = screen.getByRole("region", { name: "Acesso ao sistema de ativos" });

    fireEvent.mouseEnter(card);
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText("Controle patrimonial sem pontos cegos.")).toBeTruthy();

    fireEvent.mouseLeave(card);
    act(() => vi.advanceTimersByTime(5000 + 220));
    expect(screen.getByText("Cada ativo, visível. Cada detalhe, controlado.")).toBeTruthy();
  });
});
