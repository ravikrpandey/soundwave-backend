import { describe, expect, it } from "vitest";
import { trpcBatchPayload } from "../supabase/functions/soundwave-api/protocol";

describe("Supabase Edge Function tRPC protocol", () => {
  it("returns one standard tRPC envelope per batched procedure in order", () => {
    expect(trpcBatchPayload([{ ok: true }, { count: 2 }])).toEqual([
      { result: { data: { json: { ok: true } } } },
      { result: { data: { json: { count: 2 } } } },
    ]);
  });
});
