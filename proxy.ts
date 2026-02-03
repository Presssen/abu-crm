import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

export default async function proxy(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (err) {
    // Si el middleware revienta en Edge, no tires el sitio entero
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
