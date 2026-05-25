import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes API exemptées de la vérification d'origine.
 * - `/api/google/auth` : callback OAuth Google (redirection cross-site légitime).
 * - `/api/calendar/ics` : flux ICS souscrit par les clients calendrier externes
 *   (Outlook, Google Calendar, Apple Calendar) — non-browser, sans Sec-Fetch-Site.
 */
const CSRF_EXEMPT_PREFIXES = ["/api/google/auth", "/api/calendar/ics"];

/**
 * Protège les routes API contre les requêtes cross-site (CSRF).
 *
 * Stratégie defense-in-depth :
 * 1. Sec-Fetch-Site (envoyé par tous les navigateurs modernes) : doit être
 *    `same-origin` ou `none`. Bloque les requêtes émises par un onglet tiers.
 * 2. Pour les mutations (POST/PUT/DELETE/PATCH), si Origin est présent il doit
 *    matcher Host — protège contre les clients non-browser malveillants.
 *
 * Les clients calendrier (sans header Sec-Fetch-Site) accèdent à `/api/calendar/ics`
 * via la whitelist ; les autres GETs non-browser sont laissés passer (déjà locaux).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite !== null && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return new NextResponse("Forbidden: cross-site request blocked", { status: 403 });
  }

  const method = req.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      if (!host) {
        return new NextResponse("Forbidden: missing Host header", { status: 403 });
      }
      const allowed = new Set([`http://${host}`, `https://${host}`]);
      if (!allowed.has(origin)) {
        return new NextResponse("Forbidden: origin mismatch", { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*"
};
