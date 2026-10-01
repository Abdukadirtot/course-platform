import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { env } from "@/lib/env";

function createAuth() {
  return createNeonAuth({
    baseUrl: env().NEON_AUTH_BASE_URL,
    cookies: { secret: env().NEON_AUTH_COOKIE_SECRET },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function auth() {
  instance ??= createAuth();
  return instance;
}
