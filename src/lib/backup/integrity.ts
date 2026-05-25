/**
 * Vérification d'intégrité d'un fichier de sauvegarde via SHA-256.
 * Helpers réutilisables pour `BackupLog.hash` et `signatureValid`.
 */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

export async function hashFile(filePath: string): Promise<string> {
  const buf = await readFile(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export interface IntegrityCheckResult {
  valid: boolean;
  /** Hash calculé maintenant. */
  currentHash: string | null;
  /** Hash attendu (depuis BackupLog). */
  expectedHash: string | null;
  /** Taille fichier en octets. null si fichier introuvable. */
  sizeBytes: number | null;
  reason?: string;
}

/**
 * Vérifie qu'un fichier existe encore et que son hash correspond à celui stocké.
 * - fichier absent → `{ valid: false, reason: "Fichier introuvable" }`
 * - pas de hash stocké → `{ valid: true, ...  }` (legacy backup sans hash, on tolère)
 * - hash mismatch → `{ valid: false, reason: "Hash mismatch" }`
 */
export async function verifyBackupIntegrity(
  filePath: string | null,
  expectedHash: string | null
): Promise<IntegrityCheckResult> {
  if (!filePath) {
    return {
      valid: false,
      currentHash: null,
      expectedHash,
      sizeBytes: null,
      reason: "Pas de chemin de fichier"
    };
  }
  try {
    const s = await stat(filePath);
    if (!s.isFile()) {
      return {
        valid: false,
        currentHash: null,
        expectedHash,
        sizeBytes: null,
        reason: "Le chemin ne pointe pas vers un fichier"
      };
    }
    const currentHash = await hashFile(filePath);
    if (!expectedHash) {
      return {
        valid: true,
        currentHash,
        expectedHash: null,
        sizeBytes: s.size,
        reason: "Aucun hash stocké (backup legacy) — fichier présent"
      };
    }
    const ok = currentHash === expectedHash;
    return {
      valid: ok,
      currentHash,
      expectedHash,
      sizeBytes: s.size,
      reason: ok ? undefined : "Hash mismatch — le fichier a été modifié"
    };
  } catch (err) {
    return {
      valid: false,
      currentHash: null,
      expectedHash,
      sizeBytes: null,
      reason: err instanceof Error ? err.message : "Fichier introuvable"
    };
  }
}
