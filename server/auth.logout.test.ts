import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("returns success without issuing an obsolete cross-site cookie operation", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
  });
});
