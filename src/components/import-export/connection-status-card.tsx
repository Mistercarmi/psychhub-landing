"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Cloud, Unplug, ShieldCheck, Pencil, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { disconnectGoogle } from "@/server/config.actions";

type Props = {
  connected: boolean;
  email?: string | null;
  connectedAt?: string | null;
  mode: "READ_ONLY" | "READ_WRITE";
};

export function ConnectionStatusCard({ connected, email, connectedAt, mode }: Props) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              État de la connexion Google
            </CardTitle>
            <CardDescription>
              La connexion s&apos;ouvre dans Chrome — votre compte Google déjà connecté sera proposé. Le
              refresh token reste sur ce poste.
            </CardDescription>
          </div>
          {connected ? (
            <Badge className="shrink-0">Connecté</Badge>
          ) : (
            <Badge variant="outline" className="shrink-0">Non connecté</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <span className="text-muted-foreground">Compte : </span>
              <span className="font-medium">{email ?? "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Mode : </span>
              <Badge variant={mode === "READ_ONLY" ? "outline" : "default"}>
                {mode === "READ_ONLY" ? (
                  <>
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    Lecture seule
                  </>
                ) : (
                  <>
                    <Pencil className="mr-1 h-3 w-3" />
                    Lecture-écriture
                  </>
                )}
              </Badge>
            </div>
            {connectedAt && (
              <div>
                <span className="text-muted-foreground">Connecté le : </span>
                <span>{new Date(connectedAt).toLocaleString("fr-FR")}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!connected ? (
            <>
              <Button asChild>
                <a href="/api/google/auth?mode=READ_WRITE">
                  <LogIn className="h-4 w-4" />
                  Connecter (lecture-écriture)
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/google/auth?mode=READ_ONLY">
                  <ShieldCheck className="h-4 w-4" />
                  Connecter (lecture seule)
                </a>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <a
                  href={`/api/google/auth?mode=${mode === "READ_ONLY" ? "READ_WRITE" : "READ_ONLY"}`}
                >
                  {mode === "READ_ONLY" ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Passer en lecture-écriture
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Passer en lecture seule
                    </>
                  )}
                </a>
              </Button>
              <ConfirmDialog
                destructive
                title="Déconnecter le compte Google ?"
                description="Le refresh token sera supprimé. Il faudra refaire le consent OAuth pour resynchroniser."
                confirmLabel="Déconnecter"
                trigger={
                  <Button variant="ghost">
                    <Unplug className="h-4 w-4" />
                    Déconnecter
                  </Button>
                }
                onConfirm={async () => {
                  await disconnectGoogle();
                  toast.success("Compte Google déconnecté");
                  router.refresh();
                }}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
