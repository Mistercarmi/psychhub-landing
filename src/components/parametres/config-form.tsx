"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { configSchema, type ConfigInput } from "@/lib/validators/config";
import { updateConfig } from "@/server/config.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ConfigForm({ initial }: { initial: Partial<ConfigInput> }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ConfigInput>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      cabinetNom: initial.cabinetNom ?? "",
      praticienNom: initial.praticienNom ?? "",
      adresse: initial.adresse ?? "",
      telephone: initial.telephone ?? "",
      email: initial.email ?? "",
      siret: initial.siret ?? "",
      adeli: initial.adeli ?? "",
      iban: initial.iban ?? "",
      tarifDefaut: initial.tarifDefaut ?? 60,
      dureeDefaut: initial.dureeDefaut ?? 50,
      tvaDefaut: initial.tvaDefaut ?? 0,
      prefixeFacture: initial.prefixeFacture ?? "F",
      templateMailRelance: initial.templateMailRelance ?? "",
      templateMailConfirmation: initial.templateMailConfirmation ?? "",
      templateMailRappelSeance: initial.templateMailRappelSeance ?? "",
      rappelsActifs: initial.rappelsActifs ?? false,
      rappelsHeuresAvant: initial.rappelsHeuresAvant ?? 24
    }
  });

  async function onSubmit(values: ConfigInput) {
    setSubmitting(true);
    try {
      await updateConfig(values);
      toast.success("Paramètres enregistrés");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identité du cabinet</CardTitle>
          <CardDescription>
            Ces informations apparaissent en haut de vos factures PDF et dans les
            emails envoyés à vos patients.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Field label="Nom du cabinet" help="Exemple : Cabinet Marie Durand">
            <Input placeholder="Cabinet de psychologie…" {...form.register("cabinetNom")} />
          </Field>
          <Field label="Votre nom (praticien)" help="Apparaît sous le nom du cabinet">
            <Input placeholder="Marie Durand" {...form.register("praticienNom")} />
          </Field>
          <Field label="Adresse postale" className="md:col-span-2">
            <Input
              placeholder="12 rue de la Paix, 75002 Paris"
              {...form.register("adresse")}
            />
          </Field>
          <Field label="Téléphone du cabinet">
            <Input
              type="tel"
              placeholder="01 23 45 67 89"
              {...form.register("telephone")}
            />
          </Field>
          <Field label="Email du cabinet">
            <Input
              type="email"
              placeholder="contact@cabinet.fr"
              {...form.register("email")}
            />
          </Field>
          <Field label="N° SIRET" help="14 chiffres — vérifié automatiquement (clé Luhn)">
            <Input
              placeholder="732 829 320 00074"
              inputMode="numeric"
              {...form.register("siret")}
            />
          </Field>
          <Field label="N° ADELI" help="Numéro d'identification professionnel">
            <Input placeholder="751234567" {...form.register("adeli")} />
          </Field>
          <Field
            label="IBAN (pour recevoir les paiements)"
            help="Vérifié automatiquement (clé mod-97). Apparaît sur les factures."
            className="md:col-span-2"
          >
            <Input
              placeholder="FR76 1234 5678 9012 3456 7890 123"
              {...form.register("iban")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifs et durées par défaut</CardTitle>
          <CardDescription>
            Ces valeurs sont proposées automatiquement à chaque nouvelle séance ou
            facture. Vous pouvez toujours les modifier au cas par cas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Field label="Tarif d'une séance (€)" help="Souvent 60, 70 ou 80 €">
            <Input
              type="number"
              step="0.01"
              placeholder="60"
              {...form.register("tarifDefaut")}
            />
          </Field>
          <Field label="Durée d'une séance (min)" help="Souvent 45 ou 50 min">
            <Input
              type="number"
              placeholder="50"
              {...form.register("dureeDefaut")}
            />
          </Field>
          <Field label="TVA (%)" help="0 % pour les psychologues libéraux">
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              {...form.register("tvaDefaut")}
            />
          </Field>
          <Field label="Préfixe des factures" help="Ex : F → F2026-0042">
            <Input placeholder="F" {...form.register("prefixeFacture")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails automatiques (modèles)</CardTitle>
          <CardDescription>
            Ces textes sont insérés automatiquement quand vous envoyez un email depuis
            PsychHub. Les variables entre <code>{"{{ }}"}</code> sont remplacées par les
            vraies valeurs (nom du patient, montant…).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="rounded-md border bg-muted/20 p-3 text-xs">
            <div className="mb-1 font-medium">Variables que vous pouvez utiliser :</div>
            <code className="block">
              {"{{prenom}} · {{nom}} · {{numero}} · {{montant}} · {{date}} · {{heure}} · {{duree}} · {{praticien}}"}
            </code>
          </div>
          <Field
            label="Email de confirmation de rendez-vous"
            help="Envoyé quand vous créez une nouvelle séance et cliquez sur « Envoyer la confirmation »."
          >
            <Textarea
              rows={4}
              placeholder="Bonjour {{prenom}}, je vous confirme notre rendez-vous le {{date}} à {{heure}}. Cordialement, {{praticien}}"
              {...form.register("templateMailConfirmation")}
            />
          </Field>
          <Field
            label="Email de relance de facture impayée"
            help="Envoyé depuis le bouton « Relancer » sur une facture en retard."
          >
            <Textarea
              rows={4}
              placeholder="Bonjour {{prenom}}, je n'ai pas encore reçu le règlement de la facture {{numero}} d'un montant de {{montant}} €. Pourriez-vous régulariser ? Merci, {{praticien}}"
              {...form.register("templateMailRelance")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rappels avant séance</CardTitle>
          <CardDescription>
            Active une page « Rappels » qui liste les séances à venir dans la fenêtre
            choisie, pour préparer un brouillon mail à chaque patient. Aucun envoi
            automatique — vous validez chaque rappel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Field
            label="Activer les rappels automatiques"
            help="Quand activé, un badge dans la barre latérale signale les séances à rappeler."
          >
            <label className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                {...form.register("rappelsActifs")}
              />
              <span className="text-sm">Activer</span>
            </label>
          </Field>
          <Field
            label="Délai avant la séance (heures)"
            help="Entre 1 et 168 (1 semaine). 24 h par défaut."
          >
            <Input
              type="number"
              min={1}
              max={168}
              placeholder="24"
              {...form.register("rappelsHeuresAvant")}
            />
          </Field>
          <Field
            label="Modèle d'email de rappel de séance"
            help="Variables disponibles : {{prenom}}, {{nom}}, {{date}}, {{heure}}, {{duree}}, {{praticien}}."
            className="md:col-span-2"
          >
            <Textarea
              rows={5}
              placeholder="Bonjour {{prenom}}, je vous rappelle votre rendez-vous prévu le {{date}} à {{heure}}. Durée : {{duree}} minutes. Cordialement, {{praticien}}"
              {...form.register("templateMailRappelSeance")}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  help,
  children,
  className
}: {
  label: string;
  /** Texte d'aide affiché sous le label en plus petit. */
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}
