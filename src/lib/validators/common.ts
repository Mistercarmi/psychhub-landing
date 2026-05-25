import { z } from "zod";
import * as ibanLib from "iban";
import { parsePhoneNumberFromString } from "libphonenumber-js";

const sanitize = (s: string) => s.replace(/\s+/g, "").toUpperCase();

export const ibanSchema = z
  .string()
  .transform((v) => sanitize(v))
  .refine((v) => v === "" || ibanLib.isValid(v), {
    message: "IBAN invalide (vérifiez les caractères et la clé de contrôle)"
  });

export const phoneSchema = z.string().refine(
  (v) => {
    if (v === "" || v == null) return true;
    const parsed = parsePhoneNumberFromString(v, "FR");
    return parsed?.isValid() ?? false;
  },
  { message: "Numéro de téléphone invalide" }
);

function luhnChecksum(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export const siretSchema = z.string().refine(
  (v) => {
    if (v === "" || v == null) return true;
    const clean = v.replace(/\s+/g, "");
    if (!/^\d{14}$/.test(clean)) return false;
    return luhnChecksum(clean);
  },
  { message: "SIRET invalide (14 chiffres + clé Luhn)" }
);

// Validation INSEE du numéro de Sécurité Sociale (13 ou 15 chiffres).
// Format : SAAMM DD LLLOOO CC, clé = 97 - (numéro % 97).
export const numeroSecuSchema = z.string().refine(
  (v) => {
    if (v === "" || v == null) return true;
    const clean = v.replace(/\s+/g, "");
    if (clean.length !== 13 && clean.length !== 15) return false;
    if (!/^[12]\d{12}(\d{2})?$/.test(clean)) return false;
    if (clean.length === 13) return true;
    const numero = clean.slice(0, 13).replace(/[AB]/i, "0");
    const cle = parseInt(clean.slice(13), 10);
    return 97 - (parseInt(numero, 10) % 97) === cle;
  },
  { message: "Numéro de sécurité sociale invalide" }
);
