import { describe, expect, it } from "vitest";
import { trpcBatchPayload } from "../supabase/functions/soundwave-api/protocol";

describe("Supabase Edge Function tRPC protocol", () => {
  it("returns a standard tRPC batch response array", () => {
    expect(trpcBatchPayload({ ok: true })).toEqual([
      { result: { data: { json: { ok: true } } } },
    ]);
  });
});
