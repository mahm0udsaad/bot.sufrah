import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const userPhone = request.cookies.get("user-phone")?.value
  const localeCookie = request.cookies.get("locale")?.value
  const { pathname } = request.nextUrl
  const acceptLanguage = request.headers.get("accept-language") || ""
  const inferredLocale = acceptLanguage.toLowerCase().includes("ar") ? "ar" : "en"

  const withLocale = (response: NextResponse) => {
    if (!localeCookie) {
      response.cookies.set({
        name: "locale",
        value: inferredLocale,
        path: "/",
      })
    }
    return response
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/signin", "/api/auth/signin", "/api/auth/verify"]

  // API routes that should be accessible
  const apiRoutes = ["/api/auth", "/api/bot"]

  // Check if it's a public route
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return withLocale(NextResponse.next())
  }

  // Check if it's an API route
  if (apiRoutes.some((route) => pathname.startsWith(route))) {
    return withLocale(NextResponse.next())
  }

  if (!userPhone && pathname !== "/signin") {
    return withLocale(NextResponse.redirect(new URL("/signin", request.url)))
  }

  if (userPhone && pathname === "/signin") {
    return withLocale(NextResponse.redirect(new URL("/", request.url)))
  }

  return withLocale(NextResponse.next())
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
