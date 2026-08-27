export const ENV = {
  databaseUrl: process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  frontendOrigin: (process.env.FRONTEND_ORIGIN ?? process.env.CORS_ORIGIN ?? "").replace(/\/+$/, ""),
  isProduction: process.env.NODE_ENV === "production",
  youtubeDataApiKey: process.env.YOUTUBE_DATA_API_KEY ?? "",
};
