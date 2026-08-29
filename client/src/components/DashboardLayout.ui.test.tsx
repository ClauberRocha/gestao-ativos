// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DashboardLayout from "./DashboardLayout";
import { AuthDialog } from "@/pages/Home";

const signOut = vi.fn(async () => undefined);

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }),
  });
});

vi.mock("@/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({
    user: { id: "admin-1", email: "admin@mrpay.com.br", user_metadata: { full_name: "Admin Mr Pay" } },
    signOut,
  }),
}));

function renderLayout(isAdmin: boolean, onOverviewClick = vi.fn()) {
  return render(
    <ThemeProvider defaultTheme="light">
      <DashboardLayout
        onOpenAuth={vi.fn()}
        onOpenUserCreate={vi.fn()}
        isAdmin={isAdmin}
        onOverviewClick={onOverviewClick}
        onInventoryClick={vi.fn()}
      >
        <div>Conteúdo</div>
      </DashboardLayout>
    </ThemeProvider>,
  );
}

function renderAdminUserCreateFlow() {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <ThemeProvider defaultTheme="light">
        <DashboardLayout
          onOpenAuth={vi.fn()}
          onOpenUserCreate={() => setOpen(true)}
          isAdmin
          onOverviewClick={vi.fn()}
          onInventoryClick={vi.fn()}
        >
          <div>Conteúdo</div>
        </DashboardLayout>
        <AuthDialog open={open} onOpenChange={setOpen} initialMode="signup" allowSignup />
      </ThemeProvider>
    );
  }
  return render(<Harness />);
}

describe("DashboardLayout user creation controls", () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });
  it("renders both create-user entry points for an authenticated admin", () => {
    renderLayout(true);
    expect(screen.getByTestId("create-user-button")).toBeTruthy();
    expect(screen.getByTestId("create-user-header-button")).toBeTruthy();
  });

  it("hides create-user entry points for a non-admin", () => {
    renderLayout(false);
    expect(screen.queryByTestId("create-user-button")).toBeNull();
    expect(screen.queryByTestId("create-user-header-button")).toBeNull();
  });

  it("opens the signup dialog when the admin clicks Criar usuário", () => {
    renderAdminUserCreateFlow();
    fireEvent.click(screen.getByTestId("create-user-button"));
    expect(screen.getByTestId("user-create-dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Criar acesso operacional" })).toBeTruthy();
  });

  it("calls the real overview navigation callback", () => {
    const onOverviewClick = vi.fn(() => window.history.replaceState(null, "", "#visao-geral"));
    renderLayout(false, onOverviewClick);
    fireEvent.click(screen.getByTestId("overview-button"));
    expect(onOverviewClick).toHaveBeenCalledOnce();
    expect(screen.getByTestId("overview-button").getAttribute("data-active")).toBe("true");
    expect(window.location.hash).toBe("#visao-geral");
  });
});
