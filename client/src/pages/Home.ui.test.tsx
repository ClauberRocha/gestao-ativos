// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthDialog } from "./Home";

vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

describe("AuthDialog user creation flow", () => {
  afterEach(() => cleanup());
  it("opens the real dialog in signup mode for an admin action", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthDialog open onOpenChange={vi.fn()} initialMode="signup" allowSignup />
        </TooltipProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("user-create-dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Criar acesso operacional" })).toBeTruthy();
    expect(screen.getByLabelText("Nome completo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeTruthy();
  });

  it("does not expose signup when the flag is disabled", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AuthDialog open onOpenChange={vi.fn()} initialMode="signup" allowSignup={false} />
        </TooltipProvider>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("auth-dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Acessar o inventário" })).toBeTruthy();
    expect(screen.queryByLabelText("Nome completo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Criar conta" })).toBeNull();
  });
});
