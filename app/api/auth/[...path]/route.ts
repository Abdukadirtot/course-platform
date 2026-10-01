import { auth } from "@/lib/auth/server";

type Context = { params: Promise<{ path: string[] }> };

export function GET(request: Request, context: Context) {
  return auth().handler().GET(request, context);
}

export function POST(request: Request, context: Context) {
  return auth().handler().POST(request, context);
}
