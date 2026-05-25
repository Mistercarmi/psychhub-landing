import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";

export type GoogleAccessMode = "READ_ONLY" | "READ_WRITE";

const SCOPES_READ_ONLY = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/userinfo.email"
];

const SCOPES_READ_WRITE = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/userinfo.email"
];

export function scopesFor(mode: GoogleAccessMode): string[] {
  return mode === "READ_ONLY" ? SCOPES_READ_ONLY : SCOPES_READ_WRITE;
}

export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Variables Google OAuth manquantes. Configurez GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI dans .env.local."
    );
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export function authUrl(mode: GoogleAccessMode = "READ_WRITE"): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopesFor(mode),
    state: mode,
    include_granted_scopes: true
  });
}

export async function getAuthedClient(): Promise<OAuth2Client> {
  const config = await prisma.config.findUnique({ where: { id: "default" } });
  if (!config?.googleRefreshToken) {
    throw new Error("Compte Google non connecté. Allez dans Import / Export pour vous connecter.");
  }
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: config.googleRefreshToken });
  return client;
}

export async function fetchAccountEmail(client: OAuth2Client): Promise<string | null> {
  try {
    const res = await client.request<{ email?: string }>({
      url: "https://openidconnect.googleapis.com/v1/userinfo"
    });
    return res.data.email ?? null;
  } catch {
    return null;
  }
}
