import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that require access (blocked for public)
const BLOCKED_ROUTES = [
  "/simulator",
  "/simulate",
  "/calculator",
  "/build",
  "/admin",
];

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if the path starts with any blocked route
  const isBlocked = BLOCKED_ROUTES.some((route) => path.startsWith(route));

  if (isBlocked) {
    // Redirect to home page with the pricing section anchor
    return NextResponse.redirect(new URL("/#pricing", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Only run middleware on page routes, not API/static files
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
