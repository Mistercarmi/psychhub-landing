import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.config.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      cabinetNom: "Cabinet de Psychologie",
      praticienNom: "Praticien",
      tarifDefaut: 60,
      dureeDefaut: 50,
      tvaDefaut: 0,
      prefixeFacture: "F",
      templateMailConfirmation:
        "Bonjour {{prenom}},\n\nJe vous confirme notre rendez-vous le {{date}} à {{heure}}.\n\nCordialement,\n{{praticien}}",
      templateMailRelance:
        "Bonjour {{prenom}},\n\nSauf erreur de ma part, la facture n°{{numero}} d'un montant de {{montant}} € reste en attente de règlement.\n\nCordialement,\n{{praticien}}"
    }
  });

  const existing = await prisma.patient.findFirst({ where: { nom: "Démo", prenom: "Patient" } });
  if (!existing) {
    await prisma.patient.create({
      data: {
        nom: "Démo",
        prenom: "Patient",
        email: "demo@example.com",
        motifConsult: "Patient de démonstration — supprimez-moi après vérification.",
        notesCliniques: "Aucune note."
      }
    });
  }

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
