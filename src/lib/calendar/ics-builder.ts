/**
 * Génération minimaliste de flux iCalendar (RFC 5545).
 * Aucune dépendance externe. Compatible Google Calendar / Outlook / Apple Calendar.
 */

export interface IcsEvent {
  uid: string;
  /** Date de début (UTC ou locale ; on émet en UTC pour cohérence). */
  start: Date;
  /** Durée en minutes. */
  durationMinutes: number;
  summary: string;
  description?: string;
  location?: string;
  /** Statut du calendrier : CONFIRMED | TENTATIVE | CANCELLED. */
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  /** Horodatage de dernière modification. */
  lastModified?: Date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function foldLine(line: string): string {
  // RFC 5545 : lignes ≤ 75 octets ; replier avec CRLF + espace.
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push(line.slice(i, i + 75));
    i += 75;
  }
  return parts.join("\r\n ");
}

export function buildIcs(events: IcsEvent[], opts: { prodId?: string; calName?: string } = {}): string {
  const prodId = opts.prodId ?? "-//PsychHub//Cabinet//FR";
  const calName = opts.calName ?? "PsychHub";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calName)}`,
    `X-WR-TIMEZONE:Europe/Paris`
  ];

  const now = new Date();
  for (const ev of events) {
    const end = new Date(ev.start.getTime() + ev.durationMinutes * 60_000);
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(`DTSTAMP:${formatUtc(now)}`);
    lines.push(`DTSTART:${formatUtc(ev.start)}`);
    lines.push(`DTEND:${formatUtc(end)}`);
    lines.push(foldLine(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${escapeText(ev.description)}`));
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeText(ev.location)}`));
    if (ev.status) lines.push(`STATUS:${ev.status}`);
    if (ev.lastModified) lines.push(`LAST-MODIFIED:${formatUtc(ev.lastModified)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
