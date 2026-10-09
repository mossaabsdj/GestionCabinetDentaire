import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// =====================
// GET /api/traitements
// =====================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");
    const id = searchParams.get("id");
    const statut = searchParams.get("statut");

    if (id) {
      const traitement = await prisma.traitement.findUnique({
        where: { id: Number(id) },
        include: {
          patient: {
            select: { id: true, nom: true, telephone: true },
          },
          versements: {
            orderBy: { date: "desc" },
          },
          consultationsTraitement: {
            orderBy: { createdAt: "desc" },
            include: {
              consultation: {
                select: {
                  id: true,
                  createdAt: true,
                  motifDeConsultation: true,
                  note: true,
                  ordonnance: {
                    include: {
                      items: {
                        include: { medicament: true },
                      },
                    },
                  },
                  bilanRecip: {
                    include: {
                      items: {
                        include: { bilan: true },
                      },
                    },
                  },
                  rendezVous: {
                    select: { id: true, date: true, description: true },
                  },
                },
              },
            },
          },
          rendezVous: {
            orderBy: { date: "asc" },
          },
        },
      });

      if (!traitement) {
        return NextResponse.json(
          { error: "Traitement non trouvé" },
          { status: 404 }
        );
      }

      const totalPaye = (traitement.versements || []).reduce(
        (sum, v) => sum + (Number(v.montant) || 0),
        0
      );
      const resteAPayer = Math.max(0, (traitement.prixTotal || 0) - totalPaye);

      return NextResponse.json({
        ...traitement,
        totalPaye,
        resteAPayer,
      });
    }

    const where = {};
    if (patientId) where.patientId = Number(patientId);
    if (statut) where.statut = statut;

    const traitements = await prisma.traitement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        patient: {
          select: { id: true, nom: true, telephone: true },
        },
        versements: {
          orderBy: { date: "desc" },
        },
        consultationsTraitement: {
          orderBy: { createdAt: "desc" },
          include: {
            consultation: {
              select: {
                id: true,
                createdAt: true,
                motifDeConsultation: true,
                note: true,
                ordonnance: {
                  include: {
                    items: {
                      include: { medicament: true },
                    },
                  },
                },
                bilanRecip: {
                  include: {
                    items: {
                      include: { bilan: true },
                    },
                  },
                },
                rendezVous: {
                  select: { id: true, date: true, description: true },
                },
              },
            },
          },
        },
        rendezVous: {
          orderBy: { date: "asc" },
        },
      },
    });

    const enriched = traitements.map((t) => {
      const totalPaye = (t.versements || []).reduce(
        (sum, v) => sum + (Number(v.montant) || 0),
        0
      );
      const resteAPayer = Math.max(0, (t.prixTotal || 0) - totalPaye);
      return {
        ...t,
        totalPaye,
        resteAPayer,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /api/traitements error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des traitements" },
      { status: 500 }
    );
  }
}

// =====================
// POST /api/traitements
// =====================
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      patientId,
      description,
      dent,
      prixTotal,
      statut,
      versement,
      rendezVous,
    } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: "Le patient est obligatoire" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "La description du traitement est obligatoire" },
        { status: 400 }
      );
    }

    const parsedPrixTotal = parseFloat(prixTotal);
    if (isNaN(parsedPrixTotal) || parsedPrixTotal < 0) {
      return NextResponse.json(
        { error: "Le prix total doit être un montant positif ou nul" },
        { status: 400 }
      );
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
    });
    if (!patient) {
      return NextResponse.json(
        { error: "Patient introuvable" },
        { status: 404 }
      );
    }

    // Use transaction if initial versement or rendezvous is attached
    const created = await prisma.$transaction(async (tx) => {
      const traitement = await tx.traitement.create({
        data: {
          patientId: Number(patientId),
          description: description.trim(),
          dent: dent?.trim() || null,
          prixTotal: parsedPrixTotal,
          statut: statut || "EN_COURS",
        },
      });

      // Optional initial versement
      if (versement && Number(versement.montant) > 0) {
        const montant = parseFloat(versement.montant);
        if (montant > parsedPrixTotal) {
          throw new Error(
            "Le versement initial ne peut pas dépasser le prix total du traitement"
          );
        }
        await tx.paiement.create({
          data: {
            patientId: Number(patientId),
            traitementId: traitement.id,
            montant,
            note: versement.note?.trim() || null,
            date: versement.date ? new Date(versement.date) : new Date(),
          },
        });
      }

      // Optional next appointment
      if (rendezVous && rendezVous.date) {
        await tx.rendezVous.create({
          data: {
            patientId: Number(patientId),
            traitementId: traitement.id,
            date: new Date(rendezVous.date),
            description:
              rendezVous.description?.trim() ||
              `Suite du traitement: ${description.trim()}`,
            note: rendezVous.note?.trim() || null,
          },
        });
      }

      return traitement;
    });

    // Return the full treatment with relations
    const fullTraitement = await prisma.traitement.findUnique({
      where: { id: created.id },
      include: {
        versements: true,
        consultationsTraitement: true,
        rendezVous: true,
      },
    });

    const totalPaye = (fullTraitement.versements || []).reduce(
      (sum, v) => sum + (Number(v.montant) || 0),
      0
    );
    const resteAPayer = Math.max(0, fullTraitement.prixTotal - totalPaye);

    return NextResponse.json(
      {
        ...fullTraitement,
        totalPaye,
        resteAPayer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/traitements error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la création du traitement" },
      { status: 400 }
    );
  }
}

// =====================
// PUT /api/traitements
// =====================
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, description, dent, prixTotal, statut } = body;

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant du traitement est requis" },
        { status: 400 }
      );
    }

    const existing = await prisma.traitement.findUnique({
      where: { id: Number(id) },
      include: { versements: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Traitement introuvable" },
        { status: 404 }
      );
    }

    const data = {};
    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json(
          { error: "La description ne peut pas être vide" },
          { status: 400 }
        );
      }
      data.description = description.trim();
    }

    if (dent !== undefined) {
      data.dent = dent?.trim() || null;
    }

    if (prixTotal !== undefined) {
      const parsedPrix = parseFloat(prixTotal);
      if (isNaN(parsedPrix) || parsedPrix < 0) {
        return NextResponse.json(
          { error: "Le prix total doit être un montant valide" },
          { status: 400 }
        );
      }
      data.prixTotal = parsedPrix;
    }

    if (statut !== undefined) {
      if (!["EN_COURS", "TERMINE", "ANNULE"].includes(statut)) {
        return NextResponse.json(
          { error: "Statut invalide (EN_COURS, TERMINE, ANNULE attendus)" },
          { status: 400 }
        );
      }
      data.statut = statut;
    }

    const updated = await prisma.traitement.update({
      where: { id: Number(id) },
      data,
      include: {
        patient: { select: { id: true, nom: true } },
        versements: { orderBy: { date: "desc" } },
        consultationsTraitement: {
          include: {
            consultation: {
              select: {
                id: true,
                createdAt: true,
                motifDeConsultation: true,
                note: true,
              },
            },
          },
        },
        rendezVous: { orderBy: { date: "asc" } },
      },
    });

    const totalPaye = (updated.versements || []).reduce(
      (sum, v) => sum + (Number(v.montant) || 0),
      0
    );
    const resteAPayer = Math.max(0, updated.prixTotal - totalPaye);

    return NextResponse.json({
      ...updated,
      totalPaye,
      resteAPayer,
    });
  } catch (error) {
    console.error("PUT /api/traitements error:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur lors de la mise à jour du traitement" },
      { status: 500 }
    );
  }
}

// =====================
// DELETE /api/traitements
// =====================
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "L'identifiant du traitement est requis" },
        { status: 400 }
      );
    }

    await prisma.traitement.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({
      message: "Traitement supprimé avec succès",
    });
  } catch (error) {
    console.error("DELETE /api/traitements error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du traitement" },
      { status: 500 }
    );
  }
}

