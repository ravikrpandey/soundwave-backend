import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const connectionString = process.env.SUPABASE_DATABASE_URL;
const describeWithSupabase =
  connectionString && process.env.RUN_LIVE_SUPABASE_TESTS === "true"
    ? describe
    : describe.skip;

describeWithSupabase("Soundwave Supabase PostgreSQL schema", () => {
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

  it("contains the required persistent-library tables", async () => {
    const result = await client.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])
       order by table_name`,
      [["likedTracks", "playlistTracks", "playlists", "tracks", "users"]]
    );

    expect(result.rows.map(row => row.table_name)).toEqual([
      "likedTracks",
      "playlistTracks",
      "playlists",
      "tracks",
      "users",
    ]);
  });
});
