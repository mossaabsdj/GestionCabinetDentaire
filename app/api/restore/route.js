import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALL_MODELS = [
  "Cabinet",
  "Patient",
  "Consultation",
  "RendezVous",
  "Radio",
  "BilanFile",
  "Ordonnance",
  "OrdonnanceItem",
  "Medicament",
  "Bilan",
  "BilanRecip",
  "BilanItem",
  "BilanType",
  "BilanTypeItem",
  "RecetteType",
  "RecetteTypeItem",
  "Traitement",
  "ConsultationTraitement",
  "Paiement",
  "Vaccine",
  "Vaccination",
  "Justification",
  "JustificationType",
  "Depense",
];

/**
 * Synchronize auto-increment sequences with MAX(id) for PostgreSQL and SQLite.
 * Ensures subsequent normal create operations do not throw "Unique constraint failed on the fields: (id)".
 */
async function syncAutoIncrementSequences(dbClient) {
  let isPostgres = false;
  let isSqlite = false;

  try {
    const versionRes = await dbClient.$queryRawUnsafe("SELECT version();");
    if (
      Array.isArray(versionRes) &&
      versionRes[0]?.version?.toLowerCase().includes("postgresql")
    ) {
      isPostgres = true;
    }
  } catch {
    try {
      const sqliteVer = await dbClient.$queryRawUnsafe("SELECT sqlite_version();");
      if (Array.isArray(sqliteVer) && sqliteVer.length > 0) {
        isSqlite = true;
      }
    } catch {
      // Unknown provider fallback
    }
  }

  if (isPostgres) {
    console.log("[Restore] Synchronizing PostgreSQL auto-increment sequences...");
    for (const table of ALL_MODELS) {
      try {
        const seqResult = await dbClient.$queryRawUnsafe(
          `SELECT pg_get_serial_sequence('"${table}"', 'id') AS seq;`
        );
        const seqName = seqResult[0]?.seq;
        if (seqName) {
          const maxResult = await dbClient.$queryRawUnsafe(
            `SELECT COALESCE(MAX("id"), 0) AS max_id FROM "${table}";`
          );
          const maxId = Number(maxResult[0]?.max_id || 0);
          if (maxId > 0) {
            await dbClient.$executeRawUnsafe(
              `SELECT setval('${seqName}', ${maxId}, true);`
            );
            console.log(`[Restore] Synced ${table} sequence (${seqName}) to maxId ${maxId}`);
          } else {
            await dbClient.$executeRawUnsafe(
              `SELECT setval('${seqName}', 1, false);`
            );
            console.log(`[Restore] Reset ${table} sequence (${seqName}) to 1`);
          }
        }
      } catch (err) {
        console.warn(`[Restore] Could not sync sequence for table ${table}:`, err.message);
      }
    }
    console.log("[Restore] All PostgreSQL sequences synchronized successfully.");
  } else if (isSqlite) {
    console.log("[Restore] Synchronizing SQLite sequence table...");
    try {
      const sqliteSeq = await dbClient.$queryRawUnsafe(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';`
      );
      if (sqliteSeq && sqliteSeq.length > 0) {
        for (const table of ALL_MODELS) {
          try {
            const maxResult = await dbClient.$queryRawUnsafe(
              `SELECT COALESCE(MAX("id"), 0) AS max_id FROM "${table}";`
            );
            const maxId = Number(maxResult[0]?.max_id || 0);
            if (maxId > 0) {
              await dbClient.$executeRawUnsafe(
                `INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('${table}', ${maxId});`
              );
            }
          } catch (sqliteErr) {
            console.warn(`[Restore] SQLite sequence sync skipped for ${table}:`, sqliteErr.message);
          }
        }
      }
    } catch (e) {
      console.warn("[Restore] SQLite sequence sync error:", e.message);
    }
  }
}

export async function POST(req) {
  try {
    let parsedData = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file) {
        return NextResponse.json(
          { error: "Aucun fichier de sauvegarde fourni." },
          { status: 400 },
        );
      }

      const textContent = await file.text();
      try {
        parsedData = JSON.parse(textContent);
      } catch {
        return NextResponse.json(
          { error: "Le fichier sélectionné n'est pas un JSON valide." },
          { status: 400 },
        );
      }
    } else {
      parsedData = await req.json();
    }

    if (!parsedData) {
      return NextResponse.json(
        { error: "Données de sauvegarde invalides ou vides." },
        { status: 400 },
      );
    }

    const data = parsedData.data || parsedData;

    // Restore sequentially in proper FK order inside a transaction
    await prisma.$transaction(
      async (tx) => {
        // 1. Cabinet Settings
        if (Array.isArray(data.cabinets)) {
          for (const c of data.cabinets) {
            const cabData = {
              title: c.title ?? "Cabinet Dentaire",
              doctorName: c.doctorName ?? "Docteur",
              doctorNameAr: c.doctorNameAr ?? "دكتور",
              specialty:
                c.specialty ??
                "Chirurgien Dentiste",
              specialtyAr:
                c.specialtyAr ?? "جراحة و طب الأسنان",
              cabinetName: c.cabinetName ?? "Cabinet Dentaire",
              cabinetNameAr: c.cabinetNameAr ?? "عيادة طب الأسنان",
              address: c.address ?? "Rue Frères KAFI logts 38, 1er étage",
              addressAr: c.addressAr ?? "شارع الإخوة كافي عقار 38 الطابق الأول",
              city: c.city ?? "El-Harrouch SKIKDA",
              cityAr: c.cityAr ?? "(بزاز لعلاوي) الحروش - سكيكدة",
              phones: c.phones ?? "0652 76 89 72 / 0562 24 40 87",
              logo: c.logo ?? "/uploads/image.PNG",
            };
            if (c.id) {
              await tx.cabinet.upsert({
                where: { id: c.id },
                update: cabData,
                create: { id: c.id, ...cabData },
              });
            }
          }
        }

        // 2. Medicaments
        if (Array.isArray(data.medicaments)) {
          for (const m of data.medicaments) {
            if (m.nom) {
              const existingById = m.id
                ? await tx.medicament.findUnique({ where: { id: m.id } })
                : null;
              const existingByName = await tx.medicament.findUnique({
                where: { nom: m.nom },
              });

              if (existingById) {
                await tx.medicament.update({
                  where: { id: m.id },
                  data: { nom: m.nom },
                });
              } else if (existingByName) {
                // Name already exists with another ID, preserve existing
              } else {
                await tx.medicament.create({
                  data: { ...(m.id ? { id: m.id } : {}), nom: m.nom },
                });
              }
            }
          }
        }

        // 3. Bilans
        if (Array.isArray(data.bilans)) {
          for (const b of data.bilans) {
            if (b.nom) {
              const existingById = b.id
                ? await tx.bilan.findUnique({ where: { id: b.id } })
                : null;
              const existingByName = await tx.bilan.findUnique({
                where: { nom: b.nom },
              });

              if (existingById) {
                await tx.bilan.update({
                  where: { id: b.id },
                  data: { nom: b.nom },
                });
              } else if (existingByName) {
                // Name already exists with another ID, preserve existing
              } else {
                await tx.bilan.create({
                  data: { ...(b.id ? { id: b.id } : {}), nom: b.nom },
                });
              }
            }
          }
        }

        // 4. Vaccines
        if (Array.isArray(data.vaccines)) {
          for (const v of data.vaccines) {
            if (v.name || v.nom) {
              const vName = v.name || v.nom;
              const existingById = v.id
                ? await tx.vaccine.findUnique({ where: { id: v.id } })
                : null;
              const existingByName = await tx.vaccine.findUnique({
                where: { name: vName },
              });

              if (existingById) {
                await tx.vaccine.update({
                  where: { id: v.id },
                  data: { name: vName },
                });
              } else if (existingByName) {
                // Name already exists with another ID, preserve existing
              } else {
                await tx.vaccine.create({
                  data: { ...(v.id ? { id: v.id } : {}), name: vName },
                });
              }
            }
          }
        }

        // 5. Justification Types
        if (Array.isArray(data.justificationTypes)) {
          for (const jt of data.justificationTypes) {
            if (jt.nom) {
              const jtData = { nom: jt.nom, texte: jt.texte || "" };
              const existingById = jt.id
                ? await tx.justificationType.findUnique({ where: { id: jt.id } })
                : null;
              const existingByName = await tx.justificationType.findUnique({
                where: { nom: jt.nom },
              });

              if (existingById) {
                await tx.justificationType.update({
                  where: { id: jt.id },
                  data: jtData,
                });
              } else if (existingByName) {
                await tx.justificationType.update({
                  where: { id: existingByName.id },
                  data: jtData,
                });
              } else {
                await tx.justificationType.create({
                  data: { ...(jt.id ? { id: jt.id } : {}), ...jtData },
                });
              }
            }
          }
        }

        // 6. Bilan Types & Items
        if (Array.isArray(data.bilanTypes)) {
          for (const bt of data.bilanTypes) {
            if (bt.nom) {
              await tx.bilanType.upsert({
                where: { id: bt.id || 0 },
                update: { nom: bt.nom },
                create: { ...(bt.id ? { id: bt.id } : {}), nom: bt.nom },
              });
            }
          }
        }

        if (Array.isArray(data.bilanTypeItems)) {
          for (const bti of data.bilanTypeItems) {
            if (bti.bilanTypeId && bti.bilanId) {
              await tx.bilanTypeItem.upsert({
                where: { id: bti.id || 0 },
                update: {
                  bilanTypeId: bti.bilanTypeId,
                  bilanId: bti.bilanId,
                  remarque: bti.remarque ?? null,
                },
                create: {
                  ...(bti.id ? { id: bti.id } : {}),
                  bilanTypeId: bti.bilanTypeId,
                  bilanId: bti.bilanId,
                  remarque: bti.remarque ?? null,
                },
              });
            }
          }
        }

        // 7. Recette Types & Items
        if (Array.isArray(data.recetteTypes)) {
          for (const rt of data.recetteTypes) {
            if (rt.nom) {
              await tx.recetteType.upsert({
                where: { id: rt.id || 0 },
                update: { nom: rt.nom },
                create: { ...(rt.id ? { id: rt.id } : {}), nom: rt.nom },
              });
            }
          }
        }

        if (Array.isArray(data.recetteTypeItems)) {
          for (const rti of data.recetteTypeItems) {
            if (rti.recetteId && rti.medicamentId) {
              await tx.recetteTypeItem.upsert({
                where: { id: rti.id || 0 },
                update: {
                  recetteId: rti.recetteId,
                  medicamentId: rti.medicamentId,
                  dosage: rti.dosage ?? null,
                  frequence: rti.frequence ?? null,
                  duree: rti.duree ?? null,
                  quantite: rti.quantite ?? null,
                },
                create: {
                  ...(rti.id ? { id: rti.id } : {}),
                  recetteId: rti.recetteId,
                  medicamentId: rti.medicamentId,
                  dosage: rti.dosage ?? null,
                  frequence: rti.frequence ?? null,
                  duree: rti.duree ?? null,
                  quantite: rti.quantite ?? null,
                },
              });
            }
          }
        }

        // 8. RendezVous
        if (Array.isArray(data.rendezVous)) {
          for (const rdv of data.rendezVous) {
            if (rdv.date) {
              await tx.rendezVous.upsert({
                where: { id: rdv.id || 0 },
                update: {
                  date: new Date(rdv.date),
                  description: rdv.description ?? null,
                },
                create: {
                  ...(rdv.id ? { id: rdv.id } : {}),
                  date: new Date(rdv.date),
                  description: rdv.description ?? null,
                },
              });
            }
          }
        }

        // 9. Patients
        if (Array.isArray(data.patients)) {
          for (const p of data.patients) {
            if (p.nom) {
              const pData = {
                nom: p.nom,
                age: p.age ? Number(p.age) : null,
                dateDeNaissance: new Date(p.dateDeNaissance || Date.now()),
                sexe: p.sexe || "M",
                telephone: p.telephone ?? null,
                adresse: p.adresse ?? null,
                antecedents: p.antecedents ?? null,
                groupeSanguin: p.groupeSanguin ?? null,
                createdAt: new Date(p.createdAt || Date.now()),
              };
              const existingById = p.id
                ? await tx.patient.findUnique({ where: { id: p.id } })
                : null;
              const existingByName = await tx.patient.findUnique({
                where: { nom: p.nom },
              });

              if (existingById) {
                await tx.patient.update({
                  where: { id: p.id },
                  data: pData,
                });
              } else if (existingByName) {
                await tx.patient.update({
                  where: { id: existingByName.id },
                  data: pData,
                });
              } else {
                await tx.patient.create({
                  data: { ...(p.id ? { id: p.id } : {}), ...pData },
                });
              }
            }
          }
        }

        // 10. Consultations
        if (Array.isArray(data.consultations)) {
          for (const c of data.consultations) {
            if (c.patientId) {
              const cData = {
                patientId: c.patientId,
                note: c.note ?? null,
                motifDeConsultation: c.motifDeConsultation ?? null,
                justification: c.justification ?? null,
                rendezVousId: c.rendezVousId ?? null,
                createdAt: new Date(c.createdAt || Date.now()),
              };
              await tx.consultation.upsert({
                where: { id: c.id || 0 },
                update: cData,
                create: { ...(c.id ? { id: c.id } : {}), ...cData },
              });
            }
          }
        }

        // 11. Ordonnances & Items
        if (Array.isArray(data.ordonnances)) {
          for (const o of data.ordonnances) {
            if (o.patientId && o.consultationId) {
              await tx.ordonnance.upsert({
                where: { id: o.id || 0 },
                update: {
                  patientId: o.patientId,
                  consultationId: o.consultationId,
                  createdAt: new Date(o.createdAt || Date.now()),
                },
                create: {
                  ...(o.id ? { id: o.id } : {}),
                  patientId: o.patientId,
                  consultationId: o.consultationId,
                  createdAt: new Date(o.createdAt || Date.now()),
                },
              });
            }
          }
        }

        if (Array.isArray(data.ordonnanceItems)) {
          for (const oi of data.ordonnanceItems) {
            if (oi.ordonnanceId && oi.medicamentId) {
              await tx.ordonnanceItem.upsert({
                where: { id: oi.id || 0 },
                update: {
                  ordonnanceId: oi.ordonnanceId,
                  medicamentId: oi.medicamentId,
                  dosage: oi.dosage ?? null,
                  frequence: oi.frequence ?? null,
                  duree: oi.duree ?? null,
                  quantite: oi.quantite ? parseInt(oi.quantite) : null,
                },
                create: {
                  ...(oi.id ? { id: oi.id } : {}),
                  ordonnanceId: oi.ordonnanceId,
                  medicamentId: oi.medicamentId,
                  dosage: oi.dosage ?? null,
                  frequence: oi.frequence ?? null,
                  duree: oi.duree ?? null,
                  quantite: oi.quantite ? parseInt(oi.quantite) : null,
                },
              });
            }
          }
        }

        // 12. BilanRecips & Items
        if (Array.isArray(data.bilanRecips)) {
          for (const br of data.bilanRecips) {
            if (br.patientId && br.consultationId) {
              await tx.bilanRecip.upsert({
                where: { id: br.id || 0 },
                update: {
                  patientId: br.patientId,
                  consultationId: br.consultationId,
                  createdAt: new Date(br.createdAt || Date.now()),
                },
                create: {
                  ...(br.id ? { id: br.id } : {}),
                  patientId: br.patientId,
                  consultationId: br.consultationId,
                  createdAt: new Date(br.createdAt || Date.now()),
                },
              });
            }
          }
        }

        if (Array.isArray(data.bilanItems)) {
          for (const bi of data.bilanItems) {
            if (bi.bilanRecipId && bi.bilanId) {
              await tx.bilanItem.upsert({
                where: { id: bi.id || 0 },
                update: {
                  bilanRecipId: bi.bilanRecipId,
                  bilanId: bi.bilanId,
                  resultat: bi.resultat ?? null,
                  remarque: bi.remarque ?? null,
                },
                create: {
                  ...(bi.id ? { id: bi.id } : {}),
                  bilanRecipId: bi.bilanRecipId,
                  bilanId: bi.bilanId,
                  resultat: bi.resultat ?? null,
                  remarque: bi.remarque ?? null,
                },
              });
            }
          }
        }

        // 13. Justifications
        if (Array.isArray(data.justifications)) {
          for (const j of data.justifications) {
            if (j.patientId) {
              await tx.justification.upsert({
                where: { id: j.id || 0 },
                update: {
                  patientId: j.patientId,
                  consultationId: j.consultationId ?? null,
                  titre: j.titre ?? null,
                  texte: j.texte || "",
                  dateDebut: j.dateDebut ? new Date(j.dateDebut) : null,
                  dateFin: j.dateFin ? new Date(j.dateFin) : null,
                  duree: j.duree ?? null,
                  createdAt: new Date(j.createdAt || Date.now()),
                },
                create: {
                  ...(j.id ? { id: j.id } : {}),
                  patientId: j.patientId,
                  consultationId: j.consultationId ?? null,
                  titre: j.titre ?? null,
                  texte: j.texte || "",
                  dateDebut: j.dateDebut ? new Date(j.dateDebut) : null,
                  dateFin: j.dateFin ? new Date(j.dateFin) : null,
                  duree: j.duree ?? null,
                  createdAt: new Date(j.createdAt || Date.now()),
                },
              });
            }
          }
        }

        // 14. Vaccinations
        if (Array.isArray(data.vaccinations)) {
          for (const v of data.vaccinations) {
            if (v.patientId && v.vaccineId) {
              await tx.vaccination.upsert({
                where: { id: v.id || 0 },
                update: {
                  patientId: v.patientId,
                  vaccineId: v.vaccineId,
                  dateGiven: new Date(v.dateGiven || Date.now()),
                  doseNumber: v.doseNumber ? parseInt(v.doseNumber) : null,
                  notes: v.notes ?? null,
                  createdAt: new Date(v.createdAt || Date.now()),
                },
                create: {
                  ...(v.id ? { id: v.id } : {}),
                  patientId: v.patientId,
                  vaccineId: v.vaccineId,
                  dateGiven: new Date(v.dateGiven || Date.now()),
                  doseNumber: v.doseNumber ? parseInt(v.doseNumber) : null,
                  notes: v.notes ?? null,
                  createdAt: new Date(v.createdAt || Date.now()),
                },
              });
            }
          }
        }

        // 15. Paiements
        // 14.5 Traitements
        if (Array.isArray(data.traitements)) {
          for (const t of data.traitements) {
            await tx.traitement.upsert({
              where: { id: t.id || 0 },
              update: {
                patientId: t.patientId,
                description: t.description,
                dent: t.dent ?? null,
                prixTotal: parseFloat(t.prixTotal) || 0,
                statut: t.statut || "EN_COURS",
                createdAt: new Date(t.createdAt || Date.now()),
              },
              create: {
                ...(t.id ? { id: t.id } : {}),
                patientId: t.patientId,
                description: t.description,
                dent: t.dent ?? null,
                prixTotal: parseFloat(t.prixTotal) || 0,
                statut: t.statut || "EN_COURS",
                createdAt: new Date(t.createdAt || Date.now()),
              },
            });
          }
        }

        // 15. Paiements
        if (Array.isArray(data.paiements)) {
          for (const p of data.paiements) {
            if (p.patientId && p.montant !== undefined) {
              await tx.paiement.upsert({
                where: { id: p.id || 0 },
                update: {
                  patientId: p.patientId,
                  traitementId: p.traitementId ?? null,
                  montant: parseFloat(p.montant),
                  note: p.note ?? null,
                  date: new Date(p.date || Date.now()),
                },
                create: {
                  ...(p.id ? { id: p.id } : {}),
                  patientId: p.patientId,
                  traitementId: p.traitementId ?? null,
                  montant: parseFloat(p.montant),
                  note: p.note ?? null,
                  date: new Date(p.date || Date.now()),
                },
              });
            }
          }
        }

        // 16. Radios & BilanFiles
        if (Array.isArray(data.radios)) {
          for (const r of data.radios) {
            await tx.radio.upsert({
              where: { id: r.id || 0 },
              update: {
                consultationId: r.consultationId ?? null,
                patientId: r.patientId ?? null,
                description: r.description ?? null,
                fichier: r.fichier ?? null,
                createdAt: new Date(r.createdAt || Date.now()),
              },
              create: {
                ...(r.id ? { id: r.id } : {}),
                consultationId: r.consultationId ?? null,
                patientId: r.patientId ?? null,
                description: r.description ?? null,
                fichier: r.fichier ?? null,
                createdAt: new Date(r.createdAt || Date.now()),
              },
            });
          }
        }

        if (Array.isArray(data.bilanFiles)) {
          for (const bf of data.bilanFiles) {
            await tx.bilanFile.upsert({
              where: { id: bf.id || 0 },
              update: {
                consultationId: bf.consultationId ?? null,
                patientId: bf.patientId ?? null,
                type: bf.type ?? null,
                description: bf.description ?? null,
                fichier: bf.fichier ?? null,
                createdAt: new Date(bf.createdAt || Date.now()),
              },
              create: {
                ...(bf.id ? { id: bf.id } : {}),
                consultationId: bf.consultationId ?? null,
                patientId: bf.patientId ?? null,
                type: bf.type ?? null,
                description: bf.description ?? null,
                fichier: bf.fichier ?? null,
                createdAt: new Date(bf.createdAt || Date.now()),
              },
            });
          }
        }

        // 17. ConsultationsTraitement
        if (Array.isArray(data.consultationsTraitement)) {
          for (const ct of data.consultationsTraitement) {
            await tx.consultationTraitement.upsert({
              where: { id: ct.id || 0 },
              update: {
                consultationId: ct.consultationId,
                traitementId: ct.traitementId,
                acteRealise: ct.acteRealise ?? null,
                createdAt: new Date(ct.createdAt || Date.now()),
              },
              create: {
                ...(ct.id ? { id: ct.id } : {}),
                consultationId: ct.consultationId,
                traitementId: ct.traitementId,
                acteRealise: ct.acteRealise ?? null,
                createdAt: new Date(ct.createdAt || Date.now()),
              },
            });
          }
        }

        // 17.5 Dépenses
        if (Array.isArray(data.depenses)) {
          for (const d of data.depenses) {
            if (d.montant !== undefined && d.description) {
              await tx.depense.upsert({
                where: { id: d.id || 0 },
                update: {
                  montant: parseFloat(d.montant) || 0,
                  description: d.description,
                  date: new Date(d.date || Date.now()),
                  createdAt: new Date(d.createdAt || Date.now()),
                },
                create: {
                  ...(d.id ? { id: d.id } : {}),
                  montant: parseFloat(d.montant) || 0,
                  description: d.description,
                  date: new Date(d.date || Date.now()),
                  createdAt: new Date(d.createdAt || Date.now()),
                },
              });
            }
          }
        }

        // 18. Synchronize all auto-increment sequences with MAX(id)
        await syncAutoIncrementSequences(tx);
      },
      {
        timeout: 60000, // 60 seconds timeout for full db restoration
      },
    );

    // Double-check sequence synchronization on the main client
    await syncAutoIncrementSequences(prisma);

    return NextResponse.json({
      success: true,
      message: "Base de données restaurée avec succès.",
    });
  } catch (error) {
    console.error("[Restore API Error]:", error);
    return NextResponse.json(
      {
        error:
          "Échec de la restauration de la base de données: " +
          (error.message || "Erreur interne"),
      },
      { status: 500 },
    );
  }
}
