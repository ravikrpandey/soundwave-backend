import { describe, expect, it } from "vitest";
import { parseTrpcInputs, trpcBatchPayload } from "../supabase/functions/soundwave-api/protocol";

describe("Supabase Edge Function tRPC protocol", () => {
  it("returns one standard tRPC envelope per batched procedure in order", () => {
    expect(trpcBatchPayload([{ ok: true }, { count: 2 }])).toEqual([
      { result: { data: { json: { ok: true } } } },
      { result: { data: { json: { count: 2 } } } },
    ]);
  });

  it("unwraps a single POST mutation body", () => {
    expect(parseTrpcInputs(JSON.stringify({ json: { track: { id: "audius:demo" } } }), false)).toEqual([{ track: { id: "audius:demo" } }]);
  });

  it("unwraps ordered POST bodies for a batched request", () => {
    expect(parseTrpcInputs(JSON.stringify({
      "1": { json: { query: "Bhojpuri" } },
      "0": { json: { query: "Bollywood" } },
    }), true)).toEqual([{ query: "Bollywood" }, { query: "Bhojpuri" }]);
  });
});
