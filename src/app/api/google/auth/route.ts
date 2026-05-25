import { NextResponse, type NextRequest } from "next/server";
import { authUrl, fetchAccountEmail, getOAuthClient, type GoogleAccessMode } from "@/lib/google/oauth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMode(value: string | null): GoogleAccessMode {
  return value === "READ_ONLY" ? "READ_ONLY" : "READ_WRITE";
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateMode = parseMode(url.searchParams.get("state"));

  if (!code) {
    // Étape 1 : redirige vers Google avec le mode demandé
    const mode = parseMode(url.searchParams.get("mode"));
    return NextResponse.redirect(authUrl(mode));
  }

  // Étape 2 : callback, on récupère le refresh_token
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    return NextResponse.json(
      {
        error:
          "Aucun refresh_token reçu. Révoque l'accès via myaccount.google.com puis réessaye (consent forcé)."
      },
      { status: 400 }
    );
  }

  client.setCredentials(tokens);
  const email = await fetchAccountEmail(client);

  await prisma.config.update({
    where: { id: "default" },
    data: {
      googleRefreshToken: tokens.refresh_token,
      googleAccessMode: stateMode,
      googleConnectedAt: new Date(),
      googleAccountEmail: email
    }
  });

  return NextResponse.redirect(new URL("/import-export?google=connected", req.url));
}
