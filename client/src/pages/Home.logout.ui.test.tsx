// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

const authState = vi.hoisted(() => ({
  user: { id: "admin-1", email: "admin@mrpay.com.br", user_metadata: { full_name: "Admin Mr Pay" } } as { id: string; email: string; user_metadata: { full_name: string } } | null,
  signOut: vi.fn(async () => {
    authState.user = null;
  }),
}));

vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    user: authState.user,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: authState.signOut,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })),
      })),
    })),
  },
}));

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
});

describe("Home logout flow", () => {
  beforeEach(() => {
    authState.user = { id: "admin-1", email: "admin@mrpay.com.br", user_metadata: { full_name: "Admin Mr Pay" } };
    authState.signOut.mockClear();
  });

  afterEach(() => cleanup());

  it("returns to the initial authentication screen after clicking Sair", async () => {
    const view = render(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);
    expect(screen.getByLabelText("Sair")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Sair"));
      await Promise.resolve();
    });
    view.rerender(<ThemeProvider defaultTheme="light"><Home /></ThemeProvider>);

    expect(authState.signOut).toHaveBeenCalledOnce();
    expect(screen.getByText("Faça login para acessar o sistema de ativos")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar no Sistema" })).toBeTruthy();
    expect(screen.queryByLabelText("Sair")).toBeNull();
  });
});
