import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

// The real authorization boundary. `proxy.ts` only does optimistic redirects;
// every admin page, action and route handler must call these.

export const getSession = cache(async () => {
  const { data } = await auth().getSession();
  return data ?? null;
});

export async function requireUser(returnTo?: string) {
  const session = await getSession();
  if (!session) {
    redirect(returnTo ? `/sign-in?returnTo=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return session.user;
}

export function isAdmin(user: { role?: string | null } | null | undefined): boolean {
  return user?.role === "admin";
}

export async function requireAdmin() {
  const user = await requireUser();
  // 404 rather than 403 so admin routes are not discoverable.
  if (!isAdmin(user)) notFound();
  return user;
}
