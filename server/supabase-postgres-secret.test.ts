import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const connectionString = process.env.SUPABASE_DATABASE_URL;
const describeWithSupabase =
  connectionString && process.env.RUN_LIVE_SUPABASE_TESTS === "true"
    ? describe
    : describe.skip;

describeWithSupabase("Supabase PostgreSQL credential", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  it("can execute a minimal server-side health query", async () => {
    const result = await client.query<{ healthy: number }>("select 1 as healthy");
    expect(result.rows[0]?.healthy).toBe(1);
  });
});
