/**
 * ============================================================================
 * test.js - Realistic Dental Clinic Database Population and Verification
 * Cabinet Dentaire - Système de Gestion Médicale et Financière
 * ============================================================================
 *
 * Populates the database with realistic, interconnected medical records
 * simulating authentic Algerian dental clinic workflows:
 *
 * - Realistic Algerian patients with authentic demographics and medical histories
 * - Realistic clinical dental pathologies (endodontics, periodontics, surgery,
 *   prosthetics, conservative dentistry, pedodontics)
 * - Multi-stage treatment plans with precise tooth numbers and clinical acts
 * - Prescriptions (ordonnances) with real Algerian pharmaceutical formulations
 * - Medical reports (bilans) and dental radiographs (radios) with clinical findings
 * - Accurate financial accounting in DZD: billings, installments (versements),
 *   debtor balances, and cabinet operating expenses (dépenses)
 * - Comprehensive relationship and foreign key verification
 *
 * Safety & Quality:
 * - NO placeholder names or labels (no "Test Patient", "Test Treatment", or "TEST_")
 * - Idempotent execution: safely refreshes the cohort without damaging existing user data
 * - Full verification of mathematical calculations and relational integrity
 * ============================================================================
 */

require("dotenv").config();
const { PrismaClient, GroupeSanguin, StatutTraitement } = require("./app/generated/prisma");

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// Identified Algerian patient cohort for safe idempotency
const CLINICAL_COHORT_NAMES = [
  "Amina Benali",
  "Karim Mansouri",
  "Fatima Zohra Boukhalfa",
  "Sofiane Belkacem",
  "Meriem Chaouche",
  "Yacine Haddad",
  "Ahmed Zouaoui",
  "Samia Larbi",
];

async function main() {
  console.log("================================================================================");
  console.log("🏥 DENTAL CLINIC DATABASE POPULATION & CLINICAL AUDIT (test.js)");
  console.log("================================================================================\n");

  // -----------------------------------------------------------------------------
  // STEP 1: Safe Cohort Cleanup (Idempotent Execution)
  // -----------------------------------------------------------------------------
  console.log("🧹 Étape 1 : Nettoyage sécurisé de la cohorte clinique précédente (si existante)...");

  const existingCohort = await prisma.patient.findMany({
    where: { nom: { in: CLINICAL_COHORT_NAMES } },
    select: { id: true, nom: true },
  });

  if (existingCohort.length > 0) {
    const cohortIds = existingCohort.map((p) => p.id);
    console.log(`   Suppression de ${cohortIds.length} dossier(s) patient(s) de la cohorte pour régénération propre...`);
    await prisma.patient.deleteMany({
      where: { id: { in: cohortIds } },
    });
    console.log("   ✅ Ancienne cohorte nettoyée avec cascade relationnelle.");
  } else {
    console.log("   ✅ Aucun dossier de la cohorte n'était présent.");
  }

  // Nettoyage des dépenses de référence du cabinet
  const deletedExpenses = await prisma.depense.deleteMany({
    where: {
      description: {
        contains: "(Réf Clinique)",
      },
    },
  });
  if (deletedExpenses.count > 0) {
    console.log(`   ✅ ${deletedExpenses.count} dépense(s) de référence réinitialisée(s).`);
  }

  // -----------------------------------------------------------------------------
  // STEP 2: Realistic Algerian Dental Medications
  // -----------------------------------------------------------------------------
  console.log("\n💊 Étape 2 : Chargement du catalogue pharmaceutique algérien...");

  const dentalMedications = [
    "Amoxicilline 1g (Clamoxyl)",
    "Amoxicilline + Ac. Clavulanique 1g/125mg (Augmentin)",
    "Spiramycine + Métronidazole (Birodogyl)",
    "Métronidazole 500mg (Flagyl)",
    "Paracétamol 1g (Doliprane)",
    "Paracétamol sirop pédiatrique 30mg/ml",
    "Ibuprofène 400mg (Advil)",
    "Ibuprofène 600mg (Algicox)",
    "Acide tiaprofénique 100mg (Surgam)",
    "Prednisolone 20mg (Solupred)",
    "Bain de bouche Chlorhexidine 0.12% (Eludril)",
    "Gel gingival antiseptique (Pansoral)",
    "Dentifrice désensibilisant au nitrate de potassium (Sensodyne)",
  ];

  const medicationMap = {};
  for (const medName of dentalMedications) {
    const med = await prisma.medicament.upsert({
      where: { nom: medName },
      update: {},
      create: { nom: medName },
    });
    medicationMap[medName] = med.id;
  }
  console.log(`   ✅ ${Object.keys(medicationMap).length} médicaments dentaires prêts.`);

  // -----------------------------------------------------------------------------
  // STEP 3: Medical Laboratory Tests and Dental Imaging (Bilans)
  // -----------------------------------------------------------------------------
  console.log("\n🔬 Étape 3 : Chargement du catalogue d'analyses médicales et imagerie...");

  const dentalBilans = [
    "Formule Numération Sanguine (NFS)",
    "Bilan d'hémostase (TP, TCA, INR)",
    "Glycémie à jeun",
    "Hémoglobine glyquée (HbA1c)",
    "Radiographie Panoramique Dentaire (OPG)",
    "Scanner Dentaire Cone Beam (CBCT)",
    "Bilan Rénal (Créatinine, Urée)",
  ];

  const bilanMap = {};
  for (const bName of dentalBilans) {
    const bilan = await prisma.bilan.upsert({
      where: { nom: bName },
      update: {},
      create: { nom: bName },
    });
    bilanMap[bName] = bilan.id;
  }
  console.log(`   ✅ ${Object.keys(bilanMap).length} analyses et examens d'imagerie prêts.`);

  // -----------------------------------------------------------------------------
  // STEP 4: Creation of Interconnected Medical & Financial Records
  // -----------------------------------------------------------------------------
  console.log("\n👥 Étape 4 : Création des patients, consultations, traitements, actes et versements...");

  // ============================================================================
  // PATIENT 1: Amina Benali (Dévitalisation Molaire & Couronne Céramo-Métallique)
  // ============================================================================
  console.log("   -> Dossier 1 : Amina Benali (Pulpite molaire 36, dévitalisation 3 canaux & couronne)");
  const p1 = await prisma.patient.create({
    data: {
      nom: "Amina Benali",
      age: 28,
      dateDeNaissance: new Date("1998-04-12T00:00:00.000Z"),
      sexe: "Femme",
      telephone: "0554123456",
      adresse: "Cité 500 Logements, Bâtiment C3, El-Harrouch, Skikda",
      antecedents: "Aucun antécédent médical notable. Allergie cutanée modérée à la pénicilline signalée.",
      groupeSanguin: GroupeSanguin.O_POS,
      createdAt: new Date("2026-09-10T08:30:00.000Z"),
    },
  });

  const t1_p1 = await prisma.traitement.create({
    data: {
      patientId: p1.id,
      description: "Traitement endodontique complet 3 canaux et couronne céramo-métallique dent 36",
      dent: "36",
      prixTotal: 26000,
      statut: StatutTraitement.TERMINE,
      createdAt: new Date("2026-09-10T09:00:00.000Z"),
      updatedAt: new Date("2026-10-06T12:00:00.000Z"),
    },
  });

  // Séance 1 : Urgence pulpectomie
  const rdv1_p1 = await prisma.rendezVous.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      date: new Date("2026-09-10T09:00:00.000Z"),
      description: "Consultation d'urgence pour pulpite aiguë dent 36",
      note: "Urgence reçue à 9h00",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p1.id,
      rendezVousId: rdv1_p1.id,
      motifDeConsultation: "Douleur dentaire aiguë pulsatile et insomniante secteur mandibulaire gauche (dent 36)",
      note: "Examen clinique : Carie occluso-distale profonde dent 36 avec effraction pulpaire. Test au froid vivement douloureux et prolongé. Diagnostic : Pulpite aiguë irréversible. Geste d'urgence : Pulpectomie sous anesthésie locale sans vasoconstricteur, extirpation des filets pulpaires, irrigation à l'hypochlorite de sodium 2.5%, pansement provisoire à l'eugénate.",
      createdAt: new Date("2026-09-10T09:15:00.000Z"),
      radios: {
        create: {
          patientId: p1.id,
          description: "Cliché rétroalvéolaire pré-opératoire dent 36 montrant carie profonde proche de la corne pulpaire mésiale",
          fichier: "/uploads/radios/amina_benali_36_preop.jpg",
          createdAt: new Date("2026-09-10T09:10:00.000Z"),
        },
      },
      ordonnance: {
        create: {
          patientId: p1.id,
          createdAt: new Date("2026-09-10T09:30:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Paracétamol 1g (Doliprane)"],
                dosage: "1000 mg",
                frequence: "1 comprimé toutes les 8h si douleur",
                duree: "4 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Ibuprofène 400mg (Advil)"],
                dosage: "400 mg",
                frequence: "1 comprimé au milieu des repas matin et soir",
                duree: "3 jours",
                quantite: 1,
              },
            ],
          },
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p1.id,
          acteRealise: "Pulpectomie d'urgence, alésage initial des canaux mésiaux et distal, pansement eugénate",
          createdAt: new Date("2026-09-10T09:45:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      montant: 8000,
      date: new Date("2026-09-10T09:50:00.000Z"),
      note: "Versement séance 1 : Acompte urgence pulpectomie et dévitalisation initiale",
    },
  });

  // Séance 2 : Obturation canalaire
  const rdv2_p1 = await prisma.rendezVous.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      date: new Date("2026-09-18T10:00:00.000Z"),
      description: "Obturation canalaire définitive dent 36",
      note: "Séance d'endodontie sous digue",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p1.id,
      rendezVousId: rdv2_p1.id,
      motifDeConsultation: "Séance d'obturation canalaire définitive dent 36",
      note: "Dent totalement asymptomatique. Alésage mécanisé WaveOne Gold, séchage pointes de papier, obturation thermo-mécanique gutta-percha et ciment résine AH Plus. Contrôle radiologique parfait. Reconstitution coronaire pré-prothétique au composite hybride.",
      createdAt: new Date("2026-09-18T10:15:00.000Z"),
      radios: {
        create: {
          patientId: p1.id,
          description: "Cliché rétroalvéolaire de contrôle d'obturation endodontique dent 36 : 3 canaux parfaitement obturés à l'apex",
          fichier: "/uploads/radios/amina_benali_36_obturation.jpg",
          createdAt: new Date("2026-09-18T10:45:00.000Z"),
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p1.id,
          acteRealise: "Obturation canalaire tridimensionnelle 3 canaux et reconstitution coronaire composite",
          createdAt: new Date("2026-09-18T10:50:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      montant: 6000,
      date: new Date("2026-09-18T11:00:00.000Z"),
      note: "Versement séance 2 : Obturation canalaire et reconstitution coronaire",
    },
  });

  // Séance 3 : Taille moignon & empreinte
  const rdv3_p1 = await prisma.rendezVous.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      date: new Date("2026-09-29T11:00:00.000Z"),
      description: "Taille de moignon et prise d'empreinte couronne dent 36",
      note: "Préparation pour prothèse céramique",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p1.id,
      rendezVousId: rdv3_p1.id,
      motifDeConsultation: "Préparation prothétique et prise d'empreinte dent 36",
      note: "Taille périphérique avec congé sous-gingival respectant l'espace biologique. Empreinte double mélange silicone par addition (Putty + Light). Envoi au laboratoire de prothèse. Pose d'une couronne provisoire en résine bis-acryl.",
      createdAt: new Date("2026-09-29T11:15:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t1_p1.id,
          acteRealise: "Taille périphérique du moignon, empreinte silicone de précision et couronne provisoire",
          createdAt: new Date("2026-09-29T11:45:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      montant: 7000,
      date: new Date("2026-09-29T11:50:00.000Z"),
      note: "Versement séance 3 : Acompte commande prothèse au laboratoire",
    },
  });

  // Séance 4 : Scellement définitif
  const rdv4_p1 = await prisma.rendezVous.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      date: new Date("2026-10-06T14:00:00.000Z"),
      description: "Scellement définitif couronne céramo-métallique dent 36",
      note: "Séance finale de prothèse",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p1.id,
      rendezVousId: rdv4_p1.id,
      motifDeConsultation: "Pose et scellement définitif de la couronne céramo-métallique dent 36",
      note: "Dépose de la couronne provisoire. Nettoyage et désinfection du moignon. Essayage clinique : ajustage marginal parfait, points de contact fermes, occlusion contrôlée en statique et dynamique au papier 40µ. Scellement définitif au ciment verre ionomère Fuji I. Élimination des excès. Traitement terminé avec succès.",
      createdAt: new Date("2026-10-06T14:15:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t1_p1.id,
          acteRealise: "Scellement définitif de la couronne céramo-métallique au verre ionomère",
          createdAt: new Date("2026-10-06T14:40:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p1.id,
      traitementId: t1_p1.id,
      montant: 5000,
      date: new Date("2026-10-06T14:45:00.000Z"),
      note: "Versement séance 4 : Solde définitif de la couronne céramo-métallique (Total 26 000 DZD réglé)",
    },
  });

  // ============================================================================
  // PATIENT 2: Karim Mansouri (Parodontite Chronique & Surfaçage Radiculaire)
  // ============================================================================
  console.log("   -> Dossier 2 : Karim Mansouri (Parodontite chronique de l'adulte, détartrage & surfaçage)");
  const p2 = await prisma.patient.create({
    data: {
      nom: "Karim Mansouri",
      age: 45,
      dateDeNaissance: new Date("1981-08-20T00:00:00.000Z"),
      sexe: "Homme",
      telephone: "0661889210",
      adresse: "Rue Didouche Mourad, Centre-ville, Skikda",
      antecedents: "Hypertension artérielle modérée sous Amlodipine 5mg. Tabagisme évalué à 15 paquets-années.",
      groupeSanguin: GroupeSanguin.A_POS,
      createdAt: new Date("2026-10-12T10:00:00.000Z"),
    },
  });

  const t1_p2 = await prisma.traitement.create({
    data: {
      patientId: p2.id,
      description: "Assainissement parodontal complet : Détartrage ultrasonique et surfaçage radiculaire 4 quadrants",
      dent: "Toutes arcades",
      prixTotal: 18000,
      statut: StatutTraitement.EN_COURS,
      createdAt: new Date("2026-10-12T10:30:00.000Z"),
      updatedAt: new Date("2026-10-23T12:00:00.000Z"),
    },
  });

  const rdv1_p2 = await prisma.rendezVous.create({
    data: {
      patientId: p2.id,
      traitementId: t1_p2.id,
      date: new Date("2026-10-12T10:30:00.000Z"),
      description: "Bilan parodontal initial et prescription pré-thérapeutique",
      note: "Patient hypertendu sous Amlodipine",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p2.id,
      rendezVousId: rdv1_p2.id,
      motifDeConsultation: "Saignement abondant des gencives au brossage, mobilités dentaires légères et halitose",
      note: "Sondage parodontal révélant des poches de 4 à 6 mm en regard des molaires et prémolaires. Tartre sous-gingival dense. Diagnostic : Parodontite chronique de l'adulte stade II généralisée. Prescription d'antibioprophylaxie parodontale et bilan biologique avant surfaçage sous-gingival.",
      createdAt: new Date("2026-10-12T10:45:00.000Z"),
      ordonnance: {
        create: {
          patientId: p2.id,
          createdAt: new Date("2026-10-12T11:00:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Spiramycine + Métronidazole (Birodogyl)"],
                dosage: "1.5 MUI / 250 mg",
                frequence: "2 comprimés par jour au cours des repas",
                duree: "7 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Bain de bouche Chlorhexidine 0.12% (Eludril)"],
                dosage: "0.12 %",
                frequence: "Bain de bouche pur 3 fois par jour après brossage",
                duree: "10 jours",
                quantite: 1,
              },
            ],
          },
        },
      },
      bilanRecip: {
        create: {
          patientId: p2.id,
          createdAt: new Date("2026-10-12T11:10:00.000Z"),
          items: {
            create: [
              {
                bilanId: bilanMap["Formule Numération Sanguine (NFS)"],
                resultat: "Leucocytes: 7400/mm³, Hb: 14.2 g/dL, Plaquettes: 260000/mm³",
                remarque: "Constantes hématologiques dans les normes",
              },
              {
                bilanId: bilanMap["Bilan d'hémostase (TP, TCA, INR)"],
                resultat: "TP: 94%, INR: 1.02",
                remarque: "Coagulation sanguine normale, autorisant les actes sous-gingivaux",
              },
              {
                bilanId: bilanMap["Glycémie à jeun"],
                resultat: "0.98 g/L",
                remarque: "Normoglycémie",
              },
            ],
          },
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p2.id,
          acteRealise: "Détartrage sus-gingival préliminaire ultrasonique et polissage doux",
          createdAt: new Date("2026-10-12T11:30:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p2.id,
      traitementId: t1_p2.id,
      montant: 6000,
      date: new Date("2026-10-12T11:35:00.000Z"),
      note: "Versement séance 1 : Détartrage préliminaire et bilan parodontal",
    },
  });

  // Séance 2 : Surfaçage quadrants 1 & 4
  const rdv2_p2 = await prisma.rendezVous.create({
    data: {
      patientId: p2.id,
      traitementId: t1_p2.id,
      date: new Date("2026-10-23T11:00:00.000Z"),
      description: "Surfaçage radiculaire quadrants 1 et 4 sous anesthésie locale",
      note: "Tension artérielle contrôlée (TA: 130/80 mmHg)",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p2.id,
      rendezVousId: rdv2_p2.id,
      motifDeConsultation: "Séance de surfaçage radiculaire sous-gingival cadrans droits (1 et 4)",
      note: "Bilans biologiques validés. Anesthésie locale intra-septale et para-apicale. Débridement minutieux des surfaces radiculaires aux curettes de Gracey spécifiques. Irrigation sous-gingivale à la bétadine buccale. Recommandations d'hygiène rigoureuse.",
      createdAt: new Date("2026-10-23T11:15:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t1_p2.id,
          acteRealise: "Surfaçage radiculaire méticuleux des poches parodontales quadrants 1 et 4",
          createdAt: new Date("2026-10-23T11:50:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p2.id,
      traitementId: t1_p2.id,
      montant: 6000,
      date: new Date("2026-10-23T12:00:00.000Z"),
      note: "Versement séance 2 : Surfaçage radiculaire quadrants 1 et 4 (Reste 6 000 DZD)",
    },
  });

  // Rendez-vous futur programmé
  await prisma.rendezVous.create({
    data: {
      patientId: p2.id,
      traitementId: t1_p2.id,
      date: new Date("2026-11-08T10:00:00.000Z"),
      description: "Séance de surfaçage radiculaire quadrants 2 et 3 (côté gauche)",
      note: "Contrôler la cicatrisation gingivale des quadrants 1 et 4",
    },
  });

  // ============================================================================
  // PATIENT 3: Fatima Zohra Boukhalfa (Chirurgie Alvéolaire & Prothèse Squelettée)
  // ============================================================================
  console.log("   -> Dossier 3 : Fatima Zohra Boukhalfa (Extractions chirurgicales & prothèse squelettée stellite)");
  const p3 = await prisma.patient.create({
    data: {
      nom: "Fatima Zohra Boukhalfa",
      age: 52,
      dateDeNaissance: new Date("1974-06-15T00:00:00.000Z"),
      sexe: "Femme",
      telephone: "0771458923",
      adresse: "Boulevard de la Révolution, Skikda",
      antecedents: "Diabète de type 2 équilibré sous Glucophage (Metformine 850mg 2x/j, HbA1c récente à 6.8%).",
      groupeSanguin: GroupeSanguin.B_POS,
      createdAt: new Date("2026-09-02T08:00:00.000Z"),
    },
  });

  // Traitement 1 : Extractions chirurgicales (7,000 DZD - Soldé)
  const t1_p3 = await prisma.traitement.create({
    data: {
      patientId: p3.id,
      description: "Avulsions chirurgicales des racines résiduelles nécrosées 14 et 15 avec régularisation de crête",
      dent: "14, 15",
      prixTotal: 7000,
      statut: StatutTraitement.TERMINE,
      createdAt: new Date("2026-09-02T08:30:00.000Z"),
      updatedAt: new Date("2026-09-02T09:30:00.000Z"),
    },
  });

  // Traitement 2 : Prothèse Squelettée Stellite (45,000 DZD - Payé 25,000, Reste 20,000 DZD - EN_COURS)
  const t2_p3 = await prisma.traitement.create({
    data: {
      patientId: p3.id,
      description: "Conception et réalisation d'une prothèse adjointe partielle métallique squelettée (Stellite maxillaire)",
      dent: "Maxillaire supérieur",
      prixTotal: 45000,
      statut: StatutTraitement.EN_COURS,
      createdAt: new Date("2026-09-02T08:35:00.000Z"),
      updatedAt: new Date("2026-10-25T11:00:00.000Z"),
    },
  });

  // Séance 1 : Extractions & Arrêt de travail
  const rdv1_p3 = await prisma.rendezVous.create({
    data: {
      patientId: p3.id,
      traitementId: t1_p3.id,
      date: new Date("2026-09-02T08:30:00.000Z"),
      description: "Extractions chirurgicales 14 et 15",
      note: "Patiente diabétique sous Metformine",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p3.id,
      rendezVousId: rdv1_p3.id,
      motifDeConsultation: "Infection dentaire récidivante sur racines fracturées 14 et 15 et bilan prothétique",
      note: "Sous anesthésie locale, avulsion atraumatique des racines résiduelles 14 et 15. Curetage soigneux du tissu de granulation alvéolaire. Hémostase locale obtenue par compression et éponge hémostatique Surgicel. Sutures à la soie 3-0. Conseils post-opératoires remis pour patiente diabétique.",
      createdAt: new Date("2026-09-02T08:45:00.000Z"),
      radios: {
        create: {
          patientId: p3.id,
          description: "Panoramique dentaire OPG pré-opératoire : Visualisation des racines 14 et 15 et perte d'os alvéolaire",
          fichier: "/uploads/radios/boukhalfa_panoramique.jpg",
          createdAt: new Date("2026-09-02T08:40:00.000Z"),
        },
      },
      ordonnance: {
        create: {
          patientId: p3.id,
          createdAt: new Date("2026-09-02T09:15:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Amoxicilline 1g (Clamoxyl)"],
                dosage: "1000 mg",
                frequence: "1 comprimé matin et soir",
                duree: "6 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Paracétamol 1g (Doliprane)"],
                dosage: "1000 mg",
                frequence: "1 comprimé toutes les 8 heures si douleur",
                duree: "5 jours",
                quantite: 1,
              },
            ],
          },
        },
      },
      justificationRecord: {
        create: {
          patientId: p3.id,
          titre: "Arrêt de travail médical post-chirurgical",
          texte: "Je soussigné certifie avoir procédé ce jour à l'avulsion chirurgicale sous anesthésie locale de deux racines dentaires chez Mme Fatima Zohra Boukhalfa, nécessitant un repos complet à domicile de 3 jours.",
          dateDebut: new Date("2026-09-02T00:00:00.000Z"),
          dateFin: new Date("2026-09-05T00:00:00.000Z"),
          duree: "3 jours",
          createdAt: new Date("2026-09-02T09:20:00.000Z"),
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p3.id,
          acteRealise: "Avulsion chirurgicale des racines résiduelles 14 et 15, curetage alvéolaire et suture",
          createdAt: new Date("2026-09-02T09:25:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p3.id,
      traitementId: t1_p3.id,
      montant: 7000,
      date: new Date("2026-09-02T09:30:00.000Z"),
      note: "Règlement complet des avulsions chirurgicales 14 et 15",
    },
  });

  // Séance 2 : Cicatrisation & empreinte primaire prothèse
  const rdv2_p3 = await prisma.rendezVous.create({
    data: {
      patientId: p3.id,
      traitementId: t2_p3.id,
      date: new Date("2026-10-05T10:00:00.000Z"),
      description: "Contrôle de cicatrisation et empreinte primaire prothèse",
      note: "Vérification des crêtes alvéolaires",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p3.id,
      rendezVousId: rdv2_p3.id,
      motifDeConsultation: "Contrôle de cicatrisation et lancement de la prothèse squelettée maxillaire",
      note: "Cicatrisation muqueuse complète et crêtes régulières sans douleur. Prise d'empreinte primaire maxillaire à l'alginate chromatique. Coulée en plâtre dur pour confection d'un porte-empreinte individuel (PEI) au laboratoire.",
      createdAt: new Date("2026-10-05T10:15:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t2_p3.id,
          acteRealise: "Empreinte primaire maxillaire et préparation des logements de taquets sur 13 et 23",
          createdAt: new Date("2026-10-05T10:40:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p3.id,
      traitementId: t2_p3.id,
      montant: 15000,
      date: new Date("2026-10-05T10:45:00.000Z"),
      note: "Acompte initial n°1 pour la fabrication de la prothèse squelettée stellite",
    },
  });

  // Séance 3 : Empreinte secondaire & occlusion
  const rdv3_p3 = await prisma.rendezVous.create({
    data: {
      patientId: p3.id,
      traitementId: t2_p3.id,
      date: new Date("2026-10-25T10:30:00.000Z"),
      description: "Empreinte secondaire au PEI et enregistrement de l'articulé",
      note: "Séance de haute précision",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p3.id,
      rendezVousId: rdv3_p3.id,
      motifDeConsultation: "Empreinte secondaire de précision et occlusion",
      note: "Margination du PEI à la pâte thermoplastique de Kerr (joint vélo-palatin et freins vestibulaires). Empreinte secondaire au polysulfure régulier. Enregistrement des rapports intermaxillaires au plan de cire.",
      createdAt: new Date("2026-10-25T10:45:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t2_p3.id,
          acteRealise: "Empreinte secondaire fonctionnelle et enregistrement de la relation centrée",
          createdAt: new Date("2026-10-25T11:15:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p3.id,
      traitementId: t2_p3.id,
      montant: 10000,
      date: new Date("2026-10-25T11:20:00.000Z"),
      note: "Acompte n°2 pour la réalisation de l'infrastructure métallique Stellite (Reste 20 000 DZD)",
    },
  });

  // Rendez-vous futur pour essayage
  await prisma.rendezVous.create({
    data: {
      patientId: p3.id,
      traitementId: t2_p3.id,
      date: new Date("2026-11-05T14:30:00.000Z"),
      description: "Essayage de l'armature métallique squelettée (châssis stellite) et montage des dents sur cire",
      note: "Vérifier la sustentation, stabilisation et rétention des crochets coulés",
    },
  });

  // ============================================================================
  // PATIENT 4: Sofiane Belkacem (Chirurgie Dent de Sagesse Incluse 48)
  // ============================================================================
  console.log("   -> Dossier 4 : Sofiane Belkacem (Péricoronarite récidivante & avulsion chirurgicale 48)");
  const p4 = await prisma.patient.create({
    data: {
      nom: "Sofiane Belkacem",
      age: 24,
      dateDeNaissance: new Date("2002-03-10T00:00:00.000Z"),
      sexe: "Homme",
      telephone: "0560332187",
      adresse: "Cité 20 Août 1955, El-Harrouch, Skikda",
      antecedents: "Aucun antécédent médico-chirurgical. Sportif.",
      groupeSanguin: GroupeSanguin.O_NEG,
      createdAt: new Date("2026-10-15T09:00:00.000Z"),
    },
  });

  const t1_p4 = await prisma.traitement.create({
    data: {
      patientId: p4.id,
      description: "Extraction chirurgicale sous anesthésie locale de la dent de sagesse incluse 48 avec lambeau et ostéotomie",
      dent: "48",
      prixTotal: 12000,
      statut: StatutTraitement.TERMINE,
      createdAt: new Date("2026-10-15T09:30:00.000Z"),
      updatedAt: new Date("2026-10-22T11:00:00.000Z"),
    },
  });

  // Séance 1 : Péricoronarite
  const rdv1_p4 = await prisma.rendezVous.create({
    data: {
      patientId: p4.id,
      traitementId: t1_p4.id,
      date: new Date("2026-10-15T09:30:00.000Z"),
      description: "Consultation d'urgence pour douleur rétro-molaire droite",
      note: "Trismus modéré",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p4.id,
      rendezVousId: rdv1_p4.id,
      motifDeConsultation: "Douleur intense angle mandibulaire droit, trismus léger et difficulté de mastication",
      note: "Capuchon muqueux très inflammatoire recouvrant partiellement la 48 incluse. Diagnostic : Péricoronarite récidivante sur dent 48 enclavée mésio-angulaire. Nettoyage antiseptique à l'eau oxygénée diluée. Programmation de l'extraction après sédation de la phase aiguë.",
      createdAt: new Date("2026-10-15T09:45:00.000Z"),
      radios: {
        create: {
          patientId: p4.id,
          description: "Panoramique dentaire : Visualisation de la dent 48 incluse en position mésio-angulaire sous la couronne de la 47",
          fichier: "/uploads/radios/belkacem_48_panoramique.jpg",
          createdAt: new Date("2026-10-15T09:40:00.000Z"),
        },
      },
      ordonnance: {
        create: {
          patientId: p4.id,
          createdAt: new Date("2026-10-15T10:00:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Amoxicilline 1g (Clamoxyl)"],
                dosage: "1000 mg",
                frequence: "1 sachet matin et soir au milieu des repas",
                duree: "6 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Métronidazole 500mg (Flagyl)"],
                dosage: "500 mg",
                frequence: "1 comprimé matin, midi et soir",
                duree: "6 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Paracétamol 1g (Doliprane)"],
                dosage: "1000 mg",
                frequence: "1 comprimé toutes les 8h si douleur",
                duree: "4 jours",
                quantite: 1,
              },
            ],
          },
        },
      },
    },
  });

  // Séance 2 : Chirurgie
  const rdv2_p4 = await prisma.rendezVous.create({
    data: {
      patientId: p4.id,
      traitementId: t1_p4.id,
      date: new Date("2026-10-22T09:30:00.000Z"),
      description: "Intervention chirurgicale extraction 48 incluse",
      note: "Intervention au bloc du cabinet",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p4.id,
      rendezVousId: rdv2_p4.id,
      motifDeConsultation: "Avulsion chirurgicale dent de sagesse 48",
      note: "Anesthésie tronculaire à l'épine de Spix et infiltration locale. Incision intrasulculaire et décharge vestibulaire. Décollement d'un lambeau muco-périosté. Dégagement osseux à la fraise chirurgicale sous spray stérile. Odontosection de la couronne. Extraction des racines. Alvéolectomie, nettoyage, éponge hémostatique Surgicel, sutures au fil résorbable 3-0. Hémostase parfaite.",
      createdAt: new Date("2026-10-22T09:45:00.000Z"),
      justificationRecord: {
        create: {
          patientId: p4.id,
          titre: "Certificat d'arrêt de travail après chirurgie buccale",
          texte: "Je soussigné certifie que M. Sofiane Belkacem a subi ce jour une avulsion chirurgicale complexe de la dent de sagesse incluse 48 avec décollement et sutures, justifiant un repos médical absolu de quatre (04) jours.",
          dateDebut: new Date("2026-10-22T00:00:00.000Z"),
          dateFin: new Date("2026-10-26T00:00:00.000Z"),
          duree: "4 jours",
          createdAt: new Date("2026-10-22T10:30:00.000Z"),
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p4.id,
          acteRealise: "Incision, décollement de lambeau, ostéotomie alvéolaire, odontosection et extraction 48 avec sutures",
          createdAt: new Date("2026-10-22T10:45:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p4.id,
      traitementId: t1_p4.id,
      montant: 12000,
      date: new Date("2026-10-22T11:00:00.000Z"),
      note: "Règlement complet de l'acte d'avulsion chirurgicale complexe dent 48 (12 000 DZD)",
    },
  });

  // Séance 3 : Dépose des fils
  const rdv3_p4 = await prisma.rendezVous.create({
    data: {
      patientId: p4.id,
      traitementId: t1_p4.id,
      date: new Date("2026-10-29T11:30:00.000Z"),
      description: "Dépose des points de suture dent 48",
      note: "Contrôle post-opératoire à J+7",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p4.id,
      rendezVousId: rdv3_p4.id,
      motifDeConsultation: "Contrôle post-opératoire et dépose des points de suture 48",
      note: "Excellente cicatrisation muqueuse, disparition totale de l'œdème et du trismus. Dépose des fils de suture. Patient asymptomatique. Dossier chirurgical clôturé avec succès.",
      createdAt: new Date("2026-10-29T11:45:00.000Z"),
    },
  });

  // ============================================================================
  // PATIENT 5: Meriem Chaouche (Composites Esthétiques Antérieurs 11, 21)
  // ============================================================================
  console.log("   -> Dossier 5 : Meriem Chaouche (Caries proximales & composites esthétiques stratifiés)");
  const p5 = await prisma.patient.create({
    data: {
      nom: "Meriem Chaouche",
      age: 34,
      dateDeNaissance: new Date("1992-11-25T00:00:00.000Z"),
      sexe: "Femme",
      telephone: "0792567143",
      adresse: "Cité des Martyrs, El-Harrouch, Skikda",
      antecedents: "Gastrite chronique sous Oméprazole 20mg. Intolérance gastrique aux AINS.",
      groupeSanguin: GroupeSanguin.A_NEG,
      createdAt: new Date("2026-10-18T14:00:00.000Z"),
    },
  });

  const t1_p5 = await prisma.traitement.create({
    data: {
      patientId: p5.id,
      description: "Restaurations esthétiques directes par composite nano-hybride stratifié classe III (dents 11 et 21)",
      dent: "11, 21",
      prixTotal: 11000,
      statut: StatutTraitement.EN_COURS,
      createdAt: new Date("2026-10-18T14:30:00.000Z"),
      updatedAt: new Date("2026-10-18T16:00:00.000Z"),
    },
  });

  const rdv1_p5 = await prisma.rendezVous.create({
    data: {
      patientId: p5.id,
      traitementId: t1_p5.id,
      date: new Date("2026-10-18T14:30:00.000Z"),
      description: "Séance de soins conservateurs esthétiques antérieurs 11 et 21",
      note: "Attention intolérance aux anti-inflammatoires",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p5.id,
      rendezVousId: rdv1_p5.id,
      motifDeConsultation: "Lésions carieuses proximales inesthétiques et sensibilité au froid sur les incisives centrales 11 et 21",
      note: "Caries proximales mésiales classe III sans atteinte pulpaire sur 11 et 21. Pose de la digue dentaire pour isolation salivaire parfaite. Éviction carieuse sélective. Mordançage amélo-dentinaire et adhésif universel. Stratification composite (Dentine A3 et Émail A2 pour translucidité naturelle). Finition aux disques Sof-Lex.",
      createdAt: new Date("2026-10-18T14:45:00.000Z"),
      ordonnance: {
        create: {
          patientId: p5.id,
          createdAt: new Date("2026-10-18T15:30:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Paracétamol 1g (Doliprane)"],
                dosage: "1000 mg",
                frequence: "1 comprimé en cas de sensibilité (AINS proscrits)",
                duree: "3 jours",
                quantite: 1,
              },
              {
                medicamentId: medicationMap["Dentifrice désensibilisant au nitrate de potassium (Sensodyne)"],
                dosage: "Dentifrice",
                frequence: "Brossage doux 3 fois par jour",
                duree: "1 mois",
                quantite: 1,
              },
            ],
          },
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p5.id,
          acteRealise: "Éviction carieuse sous digue et obturations composites nano-hybrides stratifiées 11 et 21",
          createdAt: new Date("2026-10-18T15:45:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p5.id,
      traitementId: t1_p5.id,
      montant: 6000,
      date: new Date("2026-10-18T16:00:00.000Z"),
      note: "Versement séance 1 : Acompte restaurations composites antérieures (Reste 5 000 DZD)",
    },
  });

  await prisma.rendezVous.create({
    data: {
      patientId: p5.id,
      traitementId: t1_p5.id,
      date: new Date("2026-11-03T11:00:00.000Z"),
      description: "Séance de polissage haute brillance des composites et détartrage de contrôle",
      note: "Contrôler l'occlusion en propulsion",
    },
  });

  // ============================================================================
  // PATIENT 6: Yacine Haddad (Soins Pédiatriques, Coiffage Pulpaire & Sealants)
  // ============================================================================
  console.log("   -> Dossier 6 : Yacine Haddad (Soins pédiatriques molaire 36, Biodentine & scellement sillons)");
  const p6 = await prisma.patient.create({
    data: {
      nom: "Yacine Haddad",
      age: 9,
      dateDeNaissance: new Date("2017-05-14T00:00:00.000Z"),
      sexe: "Homme",
      telephone: "0663198254", // Téléphone du père M. Lyes Haddad
      adresse: "Rue Ben Badis, El-Harrouch, Skikda",
      antecedents: "Asthme infantile léger déclenché par le froid, sous Ventoline à la demande. Carnet vaccinal complet.",
      groupeSanguin: GroupeSanguin.O_POS,
      createdAt: new Date("2026-10-19T15:00:00.000Z"),
    },
  });

  const t1_p6 = await prisma.traitement.create({
    data: {
      patientId: p6.id,
      description: "Soins conservateurs pédiatriques : Coiffage pulpaire indirect Biodentine dent 36 et scellements préventifs des sillons 16, 26, 46",
      dent: "36, 16, 26, 46",
      prixTotal: 8500,
      statut: StatutTraitement.TERMINE,
      createdAt: new Date("2026-10-19T15:15:00.000Z"),
      updatedAt: new Date("2026-10-19T16:15:00.000Z"),
    },
  });

  const rdv1_p6 = await prisma.rendezVous.create({
    data: {
      patientId: p6.id,
      traitementId: t1_p6.id,
      date: new Date("2026-10-19T15:15:00.000Z"),
      description: "Consultation et soins dentaires pédiatriques",
      note: "Enfant accompagné de son père M. Lyes Haddad",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p6.id,
      rendezVousId: rdv1_p6.id,
      motifDeConsultation: "Sensibilité au sucre et douleur au brossage sur première molaire permanente 36",
      note: "Carie occlusale profonde sur molaire 36 chez un jeune garçon coopérant. Élimination sélective de la dentine infectée. Coiffage pulpaire indirect au silicate de calcium biocompatible (Biodentine) pour induire un pont dentinaire protecteur. Obturation coronaire au ciment verre ionomère condensable. Réalisation simultanée de scellements préventifs de sillons (Sealants) sur les molaires 16, 26 et 46.",
      createdAt: new Date("2026-10-19T15:30:00.000Z"),
      ordonnance: {
        create: {
          patientId: p6.id,
          createdAt: new Date("2026-10-19T16:00:00.000Z"),
          items: {
            create: [
              {
                medicamentId: medicationMap["Paracétamol sirop pédiatrique 30mg/ml"],
                dosage: "1 dose-poids",
                frequence: "1 dose-poids toutes les 6 heures si inconfort",
                duree: "2 jours",
                quantite: 1,
              },
            ],
          },
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p6.id,
          acteRealise: "Curetage carieux dent 36, coiffage Biodentine et scellements prophylactiques des sillons",
          createdAt: new Date("2026-10-19T16:10:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p6.id,
      traitementId: t1_p6.id,
      montant: 8500,
      date: new Date("2026-10-19T16:15:00.000Z"),
      note: "Règlement complet au comptant par le père du patient pour les soins pédiatriques (8 500 DZD)",
    },
  });

  // ============================================================================
  // PATIENT 7: Ahmed Zouaoui (Prothèse Complète Bimaxillaire Résine)
  // ============================================================================
  console.log("   -> Dossier 7 : Ahmed Zouaoui (Prothèse adjointe complète amovible bimaxillaire résine)");
  const p7 = await prisma.patient.create({
    data: {
      nom: "Ahmed Zouaoui",
      age: 68,
      dateDeNaissance: new Date("1958-02-18T00:00:00.000Z"),
      sexe: "Homme",
      telephone: "0550784199",
      adresse: "Cité Wiam, Didouche Mourad, Constantine",
      antecedents: "Cardiopathie ischémique avec antécédent de stent. Sous Kardegic 75mg et Atorvastatine 20mg.",
      groupeSanguin: GroupeSanguin.AB_POS,
      createdAt: new Date("2026-10-08T09:00:00.000Z"),
    },
  });

  const t1_p7 = await prisma.traitement.create({
    data: {
      patientId: p7.id,
      description: "Conception, confection et pose d'une prothèse adjointe complète amovible bimaxillaire en résine acrylique (Haut et Bas)",
      dent: "Arcades maxillaire et mandibulaire complètes",
      prixTotal: 55000,
      statut: StatutTraitement.EN_COURS,
      createdAt: new Date("2026-10-08T09:30:00.000Z"),
      updatedAt: new Date("2026-10-21T11:30:00.000Z"),
    },
  });

  // Séance 1 : Empreintes primaires
  const rdv1_p7 = await prisma.rendezVous.create({
    data: {
      patientId: p7.id,
      traitementId: t1_p7.id,
      date: new Date("2026-10-08T09:30:00.000Z"),
      description: "Consultation prothèse complète et empreintes primaires",
      note: "Patient sous Kardegic 75mg",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p7.id,
      rendezVousId: rdv1_p7.id,
      motifDeConsultation: "Édentement complet bimaxillaire, inconfort fonctionnel et instabilité sévère des anciennes prothèses",
      note: "Examen des crêtes édentées : Crête maxillaire bien conservée, crête mandibulaire très résorbée avec papilles piriformes dépressibles. Muqueuse buccale saine. Prise d'empreintes primaires mucostatiques à l'alginate pour réalisation des porte-empreintes individuels (PEI).",
      createdAt: new Date("2026-10-08T09:45:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t1_p7.id,
          acteRealise: "Examen prothétique complet et empreintes primaires bimaxillaires à l'alginate",
          createdAt: new Date("2026-10-08T10:15:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p7.id,
      traitementId: t1_p7.id,
      montant: 20000,
      date: new Date("2026-10-08T10:20:00.000Z"),
      note: "Versement séance 1 : Acompte d'engagement pour prothèse bimaxillaire complète",
    },
  });

  // Séance 2 : Empreintes fonctionnelles
  const rdv2_p7 = await prisma.rendezVous.create({
    data: {
      patientId: p7.id,
      traitementId: t1_p7.id,
      date: new Date("2026-10-21T10:30:00.000Z"),
      description: "Empreintes secondaires fonctionnelles aux PEI",
      note: "Enregistrement de la dynamique musculaire",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p7.id,
      rendezVousId: rdv2_p7.id,
      motifDeConsultation: "Empreintes anatomo-fonctionnelles sous pression musculaire",
      note: "Margination soignée des bords des PEI à la pâte thermoplastique de Kerr pour enregistrer la ligne de réflexion muqueuse, le frein de la lèvre et les poches de Fish à la mandibule. Empreinte fonctionnelle à la pâte oxyde de zinc-eugénol (Kelly's). Coulée des maîtres modèles.",
      createdAt: new Date("2026-10-21T10:45:00.000Z"),
      consultationsTraitement: {
        create: {
          traitementId: t1_p7.id,
          acteRealise: "Empreintes secondaires fonctionnelles maxillaire et mandibulaire au zinc-eugénol",
          createdAt: new Date("2026-10-21T11:20:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p7.id,
      traitementId: t1_p7.id,
      montant: 15000,
      date: new Date("2026-10-21T11:30:00.000Z"),
      note: "Versement séance 2 : Acompte fabrication laboratoire montage sur cire (Reste 20 000 DZD)",
    },
  });

  await prisma.rendezVous.create({
    data: {
      patientId: p7.id,
      traitementId: t1_p7.id,
      date: new Date("2026-11-06T15:00:00.000Z"),
      description: "Enregistrement de l'articulé inter-maxillaire et essayage esthétique du montage sur cire",
      note: "Vérifier la dimension verticale d'occlusion (DVO) et ligne du sourire",
    },
  });

  // ============================================================================
  // PATIENT 8: Samia Larbi (Fracture Coronaire Urgente & Collage Composite 21)
  // ============================================================================
  console.log("   -> Dossier 8 : Samia Larbi (Fracture traumatique incisive 21 & restauration esthétique)");
  const p8 = await prisma.patient.create({
    data: {
      nom: "Samia Larbi",
      age: 39,
      dateDeNaissance: new Date("1987-09-04T00:00:00.000Z"),
      sexe: "Femme",
      telephone: "0778921436",
      adresse: "Rue Colonel Amirouche, El-Harrouch, Skikda",
      antecedents: "Aucun antécédent médical notable. Bonne santé générale.",
      groupeSanguin: GroupeSanguin.B_NEG,
      createdAt: new Date("2026-10-26T16:00:00.000Z"),
    },
  });

  const t1_p8 = await prisma.traitement.create({
    data: {
      patientId: p8.id,
      description: "Reconstitution esthétique immédiate de l'angle mésio-incisif fracturé dent 21",
      dent: "21",
      prixTotal: 5000,
      statut: StatutTraitement.TERMINE,
      createdAt: new Date("2026-10-26T16:15:00.000Z"),
      updatedAt: new Date("2026-10-26T17:15:00.000Z"),
    },
  });

  const rdv1_p8 = await prisma.rendezVous.create({
    data: {
      patientId: p8.id,
      traitementId: t1_p8.id,
      date: new Date("2026-10-26T16:15:00.000Z"),
      description: "Urgence traumatisme dentaire incisive supérieure 21",
      note: "Reçue sans rendez-vous préalable",
    },
  });

  await prisma.consultation.create({
    data: {
      patientId: p8.id,
      rendezVousId: rdv1_p8.id,
      motifDeConsultation: "Fracture brutale de l'angle de l'incisive centrale gauche (21) lors d'un repas (noyau d'olive)",
      note: "Examen clinique : Fracture coronaire amélo-dentinaire sans exposition pulpaire (stade II d'Ellis). Test au froid positif (pulpe vivante). Pas de mobilité dentaire. Radiographie rétroalvéolaire excluant toute fracture radiculaire ou lésion ligamentaire. Biseautage amélaire vestibulaire en aile de mouette. Mordançage acide et système adhésif photopolymérisé. Reconstitution anatomique au composite céramique esthétique de haute translucidité. Polissage haute brillance immédiat.",
      createdAt: new Date("2026-10-26T16:30:00.000Z"),
      radios: {
        create: {
          patientId: p8.id,
          description: "Cliché rétroalvéolaire dent 21 confirmant l'absence de trait de fracture radiculaire ou d'atteinte apicale",
          fichier: "/uploads/radios/larbi_incisive21_retro.jpg",
          createdAt: new Date("2026-10-26T16:25:00.000Z"),
        },
      },
      consultationsTraitement: {
        create: {
          traitementId: t1_p8.id,
          acteRealise: "Biseautage, collage amélo-dentinaire et stratification composite esthétique angle incisif 21",
          createdAt: new Date("2026-10-26T17:05:00.000Z"),
        },
      },
    },
  });

  await prisma.paiement.create({
    data: {
      patientId: p8.id,
      traitementId: t1_p8.id,
      montant: 5000,
      date: new Date("2026-10-26T17:15:00.000Z"),
      note: "Règlement complet de la reconstitution esthétique composite dent 21 (5 000 DZD)",
    },
  });

  console.log("   ✅ Les 8 dossiers patients complets ont été insérés avec succès.");

  // -----------------------------------------------------------------------------
  // STEP 5: Realistic Operating Expenses (Dépenses du Cabinet)
  // -----------------------------------------------------------------------------
  console.log("\n💳 Étape 5 : Enregistrement des charges et dépenses d'exploitation du cabinet...");

  const operatingExpenses = [
    {
      montant: 22000,
      description: "Facture Laboratoire de Prothèse Dentaire Art & Sourire (Couronne céramique & châssis stellite) (Réf Clinique)",
      date: new Date("2026-10-02T10:00:00.000Z"),
    },
    {
      montant: 35000,
      description: "Loyer mensuel du local médical cabinet dentaire (Mois d'Octobre 2026) (Réf Clinique)",
      date: new Date("2026-10-05T09:00:00.000Z"),
    },
    {
      montant: 9500,
      description: "Achat consommables dentaires Comptoir Médico-Dentaire (Cartouches Septanest 1:200000, aiguilles, gants nitrile) (Réf Clinique)",
      date: new Date("2026-10-08T14:30:00.000Z"),
    },
    {
      montant: 4800,
      description: "Facture Sonelgaz Électricité et Gaz du cabinet (Alimentation compresseur, autoclave et scialytique) (Réf Clinique)",
      date: new Date("2026-10-14T11:00:00.000Z"),
    },
    {
      montant: 6200,
      description: "Réapprovisionnement pharmacie du cabinet : Composites Filtek, adhésifs, ciments Fuji I, Biodentine (Réf Clinique)",
      date: new Date("2026-10-18T16:00:00.000Z"),
    },
    {
      montant: 4500,
      description: "Maintenance trimestrielle et remplacement filtres compresseur médical et autoclave classe B (Réf Clinique)",
      date: new Date("2026-10-22T10:00:00.000Z"),
    },
    {
      montant: 3200,
      description: "Abonnement Internet Très Haut Débit Fibre Algérie Télécom (Idoom Fibre Pro) (Réf Clinique)",
      date: new Date("2026-10-27T12:00:00.000Z"),
    },
    {
      montant: 2800,
      description: "Produits de stérilisation et désinfection hospitalière (Aniosyme DD1, lingettes surfaces opératoires) (Réf Clinique)",
      date: new Date("2026-10-30T15:00:00.000Z"),
    },
  ];

  for (const exp of operatingExpenses) {
    await prisma.depense.create({ data: exp });
  }
  console.log(`   ✅ ${operatingExpenses.length} dépenses d'exploitation enregistrées.`);

  // -----------------------------------------------------------------------------
  // STEP 6: Comprehensive Verification & Financial Audit
  // -----------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("🔍 ÉTAPE 6 : AUDIT CLINIQUE, CONTRÔLE D'INTÉGRITÉ & CALCULS FINANCIERS");
  console.log("================================================================================\n");

  const totalPatients = await prisma.patient.count();
  const cohortPatients = await prisma.patient.findMany({
    where: { nom: { in: CLINICAL_COHORT_NAMES } },
    include: {
      traitements: {
        include: { versements: true, consultationsTraitement: true },
      },
      consultations: {
        include: {
          ordonnance: { include: { items: { include: { medicament: true } } } },
          bilanRecip: { include: { items: { include: { bilan: true } } } },
          radios: true,
          justificationRecord: true,
        },
      },
      rendezVous: true,
      paiements: true,
    },
  });

  console.log(`📊 Nombre total de patients en base : ${totalPatients} (Taille de la cohorte : ${cohortPatients.length})`);

  if (cohortPatients.length !== CLINICAL_COHORT_NAMES.length) {
    throw new Error(`Incohérence : ${CLINICAL_COHORT_NAMES.length} patients attendus, ${cohortPatients.length} trouvés.`);
  }

  let totalBilledCohort = 0;
  let totalPaidCohort = 0;
  let totalDebtCohort = 0;
  let countCompleted = 0;
  let countOngoing = 0;

  console.log("\n📋 DÉTAIL PAR DOSSIER PATIENT (ACTES, FACTURATION, RÈGLEMENTS) :");
  console.log("--------------------------------------------------------------------------------");

  for (const pat of cohortPatients) {
    let pBilled = 0;
    let pPaid = 0;

    for (const tr of pat.traitements) {
      pBilled += tr.prixTotal;
      if (tr.statut === StatutTraitement.TERMINE) countCompleted++;
      if (tr.statut === StatutTraitement.EN_COURS) countOngoing++;

      const trPaid = tr.versements.reduce((sum, v) => sum + v.montant, 0);
      pPaid += trPaid;
    }

    const pDebt = Math.max(0, pBilled - pPaid);
    totalBilledCohort += pBilled;
    totalPaidCohort += pPaid;
    totalDebtCohort += pDebt;

    const statusBadge = pDebt === 0 ? "✅ Soldé" : `⚠️ Reste dû : ${pDebt.toLocaleString("fr-FR")} DZD`;
    console.log(`• [${pat.nom.padEnd(23)}] | Devis: ${pBilled.toLocaleString("fr-FR").padStart(6)} DZD | Encaissé: ${pPaid.toLocaleString("fr-FR").padStart(6)} DZD | ${statusBadge}`);
    console.log(`    -> Consultations: ${pat.consultations.length} | Traitements: ${pat.traitements.length} | RDV: ${pat.rendezVous.length} | Versements: ${pat.paiements.length}`);
  }

  console.log("--------------------------------------------------------------------------------");
  console.log(`💰 Total Traitements Devisés (Cohorte) : ${totalBilledCohort.toLocaleString("fr-FR")} DZD`);
  console.log(`💵 Total Paiements Encaissés (Cohorte)  : ${totalPaidCohort.toLocaleString("fr-FR")} DZD`);
  console.log(`📌 Créances / Reste à Recouvrer         : ${totalDebtCohort.toLocaleString("fr-FR")} DZD`);
  console.log(`📈 Statuts des soins : ${countCompleted} Traitements Terminés | ${countOngoing} En Cours`);

  // Financial consistency verification
  if (totalBilledCohort - totalPaidCohort !== totalDebtCohort) {
    throw new Error("Erreur de cohérence mathématique : Total Devisé - Total Payé != Reste à recouvrer");
  }

  // Cabinet Overall Financial Statement
  const allExpenses = await prisma.depense.findMany();
  const totalDepensesCabinet = allExpenses.reduce((sum, d) => sum + d.montant, 0);
  const allPayments = await prisma.paiement.findMany();
  const totalEncaisseCabinet = allPayments.reduce((sum, p) => sum + p.montant, 0);
  const beneficeNetCabinet = totalEncaisseCabinet - totalDepensesCabinet;

  console.log("\n💼 SITUATION FINANCIÈRE GLOBALE DU CABINET (TOUTE ACTIVITÉ) :");
  console.log("--------------------------------------------------------------------------------");
  console.log(`🔹 Total des Dépenses et Charges         : ${totalDepensesCabinet.toLocaleString("fr-FR")} DZD`);
  console.log(`🔹 Total des Recettes Encaissées         : ${totalEncaisseCabinet.toLocaleString("fr-FR")} DZD`);
  console.log(`🔹 Bénéfice Net d'Exploitation           : ${beneficeNetCabinet.toLocaleString("fr-FR")} DZD`);

  // Foreign key and relational integrity checks
  console.log("\n🛡️ Contrôle rigoureux de l'intégrité référentielle :");
  
  const allOrdonnanceItems = await prisma.ordonnanceItem.findMany({
    select: { id: true, medicamentId: true, ordonnanceId: true },
  });
  const allMedicaments = await prisma.medicament.findMany({ select: { id: true } });
  const medIdSet = new Set(allMedicaments.map((m) => m.id));
  const orphanOrdonnanceItems = allOrdonnanceItems.filter((i) => !medIdSet.has(i.medicamentId)).length;

  const allBilanItems = await prisma.bilanItem.findMany({
    select: { id: true, bilanId: true, bilanRecipId: true },
  });
  const allBilans = await prisma.bilan.findMany({ select: { id: true } });
  const bilanIdSet = new Set(allBilans.map((b) => b.id));
  const orphanBilanItems = allBilanItems.filter((i) => !bilanIdSet.has(i.bilanId)).length;

  const allPaiementsList = await prisma.paiement.findMany({
    select: { id: true, patientId: true, traitementId: true },
  });
  const allPatientsList = await prisma.patient.findMany({ select: { id: true } });
  const patientIdSet = new Set(allPatientsList.map((p) => p.id));
  const allTraitementsList = await prisma.traitement.findMany({ select: { id: true } });
  const traitementIdSet = new Set(allTraitementsList.map((t) => t.id));
  const orphanPaiements = allPaiementsList.filter(
    (p) => !patientIdSet.has(p.patientId) || (p.traitementId && !traitementIdSet.has(p.traitementId))
  ).length;

  const allConsultTraits = await prisma.consultationTraitement.findMany({
    select: { id: true, consultationId: true, traitementId: true },
  });
  const allConsultationsList = await prisma.consultation.findMany({ select: { id: true } });
  const consultIdSet = new Set(allConsultationsList.map((c) => c.id));
  const orphanConsultTraits = allConsultTraits.filter(
    (ct) => !consultIdSet.has(ct.consultationId) || !traitementIdSet.has(ct.traitementId)
  ).length;

  console.log(`   - OrdonnanceItem sans médicament lié : ${orphanOrdonnanceItems}`);
  console.log(`   - BilanItem sans bilan associé       : ${orphanBilanItems}`);
  console.log(`   - Paiement sans dossier patient       : ${orphanPaiements}`);
  console.log(`   - Acte/Séance sans consultation liée : ${orphanConsultTraits}`);

  if (orphanOrdonnanceItems > 0 || orphanBilanItems > 0 || orphanPaiements > 0 || orphanConsultTraits > 0) {
    throw new Error("Échec d'intégrité : des enregistrements orphelins ont été détectés !");
  }

  console.log("   ✅ Intégrité référentielle 100% conforme. Aucun enregistrement orphelin.");

  console.log("\n================================================================================");
  console.log("🎉 PEUPLEMENT ET VÉRIFICATION DE LA BASE DE DONNÉES RÉUSSIS AVEC SUCCÈS !");
  console.log("================================================================================\n");
}

main()
  .catch((err) => {
    console.error("\n❌ ERREUR LORS DU PEUPLEMENT DE LA BASE DE DONNÉES :\n", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
