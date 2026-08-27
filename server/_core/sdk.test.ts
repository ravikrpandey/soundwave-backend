import { describe, expect, it } from "vitest";
import { normalizeSupabaseClaims } from "./sdk";

describe("Supabase claim normalization", () => {
  it("maps a verified Google user to a Soundwave identity", () => {
    expect(
      normalizeSupabaseClaims({
        sub: "e7d309fe-0f23-4a20-b944-5fd1d2f0dc22",
        role: "authenticated",
        email: "listener@example.com",
        user_metadata: { full_name: "Listener Name" },
      })
    ).toEqual({
      openId: "e7d309fe-0f23-4a20-b944-5fd1d2f0dc22",
      name: "Listener Name",
      email: "listener@example.com",
      loginMethod: "google",
    });
  });

  it("rejects anonymous and malformed claims before user persistence", () => {
    expect(() => normalizeSupabaseClaims({ sub: "a-user", role: "anon" })).toThrow(
      "Invalid Supabase access token"
    );
    expect(() => normalizeSupabaseClaims({ role: "authenticated" })).toThrow(
      "Invalid Supabase access token"
    );
  });
});
