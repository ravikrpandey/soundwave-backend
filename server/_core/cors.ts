import type { RequestHandler } from "express";

export function isAllowedFrontendOrigin(origin: string | undefined, frontendOrigin: string) {
  return Boolean(origin && frontendOrigin && origin.replace(/\/+$/, "") === frontendOrigin.replace(/\/+$/, ""));
}

/** Apply a single exact-origin CORS policy for the GitHub Pages frontend. */
export function strictFrontendCors(frontendOrigin: string): RequestHandler {
  return (req, res, next) => {
    // Local integrated development has no deployed Pages origin yet. Production
    // startup rejects this configuration before serving any traffic.
    if (!frontendOrigin) return next();

    const origin = req.header("origin");

    // Server-to-server requests such as Render health checks have no Origin.
    if (!origin) return next();

    if (!isAllowedFrontendOrigin(origin, frontendOrigin)) {
      res.status(403).json({ error: "Origin is not allowed" });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Vary", "Origin");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  };
}
