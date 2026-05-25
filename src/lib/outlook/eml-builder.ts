/**
 * Construit un message RFC 5322 (.eml) avec un attachment PDF en base64.
 * Le fichier s'ouvre dans Outlook desktop comme un brouillon — l'utilisateur valide l'envoi.
 */

type BuildEmlInput = {
  to: string;
  from?: string;
  subject: string;
  bodyText: string;
  attachment?: { filename: string; contentBase64: string; mimeType?: string };
};

/**
 * Supprime CR/LF d'une valeur destinée à un header MIME pour empêcher l'injection
 * de headers (CRLF injection). Toujours appeler avant interpolation dans un header.
 */
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function quotePrintableHeader(value: string): string {
  const cleaned = sanitizeHeaderValue(value);
  if (/^[\x20-\x7E]*$/.test(cleaned)) return cleaned;
  const b64 = Buffer.from(cleaned, "utf-8").toString("base64");
  return `=?UTF-8?B?${b64}?=`;
}

/**
 * Échappe un nom de fichier pour `Content-Disposition: attachment; filename="..."`.
 * Supprime CRLF et échappe les guillemets/backslashes selon RFC 2183.
 */
function sanitizeFilename(value: string): string {
  return sanitizeHeaderValue(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function chunk(str: string, len = 76): string {
  const out: string[] = [];
  for (let i = 0; i < str.length; i += len) out.push(str.slice(i, i + len));
  return out.join("\r\n");
}

export function buildEml({ to, from, subject, bodyText, attachment }: BuildEmlInput): string {
  const boundary = `----=_PsychHub_${Date.now().toString(36)}`;
  const safeFrom = sanitizeHeaderValue(from ?? "");
  const safeTo = sanitizeHeaderValue(to);
  const headers = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${quotePrintableHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "X-Unsent: 1" // Outlook : ouvre en mode brouillon
  ].join("\r\n");

  const textPart = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    chunk(Buffer.from(bodyText, "utf-8").toString("base64"))
  ].join("\r\n");

  let attachPart = "";
  if (attachment) {
    const safeFilename = sanitizeFilename(attachment.filename);
    const safeMime = sanitizeHeaderValue(attachment.mimeType ?? "application/pdf");
    attachPart = [
      `--${boundary}`,
      `Content-Type: ${safeMime}; name="${safeFilename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${safeFilename}"`,
      "",
      chunk(attachment.contentBase64)
    ].join("\r\n");
  }

  return [headers, "", textPart, attachPart, `--${boundary}--`, ""].join("\r\n");
}

/**
 * Rend un template d'email avec variables {{nom}}.
 */
export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ""));
}
