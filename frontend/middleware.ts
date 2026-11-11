import { NextRequest, NextResponse } from "next/server";

export function middleware(_request: NextRequest) {
  // La cookie HttpOnly pertenece al backend de Render. Protected valida las
  // pantallas privadas contra /api/me antes de mostrar su contenido.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
