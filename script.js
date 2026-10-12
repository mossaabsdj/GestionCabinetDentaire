/**
 * ============================================================================
 * script.js - Nettoyage et Réinitialisation Réaliste de la Base de Données
 * Cabinet Dentaire - Système de Gestion Médicale et Financière
 * ============================================================================
 *
 * Ce script :
 * 1. Supprime l'ensemble des patients, bilans, médicaments, versements et dépenses existants.
 * 2. Ajoute des données réelles et authentiques :
 *    - Médicaments dentaires réels (antibiotiques, antalgiques, bains de bouche, etc.)
 *    - Bilans médicaux et imageries dentaires réels (NFS, Glycémie, TP/INR, Panoramique, etc.)
 *    - Patients algériens réels avec coordonnées, antécédents et groupes sanguins
 *    - Consultations cliniques et traitements dentaires avec numérotation FDI (11 à 48)
 *    - Versements strictement rattachés aux traitements (AUCUN versement libre - INTERDIT)
 *    - Dépenses réelles d'exploitation du cabinet dentaire
 * 3. Données limitées rigoureusement à 2 mois :
 *    - Mois précédent : Septembre 2026 (2026-09-01 au 2026-09-30)
 *    - Mois en cours   : Octobre 2026 (2026-10-01 au 2026-10-31)
 * 4. Synchronise automatiquement les séquences d'auto-incrémentation PostgreSQL.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// 1. CHARGEMENT DE L'ENVIRONNEMENT ET INITIALISATION PRISMA
// ============================================================================
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const firstEqual = trimmed.indexOf("=");
        if (firstEqual > 0) {
          const key = trimmed.substring(0, firstEqual).trim();
          let val = trimmed.substring(firstEqual + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.substring(1, val.length - 1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
}
loadEnv();

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /&channel_binding=require/g,
    "",
  )
    .replace(/\?channel_binding=require&/g, "?")
    .replace(/\?channel_binding=require$/g, "");
}

if (process.argv.includes("--local")) {
  process.env.DATABASE_URL =
    process.env.DATABASE_URLd ||
    "postgresql://postgres:user@localhost:5432/Dentaire";
}

let PrismaClient;
try {
  ({ PrismaClient } = require("./app/generated/prisma"));
} catch (e) {
  try {
    ({ PrismaClient } = require("@prisma/client"));
  } catch (err) {
    console.error("❌ Impossible de charger PrismaClient :", err.message);
    process.exit(1);
  }
}

const prisma = new PrismaClient();

// ============================================================================
// 2. DONNÉES RÉFÉRENTIELLES RÉELLES (MÉDICAMENTS & BILANS)
// ============================================================================
const REAL_MEDICAMENTS = [
  "Amoxicilline 500mg (Gélules)",
  "Amoxicilline 1g (Comprimés dispersibles)",
  "Augmentin 1g (Amoxicilline / Acide Clavulanique)",
  "Clamoxyl 1g (Comprimés)",
  "Spiramycine / Métronidazole (Rodogyl)",
  "Métronidazole 500mg (Flagyl)",
  "Paracétamol 1g (Doliprane)",
  "Paracétamol 500mg (Efferalgan)",
  "Ibuprofène 400mg (Advil)",
  "Kétoprofène 100mg (Bi-Profényd)",
  "Acide Méfénamique 500mg (Ponstyl)",
  "Prednisolone 20mg (Solupred)",
  "Bain de bouche Chlorhexidine 0.12% (Eludril)",
  "Bain de bouche Hextril 0.1%",
  "Daktarin Gel buccal 2%",
  "Tramadol / Paracétamol 37.5mg/325mg (Ixprim)",
  "Ciprofloxacine 500mg",
  "Codoliprane (Paracétamol / Codéine)",
  "Pansoral Gel buccal apaisant",
  "Bétadine Buccale 10%",
];

const REAL_BILANS = [
  "Numération Formule Sanguine (NFS / FNS)",
  "Glycémie à jeun",
  "Taux de Prothrombine (TP / INR)",
  "Temps de Céphaline Activée (TCA)",
  "Temps de Saignement (TS)",
  "Bilan d'hémostase préopératoire",
  "Radiographie Panoramique Dentaire (OPG)",
  "Scanner Cône Beam 3D (CBCT)",
  "Hémoglobine Glyquée (HbA1c)",
  "Créatinine sérique & Clairance",
  "Sérologie Hépatite B, C & VIH",
  "Bilan rénal complet (Urée / Créatinine)",
  "Vitesse de sédimentation (VS) & CRP",
  "Groupage Sanguin ABO-Rhésus",
  "Bilan calcique et phosphorique",
];

// ============================================================================
// 3. DONNÉES RÉELLES PATIENTS ALGÉRIENS
// ============================================================================
const REAL_PATIENTS = [
  {
    nom: "Benali Mohamed Amine",
    sexe: "HOMME",
    age: 34,
    dateDeNaissance: new Date("1992-05-14"),
    telephone: "0661 24 55 89",
    adresse: "Rue Didouche Mourad, Skikda",
    antecedents: "Aucun antécédent médical particulier",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Khelifi Fatima Zohra",
    sexe: "FEMME",
    age: 28,
    dateDeNaissance: new Date("1998-09-22"),
    telephone: "0550 42 18 73",
    adresse: "Cité des Frères Kafi, El-Harrouch",
    antecedents: "Aucun",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Boumaza Karim",
    sexe: "HOMME",
    age: 46,
    dateDeNaissance: new Date("1980-03-10"),
    telephone: "0771 90 44 21",
    adresse: "Boulevard Zaighoud Youcef, Azzaba",
    antecedents: "Hypertension artérielle sous traitement (Amlor 5mg)",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Chaoui Samira",
    sexe: "FEMME",
    age: 53,
    dateDeNaissance: new Date("1973-11-05"),
    telephone: "0662 33 91 04",
    adresse: "Centre-ville, Ramdane Djamel",
    antecedents: "Diabète de type 2 équilibré sous Glucophage",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Mansouri Ahmed",
    sexe: "HOMME",
    age: 20,
    dateDeNaissance: new Date("2006-07-18"),
    telephone: "0558 77 12 30",
    adresse: "Cité 20 Août 1955, El-Harrouch",
    antecedents: "Aucun antécédent",
    groupeSanguin: "A_NEG",
  },
  {
    nom: "Saidi Meriem",
    sexe: "FEMME",
    age: 31,
    dateDeNaissance: new Date("1995-02-28"),
    telephone: "0770 65 89 12",
    adresse: "Cité Zeramna, Skikda",
    antecedents: "Allergie avérée à la Pénicilline (Amoxicilline)",
    groupeSanguin: "AB_POS",
  },
  {
    nom: "Toumi Abdelkader",
    sexe: "HOMME",
    age: 64,
    dateDeNaissance: new Date("1962-08-12"),
    telephone: "0663 45 67 89",
    adresse: "Port de Collo, Skikda",
    antecedents: "Cardiopathie sous antiagrégant plaquettaire (Kardégic 75mg)",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Zerrouki Nadia",
    sexe: "FEMME",
    age: 39,
    dateDeNaissance: new Date("1987-04-16"),
    telephone: "0559 88 34 50",
    adresse: "Les Allées du 20 Août, Skikda",
    antecedents: "Asthme léger intermittent sous Ventoline",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Belkacem Yacine",
    sexe: "HOMME",
    age: 26,
    dateDeNaissance: new Date("2000-12-03"),
    telephone: "0772 34 56 78",
    adresse: "Rue Nationale, El-Harrouch",
    antecedents: "Aucun",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Hadji Leila",
    sexe: "FEMME",
    age: 44,
    dateDeNaissance: new Date("1982-06-25"),
    telephone: "0664 56 78 90",
    adresse: "Cité El-Amel, Tamalous",
    antecedents: "Hypothyroïdie traitée sous Lévothyrox 75µg",
    groupeSanguin: "O_NEG",
  },
  {
    nom: "Djebbar Bilal",
    sexe: "HOMME",
    age: 37,
    dateDeNaissance: new Date("1989-10-30"),
    telephone: "0551 23 98 76",
    adresse: "Zone Industrielle, Azzaba",
    antecedents: "Fumeur régulier (1 paquet/jour)",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Ouchene Rania",
    sexe: "FEMME",
    age: 22,
    dateDeNaissance: new Date("2004-01-15"),
    telephone: "0773 45 67 89",
    adresse: "Quartier Napolitain, Skikda",
    antecedents: "Aucun",
    groupeSanguin: "B_NEG",
  },
  {
    nom: "Guellati Mourad",
    sexe: "HOMME",
    age: 58,
    dateDeNaissance: new Date("1968-09-08"),
    telephone: "0665 67 89 01",
    adresse: "Cité Liberté, El-Harrouch",
    antecedents: "Diabète type 2 & HTA",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Yahiaoui Zineb",
    sexe: "FEMME",
    age: 35,
    dateDeNaissance: new Date("1991-03-20"),
    telephone: "0552 34 56 78",
    adresse: "Cité Belle-Vue, Constantine",
    antecedents: "Aucun",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Boutaleb Sofiane",
    sexe: "HOMME",
    age: 29,
    dateDeNaissance: new Date("1997-08-11"),
    telephone: "0774 56 78 90",
    adresse: "Avenue Houari Boumédiène, Skikda",
    antecedents: "Aucun",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Benaissa Amina",
    sexe: "FEMME",
    age: 49,
    dateDeNaissance: new Date("1977-05-19"),
    telephone: "0666 78 90 12",
    adresse: "Rue Ben Badis, El-Harrouch",
    antecedents: "Hypertension artérielle sous Co-Tareg",
    groupeSanguin: "AB_NEG",
  },
  {
    nom: "Cherif Walid",
    sexe: "HOMME",
    age: 33,
    dateDeNaissance: new Date("1993-11-27"),
    telephone: "0553 45 67 89",
    adresse: "Village Agricole, Azzaba",
    antecedents: "Aucun",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Meziani Asma",
    sexe: "FEMME",
    age: 27,
    dateDeNaissance: new Date("1999-07-04"),
    telephone: "0775 67 89 01",
    adresse: "Cité 500 Logements, Skikda",
    antecedents: "Allergie aux AINS (Aspirine/Ibuprofène)",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Mebarki Hichem",
    sexe: "HOMME",
    age: 41,
    dateDeNaissance: new Date("1985-02-17"),
    telephone: "0667 89 01 23",
    adresse: "Cité Martyrs, El-Harrouch",
    antecedents: "Ulcère gastrique cicatrisé",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Allouche Souad",
    sexe: "FEMME",
    age: 56,
    dateDeNaissance: new Date("1970-12-09"),
    telephone: "0554 45 67 89",
    adresse: "Corniche Ouest, Collo",
    antecedents: "Ostéoporose sous supplémentation calcium/vitamine D",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Tebboune Farouk",
    sexe: "HOMME",
    age: 24,
    dateDeNaissance: new Date("2002-04-30"),
    telephone: "0776 78 90 12",
    adresse: "Cité des Frères Saker, Skikda",
    antecedents: "Aucun",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Rahmani Kenza",
    sexe: "FEMME",
    age: 30,
    dateDeNaissance: new Date("1996-09-15"),
    telephone: "0668 90 12 34",
    adresse: "Cité Éducative, Ramdane Djamel",
    antecedents: "Grossesse en cours (2ème trimestre)",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Zouaoui Hamza",
    sexe: "HOMME",
    age: 38,
    dateDeNaissance: new Date("1988-06-08"),
    telephone: "0555 67 89 01",
    adresse: "Cité Verte, El-Harrouch",
    antecedents: "Aucun",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Benyahia Lyna",
    sexe: "FEMME",
    age: 17,
    dateDeNaissance: new Date("2009-10-12"),
    telephone: "0777 89 01 23",
    adresse: "Cité Frères Chebel, Skikda",
    antecedents: "Traitement orthodontique en cours",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Smati Tarek",
    sexe: "HOMME",
    age: 51,
    dateDeNaissance: new Date("1975-01-24"),
    telephone: "0669 01 23 45",
    adresse: "Cité El-Fedj, Azzaba",
    antecedents: "Hypertension artérielle sous Amlodipine",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Fares Nesrine",
    sexe: "FEMME",
    age: 36,
    dateDeNaissance: new Date("1990-08-03"),
    telephone: "0556 78 90 12",
    adresse: "Cité 100 Logements, El-Harrouch",
    antecedents: "Aucun",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Brahimi Youcef",
    sexe: "HOMME",
    age: 47,
    dateDeNaissance: new Date("1979-05-21"),
    telephone: "0778 90 12 34",
    adresse: "Faubourg de l'Espérance, Skikda",
    antecedents: "Diabète type 2",
    groupeSanguin: "A_POS",
  },
  {
    nom: "Hamidi Sabrina",
    sexe: "FEMME",
    age: 25,
    dateDeNaissance: new Date("2001-11-19"),
    telephone: "0660 12 34 56",
    adresse: "Cité Merdj Eddib, Skikda",
    antecedents: "Aucun",
    groupeSanguin: "B_POS",
  },
  {
    nom: "Larbi Mustapha",
    sexe: "HOMME",
    age: 66,
    dateDeNaissance: new Date("1960-03-02"),
    telephone: "0557 89 01 23",
    adresse: "Quartier Ancien, Collo",
    antecedents: "Porteur d'un stimulateur cardiaque (Pacemaker)",
    groupeSanguin: "O_POS",
  },
  {
    nom: "Sellami Chaima",
    sexe: "FEMME",
    age: 21,
    dateDeNaissance: new Date("2005-02-14"),
    telephone: "0779 01 23 45",
    adresse: "Cité Sonatrach, El-Harrouch",
    antecedents: "Aucun",
    groupeSanguin: "A_POS",
  },
];

// ============================================================================
// 4. PROTOCOLES CLINIQUES & PLANS DE TRAITEMENT AVEC VERSEMENTS
// ============================================================================
// Chaque cas clinique associe consultations, traitements (avec dent FDI) et
// versements STRICTEMENT RATTACHÉS au traitement (traitementId renseigné).
const CLINICAL_CASES = [
  // --- CAS SEPTEMBRE 2026 ---
  {
    patientIndex: 0, // Benali Mohamed Amine
    consultationDate: new Date("2026-09-02T09:30:00Z"),
    motif: "Douleur aiguë molaire supérieure droite au chaud et froid",
    note: "Examen clinique : carie profonde sur 16 avec pulpite irréversible. Nécessite endodontie complète.",
    traitement: {
      description: "Traitement endodontique (dévitalisation) molaire",
      dent: "16",
      prixTotal: 8000,
      statut: "TERMINE",
      date: new Date("2026-09-02T10:00:00Z"),
      versements: [
        {
          montant: 4000,
          date: new Date("2026-09-02T10:30:00Z"),
          note: "Acompte séance 1 : pulpectomie",
        },
        {
          montant: 4000,
          date: new Date("2026-09-09T11:00:00Z"),
          note: "Solde séance 2 : obturation canalaire définitive",
        },
      ],
    },
  },
  {
    patientIndex: 1, // Khelifi Fatima Zohra
    consultationDate: new Date("2026-09-03T14:15:00Z"),
    motif: "Visite de contrôle et saignement gingival au brossage",
    note: "Tartre supra et sous-gingival abondant secteur antérieur inférieur. Gingivite marginale.",
    traitement: {
      description: "Détartrage & Polissage complet aux ultra-sons",
      dent: "Arcades",
      prixTotal: 3000,
      statut: "TERMINE",
      date: new Date("2026-09-03T14:30:00Z"),
      versements: [
        {
          montant: 3000,
          date: new Date("2026-09-03T15:00:00Z"),
          note: "Règlement complet acte de détartrage",
        },
      ],
    },
  },
  {
    patientIndex: 2, // Boumaza Karim
    consultationDate: new Date("2026-09-05T10:00:00Z"),
    motif:
      "Fracture coronaire molaire inférieure gauche lors de la mastication",
    note: "Dent 36 dévitalisée anciennement, perte de substance importante. Indication couronne prothétique.",
    traitement: {
      description: "Pose couronne céramo-métallique sur dent 36",
      dent: "36",
      prixTotal: 22000,
      statut: "TERMINE",
      date: new Date("2026-09-05T10:30:00Z"),
      versements: [
        {
          montant: 10000,
          date: new Date("2026-09-05T11:00:00Z"),
          note: "Acompte prise d'empreinte prothèse",
        },
        {
          montant: 12000,
          date: new Date("2026-09-18T16:00:00Z"),
          note: "Solde lors du scellement définitif",
        },
      ],
    },
  },
  {
    patientIndex: 3, // Chaoui Samira
    consultationDate: new Date("2026-09-08T11:30:00Z"),
    motif: "Gêne esthétique et carie face vestibulaire incisive centrale",
    note: "Carie amélo-dentinaire 21 sans atteinte pulpaire. Patient diabétique surveillé.",
    traitement: {
      description: "Restauration composite esthétique face vestibulaire",
      dent: "21",
      prixTotal: 4000,
      statut: "TERMINE",
      date: new Date("2026-09-08T12:00:00Z"),
      versements: [
        {
          montant: 4000,
          date: new Date("2026-09-08T12:15:00Z"),
          note: "Paiement intégral après obturation composite",
        },
      ],
    },
  },
  {
    patientIndex: 4, // Mansouri Ahmed
    consultationDate: new Date("2026-09-10T15:00:00Z"),
    motif: "Douleur intense et trismus angle mandibulaire droit",
    note: "Péricoronarite aiguë sur dent de sagesse 48 incluse. Panoramique demandée puis avulsion chirurgicale.",
    traitement: {
      description: "Extraction chirurgicale dent de sagesse 48 incluse",
      dent: "48",
      prixTotal: 8500,
      statut: "TERMINE",
      date: new Date("2026-09-12T09:30:00Z"),
      versements: [
        {
          montant: 8500,
          date: new Date("2026-09-12T10:15:00Z"),
          note: "Règlement complet acte chirurgical",
        },
      ],
    },
  },
  {
    patientIndex: 5, // Saidi Meriem
    consultationDate: new Date("2026-09-14T09:00:00Z"),
    motif: "Mobilité dentaire et tassement alimentaire molaire 26",
    note: "Carie sous-gingivale non conservable. Patient allergique à la pénicilline.",
    traitement: {
      description: "Avulsion dentaire simple molaire 26",
      dent: "26",
      prixTotal: 2500,
      statut: "TERMINE",
      date: new Date("2026-09-14T09:30:00Z"),
      versements: [
        {
          montant: 2500,
          date: new Date("2026-09-14T09:45:00Z"),
          note: "Règlement séance avulsion",
        },
      ],
    },
  },
  {
    patientIndex: 6, // Toumi Abdelkader
    consultationDate: new Date("2026-09-16T10:30:00Z"),
    motif: "Édentement partiel maxillaire supérieur, difficulté à mastiquer",
    note: "Édentement bilatéral postérieur classe I de Kennedy. Prothèse amovible résine avec crochets.",
    traitement: {
      description: "Prothèse adjointe partielle résine (5 dents)",
      dent: "Maxillaire",
      prixTotal: 24000,
      statut: "EN_COURS",
      date: new Date("2026-09-16T11:00:00Z"),
      versements: [
        {
          montant: 10000,
          date: new Date("2026-09-16T11:30:00Z"),
          note: "Acompte empreinte primaire et secondaire",
        },
        {
          montant: 7000,
          date: new Date("2026-09-26T15:00:00Z"),
          note: "2ème versement essayage cire et dents",
        },
      ],
    },
  },
  {
    patientIndex: 7, // Zerrouki Nadia
    consultationDate: new Date("2026-09-19T14:00:00Z"),
    motif: "Sensibilité dentaire au froid molaire inférieure 46",
    note: "Carie occlusale moyenne sur 46, test de vitalité positif.",
    traitement: {
      description: "Obturation composite face occluso-mésiale 46",
      dent: "46",
      prixTotal: 4500,
      statut: "TERMINE",
      date: new Date("2026-09-19T14:30:00Z"),
      versements: [
        {
          montant: 4500,
          date: new Date("2026-09-19T15:00:00Z"),
          note: "Règlement comptant composite",
        },
      ],
    },
  },
  {
    patientIndex: 8, // Belkacem Yacine
    consultationDate: new Date("2026-09-22T16:00:00Z"),
    motif: "Désir d'éclaircissement dentaire pour mariage",
    note: "Coloration amélaire modérée. Détartrage préalable puis séance d'éclaircissement au fauteuil.",
    traitement: {
      description: "Blanchiment dentaire médicalisé au fauteuil",
      dent: "Arcades",
      prixTotal: 25000,
      statut: "TERMINE",
      date: new Date("2026-09-22T16:30:00Z"),
      versements: [
        {
          montant: 15000,
          date: new Date("2026-09-22T17:30:00Z"),
          note: "1er acompte séance d'éclaircissement",
        },
        {
          montant: 10000,
          date: new Date("2026-09-29T11:00:00Z"),
          note: "Solde contrôle post-blanchiment",
        },
      ],
    },
  },
  {
    patientIndex: 9, // Hadji Leila
    consultationDate: new Date("2026-09-25T11:00:00Z"),
    motif: "Infiltration sous ancienne obturation amalgame molaire 17",
    note: "Reprise carieuse sous amalgame défectueux, curetage et reconstitution composite renforcée.",
    traitement: {
      description: "Restauration coronaire composite 3 faces sur 17",
      dent: "17",
      prixTotal: 5500,
      statut: "TERMINE",
      date: new Date("2026-09-25T11:30:00Z"),
      versements: [
        {
          montant: 5500,
          date: new Date("2026-09-25T12:00:00Z"),
          note: "Paiement intégral après soin",
        },
      ],
    },
  },
  {
    patientIndex: 10, // Djebbar Bilal
    consultationDate: new Date("2026-09-28T15:30:00Z"),
    motif: "Mobilité importante et abcès parodontal incisives mandibulaires",
    note: "Parodontite avancée avec lyse osseuse. Traitement parodontal et détartrage sous-gingival.",
    traitement: {
      description:
        "Surfaçage radiculaire & curetage parodontal secteur mandibulaire",
      dent: "31-41-42",
      prixTotal: 12000,
      statut: "EN_COURS",
      date: new Date("2026-09-28T16:00:00Z"),
      versements: [
        {
          montant: 6000,
          date: new Date("2026-09-28T16:30:00Z"),
          note: "Acompte 1ère séance d'assainissement parodontal",
        },
      ],
    },
  },

  // --- CAS OCTOBRE 2026 ---
  {
    patientIndex: 11, // Ouchene Rania
    consultationDate: new Date("2026-10-01T09:15:00Z"),
    motif: "Dévitalisation molaire supérieure gauche 27",
    note: "Pulpite aiguë hyperalgique, extirpation pulpaire et mise sous pansement sédatif.",
    traitement: {
      description: "Traitement canalaire complet molaire 27",
      dent: "27",
      prixTotal: 7500,
      statut: "TERMINE",
      date: new Date("2026-10-01T09:45:00Z"),
      versements: [
        {
          montant: 4000,
          date: new Date("2026-10-01T10:15:00Z"),
          note: "1er versement : alésage et préparation canalaire",
        },
        {
          montant: 3500,
          date: new Date("2026-10-08T11:00:00Z"),
          note: "2ème versement : obturation canalaire définitive",
        },
      ],
    },
  },
  {
    patientIndex: 12, // Guellati Mourad
    consultationDate: new Date("2026-10-02T10:30:00Z"),
    motif: "Perte de bridge ancien et mastication compromise",
    note: "Plan de traitement prothétique avec pilier en zircone sur 14 et 16.",
    traitement: {
      description: "Bridge céramique Zircone 3 éléments (14-15-16)",
      dent: "14-15-16",
      prixTotal: 48000,
      statut: "EN_COURS",
      date: new Date("2026-10-02T11:00:00Z"),
      versements: [
        {
          montant: 20000,
          date: new Date("2026-10-02T11:45:00Z"),
          note: "Acompte initial taille des piliers & empreinte",
        },
        {
          montant: 15000,
          date: new Date("2026-10-09T14:30:00Z"),
          note: "2ème acompte essayage de l'armature zircone",
        },
      ],
    },
  },
  {
    patientIndex: 13, // Yahiaoui Zineb
    consultationDate: new Date("2026-10-03T14:00:00Z"),
    motif: "Détartrage annuel et contrôle général",
    note: "Bonne hygiène générale, léger tartre rétro-incisif inférieur.",
    traitement: {
      description: "Détartrage & Polissage prophylactique complet",
      dent: "Arcades",
      prixTotal: 3000,
      statut: "TERMINE",
      date: new Date("2026-10-03T14:30:00Z"),
      versements: [
        {
          montant: 3000,
          date: new Date("2026-10-03T14:45:00Z"),
          note: "Règlement complet acte de détartrage",
        },
      ],
    },
  },
  {
    patientIndex: 14, // Boutaleb Sofiane
    consultationDate: new Date("2026-10-05T09:30:00Z"),
    motif: "Choc accidentel au sport avec fracture coronaire 11",
    note: "Fracture de l'angle mésial 11 sans exposition pulpaire. Reconstitution esthétique composite stratifié.",
    traitement: {
      description: "Reconstitution composite esthétique angle incisif 11",
      dent: "11",
      prixTotal: 5000,
      statut: "TERMINE",
      date: new Date("2026-10-05T10:00:00Z"),
      versements: [
        {
          montant: 5000,
          date: new Date("2026-10-05T10:30:00Z"),
          note: "Paiement intégral acte composite esthétique",
        },
      ],
    },
  },
  {
    patientIndex: 15, // Benaissa Amina
    consultationDate: new Date("2026-10-06T11:00:00Z"),
    motif: "Douleur lancinante prémolaire 24 sous ancienne résine",
    note: "Récidive de carie profonde avec pulpite, traitement endodontique bi-canalaire nécessaire.",
    traitement: {
      description: "Endodontie & Reconstitution prémolaire 24",
      dent: "24",
      prixTotal: 6500,
      statut: "TERMINE",
      date: new Date("2026-10-06T11:30:00Z"),
      versements: [
        {
          montant: 3500,
          date: new Date("2026-10-06T12:00:00Z"),
          note: "Acompte pulpectomie canalaire",
        },
        {
          montant: 3000,
          date: new Date("2026-10-10T15:00:00Z"),
          note: "Solde obturation canalaire définitive",
        },
      ],
    },
  },
  {
    patientIndex: 16, // Cherif Walid
    consultationDate: new Date("2026-10-07T15:30:00Z"),
    motif: "Douleur à la pression molaire inférieure 47",
    note: "Nécrose pulpaire avec lésion péri-apicale visible à la radio. Dévitalisation débutée.",
    traitement: {
      description: "Traitement endodontique canalaire sur dent nécrosée 47",
      dent: "47",
      prixTotal: 8000,
      statut: "EN_COURS",
      date: new Date("2026-10-07T16:00:00Z"),
      versements: [
        {
          montant: 4000,
          date: new Date("2026-10-07T16:30:00Z"),
          note: "Acompte alésage et médication canalaire",
        },
      ],
    },
  },
  {
    patientIndex: 17, // Meziani Asma
    consultationDate: new Date("2026-10-08T09:00:00Z"),
    motif: "Sensibilité thermique prémolaires 14 et 15",
    note: "Caries cervicales d'abrasion sur 14 et 15. Obturation aux composites fluides.",
    traitement: {
      description: "Restaurations composites collets dentaires 14 et 15",
      dent: "14-15",
      prixTotal: 6000,
      statut: "TERMINE",
      date: new Date("2026-10-08T09:30:00Z"),
      versements: [
        {
          montant: 6000,
          date: new Date("2026-10-08T10:00:00Z"),
          note: "Règlement complet pour les deux restaurations",
        },
      ],
    },
  },
  {
    patientIndex: 18, // Mebarki Hichem
    consultationDate: new Date("2026-10-09T10:30:00Z"),
    motif: "Gêne lors de la mastication, débris dentaire pointu lingual 37",
    note: "Fracture d'un pan cuspidien lingual 37, curetage et reconstitution coronaire avec tenon.",
    traitement: {
      description:
        "Reconstitution coronaire au composite avec tenon fibré sur 37",
      dent: "37",
      prixTotal: 7500,
      statut: "TERMINE",
      date: new Date("2026-10-09T11:00:00Z"),
      versements: [
        {
          montant: 5000,
          date: new Date("2026-10-09T11:30:00Z"),
          note: "Acompte séance reconstitution avec tenon",
        },
        {
          montant: 2500,
          date: new Date("2026-10-11T16:00:00Z"),
          note: "Solde contrôle occlusion et polissage",
        },
      ],
    },
  },
  {
    patientIndex: 19, // Allouche Souad
    consultationDate: new Date("2026-10-10T14:15:00Z"),
    motif: "Perte de couronne ancienne et inflammation gencive",
    note: "Nettoyage radiculaire, inlay-core coulé et nouvelle couronne céramique.",
    traitement: {
      description: "Pose couronne céramo-métallique avec inlay-core sur 22",
      dent: "22",
      prixTotal: 25000,
      statut: "EN_COURS",
      date: new Date("2026-10-10T14:45:00Z"),
      versements: [
        {
          montant: 12000,
          date: new Date("2026-10-10T15:15:00Z"),
          note: "Acompte empreinte inlay-core",
        },
      ],
    },
  },
  {
    patientIndex: 20, // Tebboune Farouk
    consultationDate: new Date("2026-10-11T10:00:00Z"),
    motif: "Dents de sagesse douloureuses en évolution",
    note: "Évolution vicieuse des dents 38 et 48. Avulsion programmée de la dent 38 aujourd'hui.",
    traitement: {
      description: "Avulsion dent de sagesse 38 sous anesthésie locale",
      dent: "38",
      prixTotal: 3000,
      statut: "TERMINE",
      date: new Date("2026-10-11T10:30:00Z"),
      versements: [
        {
          montant: 3000,
          date: new Date("2026-10-11T11:00:00Z"),
          note: "Règlement complet acte d'extraction 38",
        },
      ],
    },
  },
  {
    patientIndex: 21, // Rahmani Kenza
    consultationDate: new Date("2026-10-11T11:30:00Z"),
    motif: "Gingivite gravidique avec saignements abondants spontanés",
    note: "Femme enceinte au 2ème trimestre, soins doux, détartrage sus-gingival atraumatique.",
    traitement: {
      description: "Détartrage doux supra-gingival et aéropolissage",
      dent: "Arcades",
      prixTotal: 3500,
      statut: "TERMINE",
      date: new Date("2026-10-11T12:00:00Z"),
      versements: [
        {
          montant: 3500,
          date: new Date("2026-10-11T12:15:00Z"),
          note: "Paiement intégral détartrage gravidique",
        },
      ],
    },
  },
  {
    patientIndex: 22, // Zouaoui Hamza
    consultationDate: new Date("2026-10-12T09:00:00Z"),
    motif: "Bilan complet et devis pour pose d'implant dentaire",
    note: "Édentement unitaire 46 depuis 2 ans, crête osseuse favorable à la radio panoramique.",
    traitement: {
      description:
        "Pose d'implant dentaire ostéointégré titane (Phase 1 chirurgie)",
      dent: "46",
      prixTotal: 65000,
      statut: "EN_COURS",
      date: new Date("2026-10-12T09:30:00Z"),
      versements: [
        {
          montant: 30000,
          date: new Date("2026-10-12T10:15:00Z"),
          note: "1er acompte chirurgie d'implantation dentaire 46",
        },
      ],
    },
  },
];

// ============================================================================
// 5. DÉPENSES RÉELLES DU CABINET DENTAIRE (SEPTEMBRE & OCTOBRE 2026)
// ============================================================================
const REAL_DEPENSES = [
  // --- DÉPENSES SEPTEMBRE 2026 ---
  {
    description:
      "Achat anesthésiques dentaires (Septanest 4% adrénaline - 2 boîtes de 50)",
    montant: 7500,
    date: new Date("2026-09-03T10:00:00Z"),
  },
  {
    description:
      "Fournitures consommables (gants latex, masques, bavoirs patients, pompe à salive)",
    montant: 12500,
    date: new Date("2026-09-06T14:30:00Z"),
  },
  {
    description: "Loyer mensuel du cabinet médical - Septembre 2026",
    montant: 40000,
    date: new Date("2026-09-08T09:00:00Z"),
  },
  {
    description:
      "Facture d'électricité et gaz Sonelgaz (climatisation et compresseur dentaire)",
    montant: 13800,
    date: new Date("2026-09-12T11:15:00Z"),
  },
  {
    description:
      "Kit résines composites et adhésif universel 3M ESPE (Seringues A2, A3)",
    montant: 21500,
    date: new Date("2026-09-16T15:00:00Z"),
  },
  {
    description:
      "Règlement prothésiste dentaire (travaux prothèses céramiques Septembre)",
    montant: 32000,
    date: new Date("2026-09-21T16:30:00Z"),
  },
  {
    description:
      "Achat fraises diamantées pour turbine et inserts détartrage Kavo",
    montant: 8200,
    date: new Date("2026-09-24T10:45:00Z"),
  },
  {
    description:
      "Produits de stérilisation et désinfection instrumentation autoclave (Anios)",
    montant: 10700,
    date: new Date("2026-09-28T12:00:00Z"),
  },

  // --- DÉPENSES OCTOBRE 2026 ---
  {
    description: "Loyer mensuel du cabinet médical - Octobre 2026",
    montant: 40000,
    date: new Date("2026-10-02T09:00:00Z"),
  },
  {
    description:
      "Achat cônes gutta-percha, ciment d'obturation canalaire AH Plus et digues",
    montant: 11500,
    date: new Date("2026-10-04T11:20:00Z"),
  },
  {
    description:
      "Fourniture coton salivaire, compresses stériles et aiguilles carpule 30G",
    montant: 6900,
    date: new Date("2026-10-06T14:10:00Z"),
  },
  {
    description:
      "Facture abonnement Internet fibre & Téléphonie Algérie Télécom",
    montant: 4200,
    date: new Date("2026-10-07T10:00:00Z"),
  },
  {
    description:
      "Maintenance préventive compresseur sans huile & autoclave classe B",
    montant: 16000,
    date: new Date("2026-10-09T16:00:00Z"),
  },
  {
    description:
      "Règlement prothésiste dentaire (acomptes couronnes zircone et châssis)",
    montant: 26500,
    date: new Date("2026-10-10T15:30:00Z"),
  },
  {
    description:
      "Achat rouleaux sachets de stérilisation thermosoudables et lingettes désinfectantes",
    montant: 7300,
    date: new Date("2026-10-11T11:45:00Z"),
  },
];

// ============================================================================
// 6. SYNCHRONISATION DES SÉQUENCES POSTGRESQL AUTO-INCREMENT
// ============================================================================
async function syncSequences() {
  console.log("🔄 Synchronisation des séquences PostgreSQL (MAX id)...");
  const models = [
    "Patient",
    "Consultation",
    "Traitement",
    "ConsultationTraitement",
    "Paiement",
    "Medicament",
    "Bilan",
    "BilanRecip",
    "BilanItem",
    "Ordonnance",
    "OrdonnanceItem",
    "Justification",
    "Depense",
    "Radio",
    "BilanFile",
    "RendezVous",
  ];

  for (const table of models) {
    try {
      const seqRes = await prisma.$queryRawUnsafe(
        `SELECT pg_get_serial_sequence('"${table}"', 'id') AS seq;`,
      );
      const seqName = seqRes[0]?.seq;
      if (seqName) {
        const maxRes = await prisma.$queryRawUnsafe(
          `SELECT COALESCE(MAX("id"), 0) AS max_id FROM "${table}";`,
        );
        const maxId = Number(maxRes[0]?.max_id || 0);
        if (maxId > 0) {
          await prisma.$executeRawUnsafe(
            `SELECT setval('${seqName}', ${maxId}, true);`,
          );
        }
      }
    } catch (err) {
      // Ignorer si pas sous PostgreSQL ou si table sans séquence
    }
  }
  console.log("✅ Séquences synchronisées avec succès.");
}

// ============================================================================
// 7. FONCTION PRINCIPALE D'EXÉCUTION
// ============================================================================
async function main() {
  console.log(
    "==================================================================",
  );
  console.log("🚀 SCRIPT D'INITIALISATION : CABINET DENTAIRE (2 MOIS RÉELS)");
  console.log(
    "==================================================================",
  );

  // 1. SUPPRESSION COMPLÈTE DES ANCIENNES DONNÉES
  console.log(
    "\n🗑️  Suppression des données existantes (Patients, Soins, Versements, Dépenses)...",
  );

  await prisma.paiement.deleteMany();
  await prisma.consultationTraitement.deleteMany();
  await prisma.rendezVous.deleteMany();
  await prisma.traitement.deleteMany();
  await prisma.radio.deleteMany();
  await prisma.bilanFile.deleteMany();
  await prisma.justification.deleteMany();
  await prisma.ordonnanceItem.deleteMany();
  await prisma.ordonnance.deleteMany();
  await prisma.bilanItem.deleteMany();
  await prisma.bilanRecip.deleteMany();
  await prisma.bilanTypeItem.deleteMany();
  await prisma.recetteTypeItem.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.patient.deleteMany();

  await prisma.bilan.deleteMany();
  await prisma.medicament.deleteMany();
  await prisma.depense.deleteMany();

  console.log(
    "✅ Toutes les anciennes données ont été supprimées avec succès.",
  );

  // 2. CRÉATION DES MÉDICAMENTS RÉELS
  console.log("\n💊 Création des médicaments dentaires réels...");
  for (const nom of REAL_MEDICAMENTS) {
    await prisma.medicament.create({ data: { nom } });
  }
  console.log(`✅ ${REAL_MEDICAMENTS.length} médicaments créés.`);

  // 3. CRÉATION DES BILANS RÉELS
  console.log("\n🧪 Création des bilans et analyses cliniques...");
  for (const nom of REAL_BILANS) {
    await prisma.bilan.create({ data: { nom } });
  }
  console.log(`✅ ${REAL_BILANS.length} bilans médicaux créés.`);

  // 4. CRÉATION DES PATIENTS RÉELS
  console.log("\n👥 Création des fiches patients réelles...");
  const createdPatients = [];
  for (const pData of REAL_PATIENTS) {
    const patient = await prisma.patient.create({ data: pData });
    createdPatients.push(patient);
  }
  console.log(`✅ ${createdPatients.length} patients enregistrés.`);

  // 5. CRÉATION DES CONSULTATIONS, TRAITEMENTS & VERSEMENTS STRICTS
  console.log(
    "\n🩺 Création des consultations, soins dentaires et versements rattachés...",
  );
  let countTreatments = 0;
  let countVersements = 0;
  let totalVersementsMontant = 0;

  for (const cCase of CLINICAL_CASES) {
    const patient = createdPatients[cCase.patientIndex];
    if (!patient) continue;

    // Consultation
    const consultation = await prisma.consultation.create({
      data: {
        patientId: patient.id,
        motifDeConsultation: cCase.motif,
        note: cCase.note,
        createdAt: cCase.consultationDate,
      },
    });

    // Traitement
    const traitement = await prisma.traitement.create({
      data: {
        patientId: patient.id,
        description: cCase.traitement.description,
        dent: cCase.traitement.dent,
        prixTotal: cCase.traitement.prixTotal,
        statut: cCase.traitement.statut,
        createdAt: cCase.traitement.date,
        updatedAt: cCase.traitement.date,
      },
    });
    countTreatments++;

    // ConsultationTraitement
    await prisma.consultationTraitement.create({
      data: {
        consultationId: consultation.id,
        traitementId: traitement.id,
        acteRealise: `Séance initiale de ${traitement.description} (Dent ${traitement.dent})`,
        createdAt: cCase.consultationDate,
      },
    });

    // Versements (STRICTEMENT LIÉS AU TRAITEMENT : traitementId NON-NULL)
    for (const vData of cCase.traitement.versements) {
      if (!traitement.id) {
        throw new Error(
          "❌ ERREUR : Tentative d'insertion d'un versement libre ! Interdit !",
        );
      }

      await prisma.paiement.create({
        data: {
          patientId: patient.id,
          traitementId: traitement.id, // TOUJOURS RATTACHÉ AU TRAITEMENT
          montant: vData.montant,
          date: vData.date,
          note: vData.note,
          createdAt: vData.date,
        },
      });
      countVersements++;
      totalVersementsMontant += vData.montant;
    }
  }

  console.log(`✅ ${countTreatments} traitements créés.`);
  console.log(
    `✅ ${countVersements} versements enregistrés (100% rattachés aux soins, 0 versement libre).`,
  );

  // 6. CRÉATION DES DÉPENSES RÉELLES (SEPTEMBRE & OCTOBRE 2026)
  console.log(
    "\n🧾 Création des dépenses réelles d'exploitation du cabinet...",
  );
  let countDepenses = 0;
  let totalDepensesMontant = 0;
  for (const dData of REAL_DEPENSES) {
    await prisma.depense.create({
      data: {
        description: dData.description,
        montant: dData.montant,
        date: dData.date,
        createdAt: dData.date,
      },
    });
    countDepenses++;
    totalDepensesMontant += dData.montant;
  }
  console.log(`✅ ${countDepenses} dépenses enregistrées.`);

  // 7. SYNCHRONISATION DES SÉQUENCES
  await syncSequences();

  // 8. CALCUL DES STATISTIQUES FINANCIÈRES DES 2 MOIS
  const septStart = new Date("2026-09-01T00:00:00Z");
  const septEnd = new Date("2026-09-30T23:59:59.999Z");
  const octStart = new Date("2026-10-01T00:00:00Z");
  const octEnd = new Date("2026-10-31T23:59:59.999Z");

  const septPaiements = await prisma.paiement.findMany({
    where: { date: { gte: septStart, lte: septEnd } },
  });
  const septDepenses = await prisma.depense.findMany({
    where: { date: { gte: septStart, lte: septEnd } },
  });
  const septTotalEncaisse = septPaiements.reduce(
    (sum, p) => sum + p.montant,
    0,
  );
  const septTotalDep = septDepenses.reduce((sum, d) => sum + d.montant, 0);
  const septBenefice = septTotalEncaisse - septTotalDep;

  const octPaiements = await prisma.paiement.findMany({
    where: { date: { gte: octStart, lte: octEnd } },
  });
  const octDepenses = await prisma.depense.findMany({
    where: { date: { gte: octStart, lte: octEnd } },
  });
  const octTotalEncaisse = octPaiements.reduce((sum, p) => sum + p.montant, 0);
  const octTotalDep = octDepenses.reduce((sum, d) => sum + d.montant, 0);
  const octBenefice = octTotalEncaisse - octTotalDep;

  // Vérification de sécurité : 0 versement libre
  const versLibres = await prisma.paiement.count({
    where: { traitementId: null },
  });

  console.log(
    "\n==================================================================",
  );
  console.log("📊 BILAN RÉCAPITULATIF DES DONNÉES GÉNÉRÉES");
  console.log(
    "==================================================================",
  );
  console.log(`👥 Patients créés       : ${createdPatients.length}`);
  console.log(`💊 Médicaments créés    : ${REAL_MEDICAMENTS.length}`);
  console.log(`🧪 Bilans créés         : ${REAL_BILANS.length}`);
  console.log(`🦷 Soins / Traitements  : ${countTreatments}`);
  console.log(
    `💵 Versements rattachés : ${countVersements} (Versements libres interdits : ${versLibres})`,
  );
  console.log(`🧾 Dépenses du cabinet  : ${countDepenses}`);
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("📅 MOIS PRÉCÉDENT (SEPTEMBRE 2026) :");
  console.log(
    `   - Total Encaissé  : ${septTotalEncaisse.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    `   - Total Dépenses  : ${septTotalDep.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    `   - Bénéfice Net    : ${septBenefice.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    "------------------------------------------------------------------",
  );
  console.log("📅 MOIS EN COURS (OCTOBRE 2026) :");
  console.log(
    `   - Total Encaissé  : ${octTotalEncaisse.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    `   - Total Dépenses  : ${octTotalDep.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    `   - Bénéfice Net    : ${octBenefice.toLocaleString("fr-FR")} DZD`,
  );
  console.log(
    "==================================================================",
  );
  console.log(
    "✨ BASE DE DONNÉES RÉINITIALISÉE AVEC SUCCÈS SUR LES 2 DERNIERS MOIS !",
  );
  console.log(
    "==================================================================",
  );
}

main()
  .catch((err) => {
    console.error("❌ Erreur pendant l'exécution du script :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
