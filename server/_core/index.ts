import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { strictFrontendCors } from "./cors";
import { ENV } from "./env";

async function startServer() {
  if (!ENV.frontendOrigin || !ENV.supabaseUrl) {
    throw new Error("FRONTEND_ORIGIN and SUPABASE_URL are required for the Soundwave API");
  }

  const app = express();
  const server = createServer(app);

  app.use(strictFrontendCors(ENV.frontendOrigin));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "soundwave-api" });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({ router: appRouter, createContext })
  );

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  server.listen(port, () => {
    console.log(`Soundwave API listening on port ${port}`);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
