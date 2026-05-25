import fr from "@/messages/fr.json";
import en from "@/messages/en.json";

export type Locale = "fr" | "en";
export type Messages = typeof fr;

const dictionaries: Record<Locale, Messages> = { fr, en: en as Messages };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? fr;
}

export function t(locale: Locale, path: string): string {
  const segments = path.split(".");
  let current: unknown = getMessages(locale);
  for (const seg of segments) {
    if (typeof current !== "object" || current == null) return path;
    current = (current as Record<string, unknown>)[seg];
  }
  return typeof current === "string" ? current : path;
}
