import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ====================
// GET consultations (all or by patientId)
// ====================
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patientId");

  try {
    const consultations = await prisma.consultation.findMany({
      where: patientId ? { patientId: Number(patientId) } : {},
      include: {
        radios: true,
        bilansFiles: true,
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
        justificationRecord: true,
        patient: { select: { id: true, nom: true } },
        rendezVous: { select: { id: true, date: true, description: true } },
        consultationsTraitement: {
          include: {
            traitement: {
              include: {
                versements: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(consultations);
  } catch (error) {
    console.error("GET consultations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch consultations" },
      { status: 500 },
    );
  }
}

// ====================
// POST: Create new consultation
// ====================
export async function POST(req) {
  try {
    const data = await req.json();

    const consultDate = data.createdAt ? new Date(data.createdAt) : new Date();

    // Auto-create RendezVous if provided at top-level
    let rendezVousId = data.rendezVousId ? Number(data.rendezVousId) : null;

    if (!rendezVousId && data.rendezVousDate) {
      const rendezVous = await prisma.rendezVous.create({
        data: {
          patientId: Number(data.patientId),
          date: new Date(data.rendezVousDate),
          description: data.rendezVousDescription || "Consultation programmée",
        },
      });
      rendezVousId = rendezVous.id;
    }

    const consultation = await prisma.$transaction(async (tx) => {
      const createdConsult = await tx.consultation.create({
        data: {
          patientId: Number(data.patientId),
          note: data.note,
          createdAt: consultDate,
          motifDeConsultation: data.motifDeConsultation || null,
          justification:
            typeof data.justification === "string" ? data.justification : null,
          rendezVousId,

          // Justification
          justificationRecord:
            data.justificationRecord ||
            (typeof data.justification === "object" &&
              data.justification !== null) ||
            (typeof data.justification === "string" && data.justification.trim())
              ? {
                  create: {
                    patientId: Number(data.patientId),
                    createdAt: data.createdAt
                      ? new Date(data.createdAt)
                      : undefined,
                    texte:
                      (data.justificationRecord || data.justification)?.texte ||
                      (typeof data.justification === "string" ? data.justification : ""),
                  },
                }
              : undefined,

          // Ordonnance
          ordonnance: data.ordonnance
            ? {
                create: {
                  createdAt: data.createdAt
                    ? new Date(data.createdAt)
                    : undefined,

                  patientId: Number(data.patientId),
                  items: {
                    create: data.ordonnance.items.map((item) => ({
                      medicamentId: item.medicamentId,
                      dosage: item.dosage,
                      frequence: item.frequence,
                      duree: item.duree,
                      quantite: parseInt(item.quantite) || 0,
                    })),
                  },
                },
              }
            : undefined,

          // BilanRecip
          bilanRecip: data.bilanRecip
            ? {
                create: {
                  createdAt: data.createdAt
                    ? new Date(data.createdAt)
                    : undefined,

                  patientId: Number(data.patientId),
                  items: {
                    create: data.bilanRecip.items.map((item) => ({
                      bilanId: item.bilanId,
                      resultat: item.resultat,
                      remarque: item.remarque,
                    })),
                  },
                },
              }
            : undefined,

          // Radios
          radios:
            data.radios && Array.isArray(data.radios) && data.radios.length > 0
              ? {
                  create: data.radios.map((r) => ({
                    patientId: Number(data.patientId),
                    description: r.description || null,
                    fichier: r.fichier || null,
                  })),
                }
              : undefined,
        },
      });

      // Handle attached treatments
      if (Array.isArray(data.traitements) && data.traitements.length > 0) {
        for (const tr of data.traitements) {
          let targetTraitementId = tr.traitementId
            ? Number(tr.traitementId)
            : null;

          // If new treatment creation requested
          if (!targetTraitementId && tr.nouveauTraitement) {
            const newT = await tx.traitement.create({
              data: {
                patientId: Number(data.patientId),
                description: tr.nouveauTraitement.description.trim(),
                dent: tr.nouveauTraitement.dent?.trim() || null,
                prixTotal: parseFloat(tr.nouveauTraitement.prixTotal) || 0,
                statut: tr.nouveauTraitement.statut || "EN_COURS",
              },
            });
            targetTraitementId = newT.id;
          }

          if (targetTraitementId) {
            // Create session link with act performed
            await tx.consultationTraitement.create({
              data: {
                consultationId: createdConsult.id,
                traitementId: targetTraitementId,
                acteRealise: tr.acteRealise?.trim() || null,
              },
            });

            // Optional session versement
            if (tr.versement && Number(tr.versement.montant) > 0) {
              const montant = parseFloat(tr.versement.montant);
              await tx.paiement.create({
                data: {
                  patientId: Number(data.patientId),
                  traitementId: targetTraitementId,
                  montant,
                  note:
                    tr.versement.note?.trim() ||
                    `Séance consultation #${createdConsult.id}`,
                  date: tr.versement.date
                    ? new Date(tr.versement.date)
                    : consultDate,
                },
              });
            }

            // Optional next appointment for this treatment
            if (tr.rendezVous && tr.rendezVous.date) {
              await tx.rendezVous.create({
                data: {
                  patientId: Number(data.patientId),
                  traitementId: targetTraitementId,
                  date: new Date(tr.rendezVous.date),
                  description:
                    tr.rendezVous.description?.trim() ||
                    `Prochaine séance de soin`,
                  note: tr.rendezVous.note?.trim() || null,
                },
              });
            }
          }
        }
      }

      return await tx.consultation.findUnique({
        where: { id: createdConsult.id },
        include: {
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
          justificationRecord: true,
          radios: true,
          rendezVous: true,
          consultationsTraitement: {
            include: {
              traitement: {
                include: {
                  versements: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(consultation);
  } catch (error) {
    console.error("POST consultation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create consultation" },
      { status: 500 },
    );
  }
}

// ====================
// PUT: Update consultation
// ====================
export async function PUT(req) {
  try {
    const data = await req.json();
    const {
      id,
      patientId,
      note,
      createdAt,
      motifDeConsultation,
      justification,
      justificationRecord,
      rendezVousId,
      rendezVousDate,
      rendezVousDescription,
    } = data;

    if (!id) {
      return NextResponse.json(
        { error: "L'ID de la consultation est requis" },
        { status: 400 },
      );
    }

    // ✅ Build main consultation update data
    const updateData = {
      ...(patientId !== undefined && {
        patient: { connect: { id: Number(patientId) } },
      }),
      ...(note !== undefined && { note }),
      ...(motifDeConsultation !== undefined && { motifDeConsultation }),
      ...(typeof justification === "string" && { justification }),
      ...(createdAt && { createdAt: new Date(createdAt) }),
    };

    // ✅ Handle RendezVous (update or create)
    if (rendezVousDate || rendezVousDescription) {
      if (rendezVousId) {
        // Update existing rendezvous
        await prisma.rendezVous.update({
          where: { id: Number(rendezVousId) },
          data: {
            ...(rendezVousDate && { date: new Date(rendezVousDate) }),
            description: rendezVousDescription || "",
          },
        });
      } else {
        // Create a new rendezvous
        const newRendezVous = await prisma.rendezVous.create({
          data: {
            date: rendezVousDate ? new Date(rendezVousDate) : new Date(),
            description: rendezVousDescription || "",
          },
        });
        updateData.rendezVous = { connect: { id: newRendezVous.id } };
      }
    } else if (rendezVousId) {
      // Clear existing rendezvous
      updateData.rendezVous = { disconnect: true }; // or delete if you want to remove
    }

    // ✅ Handle Justification update / upsert
    const justifPayload =
      justificationRecord ||
      (typeof justification === "object" && justification !== null
        ? justification
        : undefined);
    if (justifPayload !== undefined) {
      if (justifPayload && justifPayload.texte) {
        const resolvedPatientId = patientId
          ? Number(patientId)
          : (
              await prisma.consultation.findUnique({
                where: { id: Number(id) },
                select: { patientId: true },
              })
            )?.patientId;
        await prisma.justification.upsert({
          where: { consultationId: Number(id) },
          create: {
            consultationId: Number(id),
            patientId: Number(resolvedPatientId),
            texte: justifPayload.texte,
          },
          update: {
            texte: justifPayload.texte,
          },
        });
      } else if (justifPayload === null) {
        await prisma.justification.deleteMany({
          where: { consultationId: Number(id) },
        });
      }
    }

    // ✅ Update consultation with new data
    const updated = await prisma.consultation.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        patient: { select: { id: true, dateDeNaissance: true } },
        rendezVous: true,
        justificationRecord: true,
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
        radios: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("❌ PUT consultation error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour de la consultation" },
      { status: 500 },
    );
  }
}

// ====================
// DELETE: Delete consultation + related data
// ====================
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.ordonnanceItem.deleteMany({
        where: {
          ordonnance: { consultationId: Number(id) },
        },
      }),
      prisma.bilanItem.deleteMany({
        where: {
          bilanRecip: { consultationId: Number(id) },
        },
      }),
      prisma.radio.deleteMany({ where: { consultationId: Number(id) } }),
      prisma.bilanFile.deleteMany({ where: { consultationId: Number(id) } }),
      prisma.justification.deleteMany({
        where: { consultationId: Number(id) },
      }),
      prisma.ordonnance.deleteMany({ where: { consultationId: Number(id) } }),
      prisma.bilanRecip.deleteMany({ where: { consultationId: Number(id) } }),
      prisma.consultationTraitement.deleteMany({
        where: { consultationId: Number(id) },
      }),
      prisma.consultation.delete({ where: { id: Number(id) } }),
    ]);

    return NextResponse.json({ message: "Consultation deleted successfully" });
  } catch (error) {
    console.error("DELETE consultation error:", error);
    return NextResponse.json(
      { error: "Failed to delete consultation" },
      { status: 500 },
    );
  }
}
