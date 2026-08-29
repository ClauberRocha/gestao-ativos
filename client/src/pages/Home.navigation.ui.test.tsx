// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, vi, it } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Home from "./Home";

vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({ user: null, signOut: vi.fn(async () => undefined) }),
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

describe("Home navigation integration", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("moves the real Home flow to Visão geral and updates the hash", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Home />
      </ThemeProvider>,
    );

    const overviewButton = screen.getByTestId("overview-button");
    fireEvent.click(overviewButton);

    expect(window.location.hash).toBe("#visao-geral");
    expect(overviewButton.getAttribute("data-active")).toBe("true");
    expect(document.getElementById("visao-geral")).toBeTruthy();
  });
});
