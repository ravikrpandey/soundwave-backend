import { defineConfig } from "drizzle-kit";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL is required to run Soundwave PostgreSQL migrations");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
