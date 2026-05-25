import { Topbar } from "@/components/layout/topbar";
import { prisma } from "@/lib/db";
import { getBackupHealth, getTimeline } from "@/lib/backup/service";
import { HealthBanner } from "@/components/sauvegardes/health-banner";
import { BackupTimeline } from "@/components/sauvegardes/backup-timeline";
import { DestinationsConfigCard } from "@/components/sauvegardes/destinations-config-card";
import { FullSnapshotButton } from "@/components/sauvegardes/full-snapshot-button";

export const dynamic = "force-dynamic";

export default async function SauvegardesPage() {
  const [config, health, entries] = await Promise.all([
    prisma.config.findUnique({ where: { id: "default" } }),
    getBackupHealth(),
    getTimeline(200)
  ]);

  const driveConnected = Boolean(config?.googleRefreshToken);
  const externalConfigured = Boolean(config?.externalBackupFolder);

  return (
    <>
      <Topbar title="Sauvegardes" />
      <div className="flex-1 space-y-4 overflow-y-auto p-6">
        <HealthBanner
          lastBackupAt={health.lastBackupAt}
          daysSinceLast={health.daysSinceLast}
          status={health.status}
          warningThresholdDays={health.warningThresholdDays}
          nextScheduledAt={health.nextScheduledAt}
          autoEnabled={health.autoEnabled}
          intervalHours={health.intervalHours}
          driveConnected={driveConnected}
          externalConfigured={externalConfigured}
        />

        <div className="flex flex-wrap gap-2">
          <FullSnapshotButton externalConfigured={externalConfigured} label="Exporter toute la base" />
        </div>

        <DestinationsConfigCard
          autoEnabled={health.autoEnabled}
          intervalHours={health.intervalHours}
          warningThresholdDays={health.warningThresholdDays}
          externalFolder={config?.externalBackupFolder ?? null}
        />

        <BackupTimeline entries={entries} />
      </div>
    </>
  );
}
