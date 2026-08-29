import { describe, expect, it } from "vitest";
import { canCreateUsers, getUserCreationMode } from "./user-permissions";

describe("user creation permissions", () => {
  it("allows authenticated admins", () => {
    expect(canCreateUsers(true, "admin")).toBe(true);
  });

  it("hides user creation from operators and signed-out visitors", () => {
    expect(canCreateUsers(true, "operador")).toBe(false);
    expect(canCreateUsers(false, "admin")).toBe(false);
    expect(canCreateUsers(false, null)).toBe(false);
  });

  it("opens signup only for authenticated admins", () => {
    expect(getUserCreationMode(true, "admin")).toBe("signup");
    expect(getUserCreationMode(true, "operador")).toBe("login");
    expect(getUserCreationMode(false, "admin")).toBe("login");
  });
});
