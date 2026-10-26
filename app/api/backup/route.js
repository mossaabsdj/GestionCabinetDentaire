import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptBackup } from "@/lib/backup-crypto";

export const dynamic = "force-dynamic";

async function fetchAllData() {
  const [
    patients,
    consultations,
    rendezVous,
    ordonnances,
    ordonnanceItems,
    medicaments,
    bilans,
    bilanRecips,
    bilanItems,
    bilanTypes,
    bilanTypeItems,
    recetteTypes,
    recetteTypeItems,
    paiements,
    vaccines,
    vaccinations,
    radios,
    bilanFiles,
    justifications,
    justificationTypes,
    cabinets,
    traitements,
    consultationsTraitement,
    depenses,
  ] = await Promise.all([
    prisma.patient.findMany(),
    prisma.consultation.findMany(),
    prisma.rendezVous.findMany(),
    prisma.ordonnance.findMany(),
    prisma.ordonnanceItem.findMany(),
    prisma.medicament.findMany(),
    prisma.bilan.findMany(),
    prisma.bilanRecip.findMany(),
    prisma.bilanItem.findMany(),
    prisma.bilanType.findMany(),
    prisma.bilanTypeItem.findMany(),
    prisma.recetteType.findMany(),
    prisma.recetteTypeItem.findMany(),
    prisma.paiement.findMany(),
    prisma.vaccine.findMany(),
    prisma.vaccination.findMany(),
    prisma.radio.findMany(),
    prisma.bilanFile.findMany(),
    prisma.justification.findMany(),
    prisma.justificationType.findMany(),
    prisma.cabinet.findMany(),
    prisma.traitement.findMany(),
    prisma.consultationTraitement.findMany(),
    prisma.depense.findMany(),
  ]);

  return {
    app: "dentaire",
    version: "4.0.2",
    exportedAt: new Date().toISOString(),
    counts: {
      patients: patients.length,
      consultations: consultations.length,
      ordonnances: ordonnances.length,
      medicaments: medicaments.length,
      bilans: bilans.length,
      vaccines: vaccines.length,
      justifications: justifications.length,
      depenses: depenses.length,
    },
    data: {
      cabinets,
      medicaments,
      bilans,
      vaccines,
      justificationTypes,
      bilanTypes,
      bilanTypeItems,
      recetteTypes,
      recetteTypeItems,
      rendezVous,
      patients,
      consultations,
      ordonnances,
      ordonnanceItems,
      bilanRecips,
      bilanItems,
      justifications,
      vaccinations,
      paiements,
      radios,
      bilanFiles,
      traitements,
      consultationsTraitement,
      depenses,
    },
  };
}

export async function GET(req) {
  try {
    const backupPayload = await fetchAllData();
    const timestamp = new Date().toISOString().slice(0, 10);

    const url = new URL(req.url);
    const password = url.searchParams.get("password");

    if (password) {
      const encrypted = encryptBackup(backupPayload, password, "dentaire");
      const filename = `backup_dentaire_${timestamp}.cbak`;
      return new Response(JSON.stringify(encrypted, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Default response for internal Electron main process fetch
    return new Response(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Backup API Error:", error.message);
    return NextResponse.json(
      {
        error: "Échec de l'exportation de la base de données: " + error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = body?.password || null;

    const backupPayload = await fetchAllData();
    const encrypted = encryptBackup(backupPayload, password, "dentaire");
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `backup_dentaire_${timestamp}.cbak`;

    return new Response(JSON.stringify(encrypted, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup API POST Error:", error.message);
    return NextResponse.json(
      {
        error: "Échec du chiffrement de la sauvegarde: " + error.message,
      },
      { status: 500 },
    );
  }
}
