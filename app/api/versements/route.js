import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// =====================
// GET /api/versements
// =====================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const traitementId = searchParams.get("traitementId");

    const where = {};
    if (patientId) where.patientId = Number(patientId);
    if (traitementId) where.traitementId = Number(traitementId);

    const versements = await prisma.paiement.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        patient: { select: { id: true, nom: true, telephone: true } },
        traitement: {
          select: {
            id: true,
            description: true,
            dent: true,
            prixTotal: true,
            statut: true,
          },
        },
      },
    });

    return NextResponse.json(versements);
  } catch (error) {
    console.error("GET /api/versements error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des versements" },
      { status: 500 }
    );
  }
}

// =====================
// POST /api/versements
// =====================
export async function POST(req) {
  try {
    const body = await req.json();
    const { patientId, traitementId, montant, note, date } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Le patient est obligatoire" },
        { status: 400 }
      );
    }

    const parsedMontant = parseFloat(montant);
    if (isNaN(parsedMontant) || parsedMontant <= 0) {
      return NextResponse.json(
        { error: "Le montant du versement doit être strictement supérieur à 0" },
        { status: 400 }
      );
    }

    // Verify patient
    const patient = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient introuvable" },
        { status: 404 }
      );
    }

    // If linked to treatment, validate ownership & remaining amount
    let traitement = null;
    if (traitementId) {
      traitement = await prisma.traitement.findUnique({
        where: { id: Number(traitementId) },
        include: { versements: true },
      });

      if (!traitement) {
        return NextResponse.json(
          { error: "Traitement introuvable" },
          { status: 404 }
        );
      }

      // Check ownership
      if (traitement.patientId !== Number(patientId)) {
        return NextResponse.json(
          {
            error:
              "Ce traitement n'appartient pas au patient sélectionné. Impossible d'associer le paiement.",
          },
          { status: 400 }
        );
      }

      // Calculate remaining amount
      const dejaPaye = (traitement.versements || []).reduce(
        (acc, v) => acc + (Number(v.montant) || 0),
        0
      );
      const reste = Math.max(0, (traitement.prixTotal || 0) - dejaPaye);

      if (parsedMontant > reste + 0.001) {
        return NextResponse.json(
          {
            error: `Le montant (${parsedMontant.toLocaleString(
              "fr-FR"
            )} DZD) dépasse le reste à payer pour ce traitement (${reste.toLocaleString(
              "fr-FR"
            )} DZD)`,
          },
          { status: 400 }
        );
      }
    }

    // Create payment in transaction
    const versement = await prisma.$transaction(async (tx) => {
      const p = await tx.paiement.create({
        data: {
          patientId: Number(patientId),
          traitementId: traitementId ? Number(traitementId) : null,
          montant: parsedMontant,
          note: note?.trim() || null,
          date: date ? new Date(date) : new Date(),
        },
        include: {
          patient: { select: { id: true, nom: true } },
          traitement: {
            select: {
              id: true,
              description: true,
              dent: true,
              prixTotal: true,
              statut: true,
            },
          },
        },
      });

      return p;
    });

    return NextResponse.json(versement, { status: 201 });
  } catch (error) {
    console.error("POST /api/versements error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de l'enregistrement du versement" },
      { status: 500 }
    );
  }
}

// =====================
// DELETE /api/versements
// =====================
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant du versement est requis" },
        { status: 400 }
      );
    }

    await prisma.paiement.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({
      message: "Versement supprimé avec succès",
    });
  } catch (error) {
    console.error("DELETE /api/versements error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du versement" },
      { status: 500 }
    );
  }
}

