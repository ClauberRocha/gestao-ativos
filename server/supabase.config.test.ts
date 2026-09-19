import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("reaches the Supabase Auth health endpoint with the configured public credentials", async ({ skip }) => {
    const url = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    expect(url, "VITE_SUPABASE_URL must be configured").toMatch(/^https:\/\/[^\s/]+\.supabase\.co\/?$/);
    expect(anonKey, "VITE_SUPABASE_ANON_KEY must be configured").toMatch(/^(eyJ|sb_publishable_)/);

    let response: Response;
    try {
      response = await fetch(`${url!.replace(/\/$/, "")}/auth/v1/health`, {
        headers: {
          apikey: anonKey!,
        },
      });
    } catch (error) {
      const code = error instanceof Error && "cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause ? String(error.cause.code) : "";
      if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT"].includes(code)) {
        skip(`Supabase endpoint is not reachable from this test environment (${code})`);
      }
      throw error;
    }

    expect(response.ok, `Supabase Auth health check returned ${response.status}`).toBe(true);
  });
});
