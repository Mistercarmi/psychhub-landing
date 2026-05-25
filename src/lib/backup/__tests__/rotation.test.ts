import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { pruneLocalBackups } from "@/lib/backup/rotation";

let tmpDir: string;

async function makeBackupFile(name: string, ageDays: number, size = 100): Promise<string> {
  const filePath = path.join(tmpDir, name);
  await fs.writeFile(filePath, Buffer.alloc(size, 0));
  const t = Date.now() - ageDays * 86_400_000;
  await fs.utimes(filePath, t / 1000, t / 1000);
  return filePath;
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "psychhub-rotation-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe("pruneLocalBackups", () => {
  it("returns empty result when directory does not exist (ENOENT est silencieux)", async () => {
    const r = await pruneLocalBackups({
      retentionDays: 30,
      minKeep: 7,
      dir: path.join(tmpDir, "nope")
    });
    expect(r.scanned).toBe(0);
    expect(r.deleted).toEqual([]);
    // ENOENT ne pollue pas le rapport d'erreurs
    expect(r.errors).toEqual([]);
  });

  it("remonte les erreurs readdir non-ENOENT dans result.errors", async () => {
    const targetPath = path.join(tmpDir, "afile.txt");
    await fs.writeFile(targetPath, "not a directory");
    // Passer un fichier en `dir` provoque ENOTDIR — différent de ENOENT
    const r = await pruneLocalBackups({
      retentionDays: 30,
      minKeep: 0,
      dir: targetPath
    });
    expect(r.scanned).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0].error).toMatch(/readdir failed/);
  });

  it("ignores unknown filenames", async () => {
    await fs.writeFile(path.join(tmpDir, "random.txt"), "hi");
    await fs.writeFile(path.join(tmpDir, "psychhub.bak"), "hi");
    const r = await pruneLocalBackups({ retentionDays: 1, minKeep: 0, dir: tmpDir });
    expect(r.scanned).toBe(0);
    expect(r.deleted).toEqual([]);
  });

  it("keeps everything when retentionDays <= 0", async () => {
    await makeBackupFile("psychhub-backup-2020-01-01-1200.json", 1000);
    await makeBackupFile("psychhub-backup-2020-01-02-1200.xlsx", 999);
    const r = await pruneLocalBackups({ retentionDays: 0, minKeep: 0, dir: tmpDir });
    expect(r.deleted).toEqual([]);
    expect(r.kept).toBe(2);
  });

  it("deletes files older than retentionDays", async () => {
    await makeBackupFile("psychhub-backup-2025-01-01-1200.json", 100);
    await makeBackupFile("psychhub-backup-2025-02-01-1200.json", 50);
    await makeBackupFile("psychhub-backup-2025-03-01-1200.json", 5);
    const r = await pruneLocalBackups({ retentionDays: 30, minKeep: 0, dir: tmpDir });
    // Les 2 plus anciens (100j, 50j) doivent être supprimés ; le récent (5j) gardé
    expect(r.deleted.sort()).toEqual([
      "psychhub-backup-2025-01-01-1200.json",
      "psychhub-backup-2025-02-01-1200.json"
    ]);
    expect(r.kept).toBe(1);
  });

  it("respects minKeep even when files exceed retention age", async () => {
    await makeBackupFile("psychhub-backup-2025-01-01-1200.json", 100);
    await makeBackupFile("psychhub-backup-2025-01-02-1200.json", 90);
    await makeBackupFile("psychhub-backup-2025-01-03-1200.json", 80);
    // Tous sont trop vieux pour retentionDays=30, mais minKeep=2 doit en garder 2
    const r = await pruneLocalBackups({ retentionDays: 30, minKeep: 2, dir: tmpDir });
    expect(r.deleted.length).toBe(1);
    expect(r.kept).toBe(2);
  });

  it("dryRun does not touch the filesystem", async () => {
    await makeBackupFile("psychhub-backup-2025-01-01-1200.json", 100);
    await pruneLocalBackups({ retentionDays: 30, minKeep: 0, dir: tmpDir, dryRun: true });
    const remaining = await fs.readdir(tmpDir);
    expect(remaining).toContain("psychhub-backup-2025-01-01-1200.json");
  });

  it("supports both backup and snapshot filename patterns", async () => {
    await makeBackupFile("psychhub-backup-2024-01-01-1200.xlsx", 100);
    await makeBackupFile("psychhub-snapshot-2024-01-01-1200.xlsx", 100);
    const r = await pruneLocalBackups({ retentionDays: 30, minKeep: 0, dir: tmpDir });
    expect(r.deleted.sort()).toEqual([
      "psychhub-backup-2024-01-01-1200.xlsx",
      "psychhub-snapshot-2024-01-01-1200.xlsx"
    ]);
  });

  it("reports freed bytes", async () => {
    await makeBackupFile("psychhub-backup-2025-01-01-1200.json", 100, 1024);
    await makeBackupFile("psychhub-backup-2025-01-02-1200.json", 90, 2048);
    const r = await pruneLocalBackups({ retentionDays: 30, minKeep: 0, dir: tmpDir });
    expect(r.freedBytes).toBe(1024 + 2048);
  });
});
