import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { ForbiddenError } from "@shared/_core/errors";
import * as db from "../db";
import { ENV } from "./env";

type SupabaseIdentity = {
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: "google";
};

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extractBearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/** Validates the claims used to map a verified Supabase user to Soundwave. */
export function normalizeSupabaseClaims(payload: JWTPayload): SupabaseIdentity {
  const openId = asNonEmptyString(payload.sub);
  const role = asNonEmptyString(payload.role);

  if (!openId || role !== "authenticated") {
    throw ForbiddenError("Invalid Supabase access token");
  }

  const metadata = asRecord(payload.user_metadata);
  const name =
    asNonEmptyString(metadata?.full_name) ??
    asNonEmptyString(metadata?.name) ??
    asNonEmptyString(metadata?.user_name) ??
    null;

  return {
    openId,
    name,
    email: asNonEmptyString(payload.email),
    loginMethod: "google",
  };
}

function getSupabaseJwks() {
  if (!ENV.supabaseUrl) {
    throw ForbiddenError("Supabase authentication is not configured");
  }

  return createRemoteJWKSet(
    new URL(`${ENV.supabaseUrl}/auth/v1/.well-known/jwks.json`)
  );
}

async function verifySupabaseToken(token: string) {
  const issuer = `${ENV.supabaseUrl}/auth/v1`;
  const { payload } = await jwtVerify(token, getSupabaseJwks(), {
    issuer,
    audience: "authenticated",
  });
  return normalizeSupabaseClaims(payload);
}

async function authenticateRequest(req: Request): Promise<User> {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) throw ForbiddenError("Missing Supabase access token");

  let identity: SupabaseIdentity;
  try {
    identity = await verifySupabaseToken(token);
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid Supabase access token") {
      throw error;
    }
    console.warn("[Auth] Supabase access-token verification failed", String(error));
    throw ForbiddenError("Invalid Supabase access token");
  }

  try {
    await db.upsertUser({
      ...identity,
      lastSignedIn: new Date(),
    });
    const user = await db.getUserByOpenId(identity.openId);
    if (!user) throw new Error("Soundwave user upsert was not found");
    return user;
  } catch (error) {
    console.error("[Auth] Failed to synchronize Supabase user", error);
    throw ForbiddenError("Unable to synchronize signed-in user");
  }
}

export const sdk = { authenticateRequest };
