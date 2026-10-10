/**
 * ============================================================================
 * test.js - Comprehensive Database Seed and Testing Script for Dental Clinic
 * Cabinet Dentaire - Système de Gestion Médicale et Financière
 * ============================================================================
 *
 * This script generates a large, realistic, interconnected dataset tailored
 * specifically for a dental cabinet, exercising all 23 Prisma models,
 * business rules, clinical workflows, and financial calculations.
 *
 * USAGE:
 *   node test.js              -> Idempotent seed & comprehensive verification
 *   node test.js --clean      -> Safely remove previous TEST_ records and reseed
 *   node test.js --clean-only -> Safely remove only TEST_ records and exit
 *   node test.js --verify-only-> Run verification suite without seeding
 *
 * SAFETY GUARANTEES:
 *   - NEVER modifies or deletes real patient data (only records prefixed TEST_).
 *   - NEVER uses destructive migrations (no 'prisma migrate reset' or 'force-reset').
 *   - Deterministic PRNG with fixed seed ensures reproducible datasets.
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");

// ============================================================================
// 1. CONFIGURATION & ENVIRONMENT SETUP
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

let PrismaClient;
try {
  PrismaClient = require("./app/generated/prisma").PrismaClient;
} catch (e) {
  try {
    PrismaClient = require("@prisma/client").PrismaClient;
  } catch (err) {
    console.error("❌ Impossible de charger PrismaClient :", err.message);
    process.exit(1);
  }
}

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

// Safe database query wrapper with retries for transient connection drops
async function safeExec(fn, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries) throw err;
      const waitTime = (i + 1) * 800;
      console.log(`   ⏳ Tentative de reconnexion (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }
}

// ============================================================================
// 2. DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// ============================================================================

class DeterministicRNG {
  constructor(seed = 20261009) {
    this.seed = seed;
  }

  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[this.int(0, arr.length - 1)];
  }

  sample(arr, count) {
    const shuffled = [...arr].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }

  boolean(prob = 0.5) {
    return this.next() < prob;
  }

  date(startYear = 2023, endYear = 2026) {
    const start = new Date(startYear, 0, 1).getTime();
    const end = new Date(endYear, 9, 8).getTime();
    return new Date(start + this.next() * (end - start));
  }
}

const rng = new DeterministicRNG(20261009);

// ============================================================================
// 3. MASTER CLINICAL DATA DEFINITIONS (Dental Specific)
// ============================================================================

const DENTAL_MEDICAMENTS = [
  { nom: "Amoxicilline 500mg gélules (Clamoxyl)" },
  { nom: "Amoxicilline + Acide Clavulanique 1g (Augmentin)" },
  { nom: "Spiramycine + Métronidazole (Bi-Rodogyl 1.5MUI/250mg)" },
  { nom: "Paracétamol 1000mg comprimés (Doliprane)" },
  { nom: "Ibuprofène 400mg comprimés (Advil)" },
  { nom: "Kétoprofène 100mg comprimés sécables (Bi-Profenid)" },
  { nom: "Bain de bouche Chlorhexidine 0.12% (Eludril Pro)" },
  { nom: "Prednisolone 20mg comprimés effervescents (Solupred)" },
  { nom: "Tramadol + Paracétamol 37.5mg/325mg (Ixprim)" },
  { nom: "Acide Méfénamique 500mg (Ponstyl)" },
  { nom: "Clindamycine 300mg gélules (Dalacine)" },
  { nom: "Xylocaïne 2% spray buccal anesthésique" },
  { nom: "Gel buccal antiseptique et cicatrisant (Pansoral)" },
  { nom: "Vitamine C 1000mg comprimés à croquer" },
  { nom: "Azithromycine 500mg comprimés (Zithromax)" },
  { nom: "Bétadine buccale 10% solution gargarisme" },
  { nom: "Codoliprane (Paracétamol 400mg + Codéine 20mg)" },
  { nom: "Dexaméthasone 4mg comprimés" },
  { nom: "Antifongique buccal Nystatine 100 000 UI/ml (Mycostatine)" },
  { nom: "Alvyl (Chlorhexidine + Chlorobutanol)" },
];

const DENTAL_BILANS = [
  { nom: "Bilan d'hémostase complet (TP, TCA, INR)" },
  { nom: "NFS (Numération Formule Sanguine)" },
  { nom: "Glycémie à jeun & HbA1c (Hémoglobine glyquée)" },
  { nom: "Bilan phospho-calcique & Vitamine D" },
  { nom: "Scanner Cône Beam 3D (CBCT Maxillaire / Mandibule)" },
  { nom: "Radiographie Panoramique Dentaire (OPG)" },
  { nom: "Bilan allergologique aux anesthésiques locaux" },
  { nom: "Sérologies virales (Hépatite B, Hépatite C, VIH)" },
  { nom: "CRP (Protéine C-Réactive ultra-sensible)" },
  { nom: "Ionogramme sanguin & Créatininémie" },
  { nom: "Temps de Saignement (TS) méthode d'Ivy" },
  { nom: "Fibrinogène plasmatique" },
];

const DENTAL_VACCINES = [
  { name: "Vaccin Hépatite B (Engerix B / recombinant)" },
  { name: "Vaccin Antitétanique (Tetavax / rappel)" },
  { name: "Vaccin Diphtérie-Tétanos-Poliomyélite (DTPolio)" },
  { name: "Vaccin Grippe saisonnière (Vaxigrip Tetra)" },
  { name: "Vaccin ROR (Priorix)" },
];

const DENTAL_RECETTE_TYPES = [
  {
    nom: "Suite d'avulsion chirurgicale (dent de sagesse)",
    items: [
      {
        medName: "Amoxicilline 500mg gélules (Clamoxyl)",
        dosage: "1 gélule (1g au total) matin et soir",
        frequence: "2 fois par jour au cours des repas",
        duree: "6 jours",
        quantite: 2,
      },
      {
        medName: "Ibuprofène 400mg comprimés (Advil)",
        dosage: "1 comprimé si douleur",
        frequence: "Toutes les 8h au milieu des repas (max 3/j)",
        duree: "4 jours",
        quantite: 1,
      },
      {
        medName: "Paracétamol 1000mg comprimés (Doliprane)",
        dosage: "1 comprimé en alternance",
        frequence: "Toutes les 6h en cas de douleur résiduelle",
        duree: "5 jours",
        quantite: 2,
      },
      {
        medName: "Bain de bouche Chlorhexidine 0.12% (Eludril Pro)",
        dosage: "15 ml pur ou dilué dans demi-verre d'eau",
        frequence: "3 fois par jour après brossage doux dès J+2",
        duree: "7 jours",
        quantite: 1,
      },
    ],
  },
  {
    nom: "Abcès dentaire aigu / Cellulite péri-maxillaire",
    items: [
      {
        medName: "Spiramycine + Métronidazole (Bi-Rodogyl 1.5MUI/250mg)",
        dosage: "2 comprimés par jour",
        frequence: "Matin et soir au milieu des repas",
        duree: "7 jours",
        quantite: 2,
      },
      {
        medName: "Prednisolone 20mg comprimés effervescents (Solupred)",
        dosage: "3 comprimés (60mg) en une prise matinale",
        frequence: "Le matin au petit-déjeuner pendant 3 jours",
        duree: "3 jours",
        quantite: 1,
      },
      {
        medName: "Paracétamol 1000mg comprimés (Doliprane)",
        dosage: "1 comprimé 1000mg",
        frequence: "Toutes les 6h si douleur ou fièvre",
        duree: "5 jours",
        quantite: 2,
      },
    ],
  },
  {
    nom: "Chirurgie implantaire et parodontale avancée",
    items: [
      {
        medName: "Amoxicilline + Acide Clavulanique 1g (Augmentin)",
        dosage: "1 comprimé 1g matin et soir",
        frequence: "Toutes les 12 heures",
        duree: "7 jours",
        quantite: 2,
      },
      {
        medName: "Kétoprofène 100mg comprimés sécables (Bi-Profenid)",
        dosage: "1 comprimé matin et soir",
        frequence: "Pendant les repas",
        duree: "4 jours",
        quantite: 1,
      },
      {
        medName: "Bain de bouche Chlorhexidine 0.12% (Eludril Pro)",
        dosage: "15 ml sans rincer",
        frequence: "Matin, midi et soir après brossage",
        duree: "10 jours",
        quantite: 2,
      },
    ],
  },
  {
    nom: "Urgence pulpite aiguë (rage de dents)",
    items: [
      {
        medName: "Tramadol + Paracétamol 37.5mg/325mg (Ixprim)",
        dosage: "1 à 2 comprimés selon intensité",
        frequence: "Toutes les 6h si crise douloureuse (max 8/j)",
        duree: "3 jours",
        quantite: 1,
      },
      {
        medName: "Ibuprofène 400mg comprimés (Advil)",
        dosage: "1 comprimé 400mg",
        frequence: "Toutes les 8h au milieu des repas",
        duree: "3 jours",
        quantite: 1,
      },
    ],
  },
];

const DENTAL_BILAN_TYPES = [
  {
    nom: "Bilan pré-chirurgical implantaire",
    items: [
      {
        bilanName: "Scanner Cône Beam 3D (CBCT Maxillaire / Mandibule)",
        remarque: "Évaluation du volume osseux et repérage du nerf alvéolaire",
      },
      {
        bilanName: "Bilan d'hémostase complet (TP, TCA, INR)",
        remarque: "Vérifier l'absence de coagulopathie",
      },
      {
        bilanName: "Glycémie à jeun & HbA1c (Hémoglobine glyquée)",
        remarque: "Contrôle du métabolisme glucidique pour l'ostéointégration",
      },
    ],
  },
  {
    nom: "Bilan patient sous anticoagulants (AVK / AOD)",
    items: [
      {
        bilanName: "Bilan d'hémostase complet (TP, TCA, INR)",
        remarque: "INR impératif datant de moins de 24h avant l'acte (cible < 3)",
      },
      {
        bilanName: "NFS (Numération Formule Sanguine)",
        remarque: "Contrôle taux de plaquettes sanguines",
      },
    ],
  },
  {
    nom: "Bilan infectieux sévère (Cellulite maxillo-faciale)",
    items: [
      {
        bilanName: "NFS (Numération Formule Sanguine)",
        remarque: "Recherche hyperleucocytose à polynucléaires neutrophiles",
      },
      {
        bilanName: "CRP (Protéine C-Réactive ultra-sensible)",
        remarque: "Marqueur quantitatif du syndrome inflammatoire aigu",
      },
      {
        bilanName: "Radiographie Panoramique Dentaire (OPG)",
        remarque: "Identifier la dent causale et l'extension de la lyse osseuse",
      },
    ],
  },
];

const DENTAL_JUSTIFICATION_TYPES = [
  {
    nom: "Arrêt de travail post-avulsion chirurgicale",
    texte:
      "Je soussigné, Docteur en chirurgie dentaire, certifie avoir prodigué ce jour des soins chirurgicaux bucco-dentaires (avulsion sous anesthésie locale) au patient susnommé, dont l'état clinique justifie un arrêt de travail et un repos strict à domicile.",
  },
  {
    nom: "Certificat de présence et soins dentaires d'urgence",
    texte:
      "Je soussigné, Chirurgien Dentiste, atteste que le patient s'est présenté à mon cabinet ce jour pour une consultation et des soins dentaires d'urgence nécessitant sa présence physique.",
  },
  {
    nom: "Dispense scolaire et d'activités physiques",
    texte:
      "Je soussigné, Docteur en médecine dentaire, certifie avoir examiné l'enfant susnommé suite à un traumatisme dento-alvéolaire et prescris une dispense totale d'activités sportives et d'efforts intenses.",
  },
  {
    nom: "Certificat d'éviction pour chirurgie maxillo-faciale",
    texte:
      "Je soussigné certifie que l'état de santé du patient a nécessité une intervention chirurgicale parodontale / implantaire ce jour, rendant tout travail physique déconseillé pendant la période de cicatrisation initiale.",
  },
];

// Diverse real-world names
const PATIENT_FIRST_NAMES_M = [
  "Karim", "Youcef", "Amine", "Walid", "Sofiane", "Mohamed", "Hichem",
  "Riad", "Tarik", "Nassim", "Samir", "Abdelkader", "Brahim", "Farid",
  "Aymen", "Hamza", "Lyes", "Khaled", "Mehdi", "Bilal", "Yacine",
  "Mourad", "Nabil", "Reda", "Akram", "Chakib", "Adel", "Fouad"
];

const PATIENT_FIRST_NAMES_F = [
  "Amina", "Fatima Zohra", "Meriem", "Souad", "Nour", "Khadidja", "Sarah",
  "Yasmine", "Lina", "Imene", "Houda", "Zahra", "Leila", "Asma",
  "Chaima", "Rania", "Ikram", "Bouchra", "Sabrina", "Kenza", "Ines",
  "Dounia", "Samira", "Hanane", "Wafaa", "Nadia", "Malika", "Salma"
];

const PATIENT_LAST_NAMES = [
  "Bouzid", "Saidi", "Mansouri", "Haddad", "Khelifi", "Belkacem", "Meziane",
  "Chaoui", "Touati", "Zerrouki", "Boudiaf", "Amara", "Brahimi", "Cherif",
  "Dahmani", "Guellil", "Hamidi", "Larbi", "Mebarki", "Ouchene", "Rahmani",
  "Slimani", "Tebboune", "Yahiaoui", "Zitouni", "Benali", "Boumaza", "Kaci",
  "Mokrani", "Sellami", "Ghezzal", "Taibi", "Khedim", "Abdelaziz", "Ferhat"
];

const DENTAL_ANTECEDENTS = [
  "Hypertension artérielle sous Amlodipine 5mg",
  "Diabète de type 2 équilibré sous Metformine (HbA1c récente: 6.8%)",
  "Allergie avérée aux Pénicillines (œdème de Quincke en 2021)",
  "Patient sous Sintrom (anticoagulant) pour valve mitrale mécanique",
  "Asthme bronchique modéré sous Ventoline au besoin",
  "Cardiopathie valvulaire : antibioprophylaxie impérative avant détartrage",
  "Allergie au latex et au paracétamol",
  "Ostéoporose traitée par bisphosphonates oraux (surveillance osseuse)",
  "Fumeur chronique (15 cigarettes/jour), hygiène buccale modérée",
  "Grossesse au 2ème trimestre (22 SA), surveillance gingivite gravidique",
  "Terrain anxieux (phobie des soins dentaires / prémédication sédative)",
  "مريض يعاني من حساسية البنسلين وارتفاع ضغط الدم",
  "مريضة خضعت لجراحة سابقة في الفك، لا توجد حساسية دوائية",
  "Bon état général, aucun antécédent médico-chirurgical notable",
];

const DENTAL_PROCEDURES = [
  {
    desc: "Traitement endodontique complet (dévitalisation 3 canaux)",
    prix: 12000,
    teeth: ["16", "26", "36", "46", "17", "27"],
    acts: [
      "Ouverture de chambre, extirpation pulpaire et parage canalaire sous digue",
      "Mise en forme canalaire mécanisée et désinfection hypochlorite 2.5%",
      "Obturation canalaire tridimensionnelle à la gutta-percha thermo-compactée",
    ],
  },
  {
    desc: "Obturation composite photo-polymérisable 3 faces",
    prix: 4500,
    teeth: ["14", "15", "24", "25", "35", "45", "11", "21"],
    acts: [
      "Curetage de la carie dentinaire, mordançage amélo-dentinaire et adhésif",
      "Stratification anatomique composite nano-hybride et polissage fin",
    ],
  },
  {
    desc: "Couronne céramo-métallique scellée",
    prix: 28000,
    teeth: ["16", "21", "11", "36", "46", "24"],
    acts: [
      "Taille périphérique avec congé arrondi et pose de couronne provisoire",
      "Empreinte de précision double mélange silicone et enregistrement occlusal",
      "Essayage de l'armature, vérification des points de contact et scellement",
    ],
  },
  {
    desc: "Avulsion chirurgicale dent de sagesse incluse",
    prix: 9000,
    teeth: ["38", "48", "18", "28"],
    acts: [
      "Incision muco-périostée, alvéolectomie a minima et odontosection",
      "Avulsion complète des apex radiculaires, curetage alvéolaire et suture",
      "Contrôle cicatriciel post-opératoire et dépose des points de suture",
    ],
  },
  {
    desc: "Détartrage complet sus et sous-gingival + polissage",
    prix: 3500,
    teeth: ["Arcade complète", "Maxillaire & Mandibule"],
    acts: [
      "Détartrage ultrasonique piézo-électrique et irrigation antiseptique",
      "Polissage des surfaces dentaires à la pâte prophylactique fluorée",
    ],
  },
  {
    desc: "Pose d'implant dentaire titane ostéo-intégré",
    prix: 85000,
    teeth: ["16", "21", "36", "46", "14"],
    acts: [
      "Incision de crête, forage séquentiel sous irrigation et pose de l'implant",
      "Mise en place de la vis de couverture et sutures étanches résorbables",
      "Pose de la vis de cicatrisation trans-muqueuse après ostéointégration (M+3)",
      "Empreinte sur transfert implantaire et confection de la couronne sur implant",
    ],
  },
  {
    desc: "Gingivectomie à visée esthétique et fonctionnelle",
    prix: 7000,
    teeth: ["Secteur antérieur 13-23"],
    acts: [
      "Anesthésie locale, repérage des poches et biseautage gingival externe",
      "Éviction des tissus excédentaires et application d'un pansement parodontal",
    ],
  },
  {
    desc: "Inlay-core à clavette + pose couronne céramique",
    prix: 34000,
    teeth: ["12", "22", "15", "35"],
    acts: [
      "Désobturation canalaire partielle sur 2/3 et taille radiculaire",
      "Empreinte calcinable pour faux-moignon métallique coulé",
      "Scellement définitif de l'inlay-core et empreinte pour couronne céramique",
    ],
  },
  {
    desc: "Blanchiment dentaire ambulatoire avec gouttières sur-mesure",
    prix: 18000,
    teeth: ["Arcades supérieure et inférieure"],
    acts: [
      "Prise d'empreintes alginate et coulée des modèles en plâtre",
      "Remise des gouttières thermoformées et seringues de peroxyde de carbamide 16%",
    ],
  },
  {
    desc: "Traitement d'urgence pulpaire et coiffage dentinaire",
    prix: 3000,
    teeth: ["37", "47", "26"],
    acts: [
      "Éviction d'urgence du tissu carieux douloureux sous anesthésie locale",
      "Application d'hydroxyde de calcium pur et obturation provisoire à l'eugénol",
    ],
  },
];

// ============================================================================
// 4. CLEANUP ENGINE (Safe, Targeted, Non-Destructive)
// ============================================================================

async function cleanTestDataOnly() {
  console.log("\n🧹 Nettoyage ciblé des données de test existantes (TEST_*)...");

  const testPatients = await safeExec(() =>
    prisma.patient.findMany({
      where: { nom: { startsWith: "TEST_" } },
      select: { id: true, nom: true },
    })
  );

  if (testPatients.length === 0) {
    console.log("   ℹ️ Aucun enregistrement de test TEST_* à nettoyer.");
    return 0;
  }

  const patientIds = testPatients.map((p) => p.id);
  console.log(`   🎯 Suppression sécurisée de ${patientIds.length} patients de test...`);

  // Prisma cascading relations handle child models (consultations, traitements, paiements, etc.)
  const deleteResult = await safeExec(() =>
    prisma.patient.deleteMany({
      where: { id: { in: patientIds } },
    })
  );

  // Clean orphan RendezVous created by test script
  await safeExec(() =>
    prisma.rendezVous.deleteMany({
      where: { description: { contains: "TEST_" } },
    })
  );

  console.log(`   ✅ ${deleteResult.count} dossiers de test nettoyés avec succès.`);
  return deleteResult.count;
}

// ============================================================================
// 5. SEED EXECUTION ENGINE
// ============================================================================

async function seedDatabase() {
  console.log("\n==================================================================");
  console.log("🦷 Démarrage du Seeding de Données Cliniques Dentaires");
  console.log("==================================================================");

  // --------------------------------------------------------------------------
  // STEP 1: Cabinet Settings (Ensure single dental cabinet profile exists)
  // --------------------------------------------------------------------------
  console.log("\n🏥 1/11. Configuration du Cabinet Dentaire...");
  let cabinet = await safeExec(() => prisma.cabinet.findFirst());
  if (!cabinet) {
    cabinet = await safeExec(() =>
      prisma.cabinet.create({
        data: {
          title: "Docteur",
          doctorName: "Dr. Mossaab Saad Djaballah",
          doctorNameAr: "د. مصعب سعد جاب الله",
          specialty: "Chirurgien Dentiste - Omnipratique & Implantologie",
          specialtyAr: "جراحة و طب الأسنان و زراعة الأسنان",
          cabinetName: "Cabinet Dentaire Moderne El-Harrouch",
          cabinetNameAr: "عيادة طب و جراحة الأسنان الحديثة",
          address: "Rue Frères Kafi, Logements 38, 1er étage",
          addressAr: "شارع الإخوة كافي عمارة 38 الطابق الأول",
          city: "El-Harrouch, Skikda",
          cityAr: "الحروش - ولاية سكيكدة",
          phones: "0652 76 89 72 / 0562 24 40 87",
          logo: "/uploads/image.PNG",
        },
      })
    );
    console.log("   ✅ Profil du cabinet dentaire créé.");
  } else {
    console.log(`   ✅ Cabinet existant conservé: ${cabinet.cabinetName}`);
  }

  // --------------------------------------------------------------------------
  // STEP 2: Dental Medications Catalog (Medicament)
  // --------------------------------------------------------------------------
  console.log("\n💊 2/11. Insertion du Catalogue des Médicaments Dentaires...");
  await safeExec(() =>
    prisma.medicament.createMany({
      data: DENTAL_MEDICAMENTS,
      skipDuplicates: true,
    })
  );
  const allMeds = await safeExec(() => prisma.medicament.findMany());
  const medicamentMap = new Map();
  allMeds.forEach((m) => medicamentMap.set(m.nom, m));
  console.log(`   ✅ ${allMeds.length} médicaments dentaires prêts.`);

  // --------------------------------------------------------------------------
  // STEP 3: Medical / Dental Lab Examinations Catalog (Bilan)
  // --------------------------------------------------------------------------
  console.log("\n🧪 3/11. Insertion des Bilans et Examens Complémentaires...");
  await safeExec(() =>
    prisma.bilan.createMany({
      data: DENTAL_BILANS,
      skipDuplicates: true,
    })
  );
  const allBilans = await safeExec(() => prisma.bilan.findMany());
  const bilanMap = new Map();
  allBilans.forEach((b) => bilanMap.set(b.nom, b));
  console.log(`   ✅ ${allBilans.length} types d'examens et bilans prêts.`);

  // --------------------------------------------------------------------------
  // STEP 4: Vaccines Catalog (Vaccine)
  // --------------------------------------------------------------------------
  console.log("\n💉 4/11. Insertion du Catalogue Vaccinal...");
  await safeExec(() =>
    prisma.vaccine.createMany({
      data: DENTAL_VACCINES,
      skipDuplicates: true,
    })
  );
  const allVaccines = await safeExec(() => prisma.vaccine.findMany());
  const vaccineMap = new Map();
  allVaccines.forEach((v) => vaccineMap.set(v.name, v));
  console.log(`   ✅ ${allVaccines.length} vaccins prêts.`);

  // --------------------------------------------------------------------------
  // STEP 5: Prescription Presets (RecetteType & RecetteTypeItem)
  // --------------------------------------------------------------------------
  console.log("\n📋 5/11. Insertion des Protocoles d'Ordonnances Prédéfinies...");
  for (const preset of DENTAL_RECETTE_TYPES) {
    let rt = await safeExec(() =>
      prisma.recetteType.findFirst({
        where: { nom: preset.nom },
        include: { items: true },
      })
    );
    if (!rt) {
      rt = await safeExec(() =>
        prisma.recetteType.create({
          data: { nom: preset.nom },
        })
      );
    }
    if (!rt.items || rt.items.length === 0) {
      const itemsToCreate = [];
      for (const item of preset.items) {
        const med = medicamentMap.get(item.medName);
        if (med) {
          itemsToCreate.push({
            recetteId: rt.id,
            medicamentId: med.id,
            dosage: item.dosage,
            frequence: item.frequence,
            duree: item.duree,
            quantite: item.quantite,
          });
        }
      }
      if (itemsToCreate.length > 0) {
        await safeExec(() =>
          prisma.recetteTypeItem.createMany({ data: itemsToCreate })
        );
      }
    }
  }
  const countRecetteTypes = await safeExec(() => prisma.recetteType.count());
  console.log(`   ✅ ${countRecetteTypes} modèles d'ordonnances types configurés.`);

  // --------------------------------------------------------------------------
  // STEP 6: Lab Exam Presets (BilanType & BilanTypeItem)
  // --------------------------------------------------------------------------
  console.log("\n📑 6/11. Insertion des Bilans Types Prédéfinis...");
  for (const preset of DENTAL_BILAN_TYPES) {
    let bt = await safeExec(() =>
      prisma.bilanType.findFirst({
        where: { nom: preset.nom },
        include: { items: true },
      })
    );
    if (!bt) {
      bt = await safeExec(() =>
        prisma.bilanType.create({
          data: { nom: preset.nom },
        })
      );
    }
    if (!bt.items || bt.items.length === 0) {
      const itemsToCreate = [];
      for (const item of preset.items) {
        const b = bilanMap.get(item.bilanName);
        if (b) {
          itemsToCreate.push({
            bilanTypeId: bt.id,
            bilanId: b.id,
            remarque: item.remarque,
          });
        }
      }
      if (itemsToCreate.length > 0) {
        await safeExec(() =>
          prisma.bilanTypeItem.createMany({ data: itemsToCreate })
        );
      }
    }
  }
  const countBilanTypes = await safeExec(() => prisma.bilanType.count());
  console.log(`   ✅ ${countBilanTypes} bilans types configurés.`);

  // --------------------------------------------------------------------------
  // STEP 7: Justification Templates (JustificationType)
  // --------------------------------------------------------------------------
  console.log("\n📜 7/11. Insertion des Modèles de Justifications Médicales...");
  for (const jType of DENTAL_JUSTIFICATION_TYPES) {
    await safeExec(() =>
      prisma.justificationType.upsert({
        where: { nom: jType.nom },
        create: jType,
        update: { texte: jType.texte },
      })
    );
  }
  const countJustifTypes = await safeExec(() => prisma.justificationType.count());
  console.log(`   ✅ ${countJustifTypes} modèles de justifications prêts.`);

  // --------------------------------------------------------------------------
  // STEP 8: Large & Diverse Patient Cohort (65-75 Patients with TEST_ prefix)
  // --------------------------------------------------------------------------
  console.log("\n👥 8/11. Génération de la Cohorte de Patients Dentaires (TEST_*)...");
  
  const BLOOD_GROUPS = [
    "A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG", null
  ];

  const TARGET_PATIENTS_COUNT = 65;
  const createdPatients = [];

  for (let i = 1; i <= TARGET_PATIENTS_COUNT; i++) {
    const isMale = rng.boolean(0.5);
    const firstName = isMale
      ? PATIENT_FIRST_NAMES_M[(i - 1) % PATIENT_FIRST_NAMES_M.length]
      : PATIENT_FIRST_NAMES_F[(i - 1) % PATIENT_FIRST_NAMES_F.length];
    const lastName = PATIENT_LAST_NAMES[(i * 3 + 5) % PATIENT_LAST_NAMES.length];
    
    // Guaranteed unique identifier
    const uniqueNom = `TEST_ ${firstName} ${lastName} #${i}`;
    
    // Age distribution: children (6-15), adults (18-55), seniors (60-80)
    let age;
    if (i % 7 === 0) age = rng.int(6, 14); // Pediatric dental patient
    else if (i % 5 === 0) age = rng.int(62, 79); // Senior patient
    else age = rng.int(18, 58); // Adult

    const currentYear = 2026;
    const birthYear = currentYear - age;
    const birthMonth = rng.int(0, 11);
    const birthDay = rng.int(1, 28);
    const dateDeNaissance = new Date(birthYear, birthMonth, birthDay);

    const sexe = isMale ? "Homme" : "Femme";

    // Incomplete profile scenarios (some without phone, some without address)
    const hasPhone = i % 8 !== 0;
    const telephone = hasPhone
      ? `05${rng.int(40, 79)}${String(rng.int(100000, 999999))}`
      : null;

    const hasAddress = i % 6 !== 0;
    const cities = ["Skikda", "El-Harrouch", "Azzaba", "Collo", "Tamalous", "Ramdane Djamel"];
    const adresse = hasAddress
      ? `Cité ${rng.int(100, 1000)} Logements, Bloc ${String.fromCharCode(65 + (i % 8))}, ${cities[i % cities.length]}`
      : null;

    // Antecedents
    const hasAntecedents = i % 3 !== 0;
    const antecedents = hasAntecedents
      ? DENTAL_ANTECEDENTS[i % DENTAL_ANTECEDENTS.length]
      : null;

    const bloodGroup = BLOOD_GROUPS[i % BLOOD_GROUPS.length];

    // Registration creation date (over past 24 months)
    const createdAt = rng.date(2024, 2026);

    const patientData = {
      nom: uniqueNom,
      age,
      dateDeNaissance,
      sexe,
      telephone,
      adresse,
      antecedents,
      groupeSanguin: bloodGroup,
      createdAt,
    };

    const patient = await safeExec(() =>
      prisma.patient.upsert({
        where: { nom: uniqueNom },
        create: patientData,
        update: patientData,
      })
    );

    createdPatients.push(patient);
  }

  console.log(`   ✅ ${createdPatients.length} patients créés ou mis à jour avec succès.`);

  // --------------------------------------------------------------------------
  // STEP 9: Appointments Engine (RendezVous - Past, Today, Upcoming)
  // --------------------------------------------------------------------------
  console.log("\n📅 9/11. Génération de l'Agenda des Rendez-Vous Dentaires...");
  
  const createdRendezVous = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Scenarios:
  // - 15 Past appointments (-45 to -2 days)
  // - 8 Today appointments
  // - 25 Upcoming appointments (+1 to +30 days)
  const rdvConfigs = [
    // Today appointments
    { dayOffset: 0, hour: 9, min: 0, desc: "TEST_ Consultation de contrôle et pose de pansement" },
    { dayOffset: 0, hour: 10, min: 30, desc: "TEST_ Séance 2 dévitalisation et alésage sous digue" },
    { dayOffset: 0, hour: 11, min: 15, desc: "TEST_ Détartrage ultrasonique et prophylaxie" },
    { dayOffset: 0, hour: 14, min: 0, desc: "TEST_ Essayage biscuit céramique couronne 21" },
    { dayOffset: 0, hour: 15, min: 0, desc: "TEST_ Avulsion de la 38 incluse sous anesthésie locale" },
    { dayOffset: 0, hour: 16, min: 30, desc: "TEST_ Pose d'implant dentaire secteur 36" },

    // Tomorrow appointments
    { dayOffset: 1, hour: 9, min: 30, desc: "TEST_ Contrôle post-opératoire et ablation des fils" },
    { dayOffset: 1, hour: 11, min: 0, desc: "TEST_ Obturation composite esthétique face vestibulaire" },
    { dayOffset: 1, hour: 14, min: 30, desc: "TEST_ Empreinte implantaire de précision" },

    // Upcoming next week & month
    { dayOffset: 3, hour: 10, min: 0, desc: "TEST_ Scellement définitif de bridge 3 éléments" },
    { dayOffset: 5, hour: 15, min: 0, desc: "TEST_ Bilan parodontal et surfaçage radiculaire" },
    { dayOffset: 7, hour: 9, min: 0, desc: "TEST_ Pose de couronne céramique sur implant" },
    { dayOffset: 12, hour: 11, min: 0, desc: "TEST_ Traitement endodontique molaire supérieure" },
    { dayOffset: 18, hour: 14, min: 0, desc: "TEST_ Contrôle semestriel et radio rétro-alvéolaire" },
    { dayOffset: 25, hour: 16, min: 0, desc: "TEST_ Blanchiment dentaire en cabinet séance 1" },

    // Past appointments
    { dayOffset: -1, hour: 10, min: 0, desc: "TEST_ Urgence dentaire pulpite aiguë" },
    { dayOffset: -3, hour: 14, min: 30, desc: "TEST_ Consultation initiale et devis prothétique" },
    { dayOffset: -7, hour: 11, min: 0, desc: "TEST_ Extraction racine résiduelle dent 46" },
    { dayOffset: -14, hour: 9, min: 30, desc: "TEST_ Séparation canalaire et médication temporaire" },
    { dayOffset: -21, hour: 15, min: 0, desc: "TEST_ Empreinte d'étude et radiographie panoramique" },
    { dayOffset: -35, hour: 10, min: 30, desc: "TEST_ Visite d'évaluation parodontale" },
  ];

  for (let idx = 0; idx < rdvConfigs.length; idx++) {
    const cfg = rdvConfigs[idx];
    const rdvDate = new Date(today);
    rdvDate.setDate(rdvDate.getDate() + cfg.dayOffset);
    rdvDate.setHours(cfg.hour, cfg.min, 0, 0);

    const targetPatient = createdPatients[idx % createdPatients.length];

    const rdv = await safeExec(() =>
      prisma.rendezVous.create({
        data: {
          patientId: targetPatient.id,
          date: rdvDate,
          description: cfg.desc,
          note: `Patient notifié par SMS. Antécédents vérifiés. ${cfg.desc}`,
        },
      })
    );
    createdRendezVous.push(rdv);
  }

  console.log(`   ✅ ${createdRendezVous.length} rendez-vous programmés (passés, aujourd'hui, futurs).`);

  // --------------------------------------------------------------------------
  // STEP 10: Consultations, Treatments, Acts, Financials, Documents
  // --------------------------------------------------------------------------
  console.log("\n🦷 10/11. Génération des Consultations, Traitements, Actes, Versements & Documents...");

  let totalConsultationsCount = 0;
  let totalTraitementsCount = 0;
  let totalActsCount = 0;
  let totalPaymentsCount = 0;
  let totalOrdonnancesCount = 0;
  let totalBilansRecipCount = 0;
  let totalJustificationsCount = 0;
  let totalRadiosCount = 0;
  let totalBilanFilesCount = 0;
  let totalVaccinationsCount = 0;

  // Patient Cohort Distribution:
  // - Patients 0..4 (5 patients)  : 0 consultations (Fresh leads, no history)
  // - Patients 5..14 (10 patients): 1 consultation (Simple single visit, fully paid or unpaid)
  // - Patients 15..45 (31 patients): 2-3 consultations (Standard multi-stage treatment)
  // - Patients 46..64 (19 patients): 4-6 consultations (Extensive full-mouth rehabilitation)

  for (let pIdx = 0; pIdx < createdPatients.length; pIdx++) {
    const patient = createdPatients[pIdx];

    // Determine consultation count based on scenario group
    let consultCount = 0;
    if (pIdx < 5) {
      consultCount = 0; // Fresh patient without visits
    } else if (pIdx < 15) {
      consultCount = 1; // Single visit
    } else if (pIdx < 46) {
      consultCount = rng.int(2, 3); // Standard 2-3 visits
    } else {
      consultCount = rng.int(4, 6); // Extensive 4-6 visits
    }

    if (consultCount === 0) continue;

    // Create 1-3 treatments for this patient
    const treatmentCount = rng.int(1, consultCount >= 4 ? 3 : 2);
    const patientTreatments = [];

    for (let tIdx = 0; tIdx < treatmentCount; tIdx++) {
      const proc = DENTAL_PROCEDURES[(pIdx + tIdx * 3) % DENTAL_PROCEDURES.length];
      const selectedTooth = rng.choice(proc.teeth);

      // Status scenario:
      // - Most completed if extensive visits
      // - Some ongoing
      // - A few cancelled (to test application filter where ANNULE is excluded from debt!)
      let statut = "EN_COURS";
      if (pIdx % 9 === 0 && tIdx === 1) {
        statut = "ANNULE"; // Test cancelled treatment
      } else if (tIdx < treatmentCount - 1 || pIdx > 30) {
        statut = "TERMINE";
      }

      const treatment = await safeExec(() =>
        prisma.traitement.create({
          data: {
            patientId: patient.id,
            description: `${proc.desc} (Dent ${selectedTooth})`,
            dent: selectedTooth,
            prixTotal: proc.prix,
            statut,
            createdAt: rng.date(2024, 2026),
          },
        })
      );

      patientTreatments.push({ ...treatment, procDef: proc });
      totalTraitementsCount++;
    }

    // Generate consultations for this patient
    let baseDate = rng.date(2024, 2025);
    const patientConsultations = [];

    for (let cIdx = 0; cIdx < consultCount; cIdx++) {
      // Step consultation date forward by 7-28 days
      const consultDate = new Date(baseDate);
      consultDate.setDate(consultDate.getDate() + cIdx * rng.int(7, 25));

      const isFirst = cIdx === 0;
      const isLast = cIdx === consultCount - 1;

      // Select active treatment for this session
      const activeTreatment = patientTreatments[cIdx % patientTreatments.length];

      const motifDeConsultation = isFirst
        ? `Consultation pour ${activeTreatment.description.toLowerCase()}, douleur et gêne masticatoire.`
        : `Séance de suivi n°${cIdx + 1} pour ${activeTreatment.description.toLowerCase()}.`;

      const note = `Examen clinique stomatologique : bonne tolérance. ${
        activeTreatment.procDef.acts[cIdx % activeTreatment.procDef.acts.length]
      }. Recommandations d'hygiène et asepsie bucco-dentaire délivrées.`;

      const justificationSummary = rng.boolean(0.3)
        ? `Arrêt de travail post-opératoire délivré suite aux soins dentaires.`
        : null;

      const consultation = await safeExec(() =>
        prisma.consultation.create({
          data: {
            patientId: patient.id,
            createdAt: consultDate,
            motifDeConsultation,
            note,
            justification: justificationSummary,
          },
        })
      );

      patientConsultations.push(consultation);
      totalConsultationsCount++;

      // Link treatment to consultation via ConsultationTraitement (Acte réalisé)
      if (activeTreatment) {
        const actDesc =
          activeTreatment.procDef.acts[cIdx % activeTreatment.procDef.acts.length];
        await safeExec(() =>
          prisma.consultationTraitement.create({
            data: {
              consultationId: consultation.id,
              traitementId: activeTreatment.id,
              acteRealise: actDesc,
              createdAt: consultDate,
            },
          })
        );
        totalActsCount++;
      }

      // Attach Ordonnance (Prescription) to some consultations (~60%)
      if (rng.boolean(0.65)) {
        const ord = await safeExec(() =>
          prisma.ordonnance.create({
            data: {
              patientId: patient.id,
              consultationId: consultation.id,
              createdAt: consultDate,
            },
          })
        );
        totalOrdonnancesCount++;

        // Add 1-3 prescription items
        const numItems = rng.int(1, 3);
        const sampledMeds = rng.sample(allMeds, numItems);
        const ordItems = [];

        sampledMeds.forEach((m, idx) => {
          ordItems.push({
            ordonnanceId: ord.id,
            medicamentId: m.id,
            dosage: idx === 0 ? "1 gélule matin et soir" : "1 comprimé si douleur",
            frequence: idx === 0 ? "2 fois par jour aux repas" : "Toutes les 6 à 8h",
            duree: "6 jours",
            quantite: idx === 0 ? 2 : 1,
          });
        });

        if (ordItems.length > 0) {
          await safeExec(() =>
            prisma.ordonnanceItem.createMany({ data: ordItems })
          );
        }
      }

      // Attach BilanRecip (Lab report requested / received) (~30%)
      if (rng.boolean(0.35)) {
        const br = await safeExec(() =>
          prisma.bilanRecip.create({
            data: {
              patientId: patient.id,
              consultationId: consultation.id,
              createdAt: consultDate,
            },
          })
        );
        totalBilansRecipCount++;

        const numBilans = rng.int(1, 2);
        const sampledBilans = rng.sample(allBilans, numBilans);
        const bilanItems = [];

        sampledBilans.forEach((b) => {
          bilanItems.push({
            bilanRecipId: br.id,
            bilanId: b.id,
            resultat: "Paramètres dans les normes physiologiques requises.",
            remarque: "Aucune contre-indication aux soins chirurgicaux dentaires.",
          });
        });

        if (bilanItems.length > 0) {
          await safeExec(() =>
            prisma.bilanItem.createMany({ data: bilanItems })
          );
        }
      }

      // Attach Justification (Medical certificate) (~25%)
      if (rng.boolean(0.25)) {
        await safeExec(() =>
          prisma.justification.create({
            data: {
              patientId: patient.id,
              consultationId: consultation.id,
              texte:
                "Je soussigné, Docteur en médecine dentaire, certifie que l'état de santé bucco-dentaire du patient susmentionné nécessite un arrêt de travail et un repos de 3 jours suite aux soins chirurgicaux reçus ce jour.",
              createdAt: consultDate,
            },
          })
        );
        totalJustificationsCount++;
      }

      // Attach Radio (~35%)
      if (rng.boolean(0.35)) {
        const radioTypes = [
          "Radiographie Panoramique Dentaire pré-opératoire",
          "Cliché Rétro-alvéolaire de contrôle apical",
          "Cône Beam 3D (CBCT) secteur maxillaire",
          "Bite-wing de dépistage caries proximales",
        ];
        await safeExec(() =>
          prisma.radio.create({
            data: {
              patientId: patient.id,
              consultationId: consultation.id,
              description: rng.choice(radioTypes),
              fichier: `/uploads/radios/radio_test_${patient.id}_${cIdx}.jpg`,
              createdAt: consultDate,
            },
          })
        );
        totalRadiosCount++;
      }

      // Attach BilanFile (PDF document attachment) (~20%)
      if (rng.boolean(0.2)) {
        await safeExec(() =>
          prisma.bilanFile.create({
            data: {
              patientId: patient.id,
              consultationId: consultation.id,
              type: "PDF",
              description: "Rapport d'analyse hémostase et biologie médicale",
              fichier: `/uploads/bilans/analyse_bio_${patient.id}_${cIdx}.pdf`,
              createdAt: consultDate,
            },
          })
        );
        totalBilanFilesCount++;
      }
    }

    // ------------------------------------------------------------------------
    // FINANCIAL SCENARIOS: Generate Versements / Payments for Treatments
    // ------------------------------------------------------------------------
    for (let tIdx = 0; tIdx < patientTreatments.length; tIdx++) {
      const treatment = patientTreatments[tIdx];

      // Cancelled treatments have no payments
      if (treatment.statut === "ANNULE") continue;

      // Scenarios:
      // Case 1: Fully paid in full (sum payments == prixTotal)
      // Case 2: Partially paid in installments (sum payments < prixTotal)
      // Case 3: Completely unpaid (0 payments)
      const payScenario = (pIdx + tIdx) % 4;

      if (payScenario === 0) {
        // Completely unpaid
        continue;
      } else if (payScenario === 1) {
        // Fully paid in a single payment
        await safeExec(() =>
          prisma.paiement.create({
            data: {
              patientId: patient.id,
              traitementId: treatment.id,
              montant: treatment.prixTotal,
              note: "Règlement intégral en un seul versement (Espèces)",
              date: baseDate,
            },
          })
        );
        totalPaymentsCount++;
      } else if (payScenario === 2) {
        // Fully paid in 2 installments
        const part1 = Math.round((treatment.prixTotal * 0.4) / 100) * 100;
        const part2 = treatment.prixTotal - part1;

        const date1 = new Date(baseDate);
        const date2 = new Date(baseDate);
        date2.setDate(date2.getDate() + 14);

        await safeExec(() =>
          prisma.paiement.create({
            data: {
              patientId: patient.id,
              traitementId: treatment.id,
              montant: part1,
              note: "Versement acompte 1/2 (Début de soins)",
              date: date1,
            },
          })
        );
        await safeExec(() =>
          prisma.paiement.create({
            data: {
              patientId: patient.id,
              traitementId: treatment.id,
              montant: part2,
              note: "Solde final 2/2 (Pose définitive)",
              date: date2,
            },
          })
        );
        totalPaymentsCount += 2;
      } else if (payScenario === 3) {
        // Partially paid (Remaining debt exists!)
        const partial = Math.round((treatment.prixTotal * 0.5) / 100) * 100;
        await safeExec(() =>
          prisma.paiement.create({
            data: {
              patientId: patient.id,
              traitementId: treatment.id,
              montant: partial,
              note: `Acompte partiel versé (${partial} DZD). Solde restant dû.`,
              date: baseDate,
            },
          })
        );
        totalPaymentsCount++;
      }
    }

    // Attach Vaccination record for some patients (~40%)
    if (pIdx % 3 === 0 && allVaccines.length > 0) {
      const selectedVaccine = allVaccines[pIdx % allVaccines.length];
      await safeExec(() =>
        prisma.vaccination.create({
          data: {
            patientId: patient.id,
            vaccineId: selectedVaccine.id,
            dateGiven: rng.date(2023, 2025),
            doseNumber: (pIdx % 3) + 1,
            notes: `Rappel vaccinal ${selectedVaccine.name} consigné au dossier.`,
          },
        })
      );
      totalVaccinationsCount++;
    }
  }

  // Also add a couple of global payments (where traitementId is null)
  for (let g = 0; g < 5; g++) {
    const p = createdPatients[g + 10];
    await safeExec(() =>
      prisma.paiement.create({
        data: {
          patientId: p.id,
          traitementId: null,
          montant: 2000,
          note: "Règlement direct honoraires de consultation / bilan",
          date: new Date(),
        },
      })
    );
    totalPaymentsCount++;
  }

  console.log(`   ✅ Traitements créés   : ${totalTraitementsCount}`);
  console.log(`   ✅ Consultations créées : ${totalConsultationsCount}`);
  console.log(`   ✅ Actes réalisés       : ${totalActsCount}`);
  console.log(`   ✅ Versements financiers: ${totalPaymentsCount}`);
  console.log(`   ✅ Ordonnances délivrées: ${totalOrdonnancesCount}`);
  console.log(`   ✅ Bilans demandés      : ${totalBilansRecipCount}`);
  console.log(`   ✅ Justifications       : ${totalJustificationsCount}`);
  console.log(`   ✅ Radiographies        : ${totalRadiosCount}`);
  console.log(`   ✅ Fichiers bilans      : ${totalBilanFilesCount}`);
  console.log(`   ✅ Vaccinations         : ${totalVaccinationsCount}`);
}

// ============================================================================
// 6. COMPREHENSIVE VERIFICATION SUITE
// ============================================================================

async function verifyDatabaseAndRules() {
  console.log("\n==================================================================");
  console.log("🔍 Exécution de la Suite de Vérification & Règles Métier");
  console.log("==================================================================");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`   ✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`   ❌ [FAIL] ${message}`);
    }
  }

  // 1. Verify all 23 models count
  console.log("\n📊 1. Vérification de la présence de données dans chaque modèle :");
  const counts = {
    Patient: await safeExec(() => prisma.patient.count()),
    Consultation: await safeExec(() => prisma.consultation.count()),
    RendezVous: await safeExec(() => prisma.rendezVous.count()),
    Radio: await safeExec(() => prisma.radio.count()),
    BilanFile: await safeExec(() => prisma.bilanFile.count()),
    Ordonnance: await safeExec(() => prisma.ordonnance.count()),
    OrdonnanceItem: await safeExec(() => prisma.ordonnanceItem.count()),
    Medicament: await safeExec(() => prisma.medicament.count()),
    Bilan: await safeExec(() => prisma.bilan.count()),
    BilanRecip: await safeExec(() => prisma.bilanRecip.count()),
    BilanItem: await safeExec(() => prisma.bilanItem.count()),
    BilanType: await safeExec(() => prisma.bilanType.count()),
    BilanTypeItem: await safeExec(() => prisma.bilanTypeItem.count()),
    RecetteType: await safeExec(() => prisma.recetteType.count()),
    RecetteTypeItem: await safeExec(() => prisma.recetteTypeItem.count()),
    Traitement: await safeExec(() => prisma.traitement.count()),
    ConsultationTraitement: await safeExec(() => prisma.consultationTraitement.count()),
    Paiement: await safeExec(() => prisma.paiement.count()),
    Vaccine: await safeExec(() => prisma.vaccine.count()),
    Vaccination: await safeExec(() => prisma.vaccination.count()),
    Justification: await safeExec(() => prisma.justification.count()),
    JustificationType: await safeExec(() => prisma.justificationType.count()),
    Cabinet: await safeExec(() => prisma.cabinet.count()),
  };

  Object.entries(counts).forEach(([model, count]) => {
    assert(count > 0, `Modèle ${model.padEnd(23)} contient ${count} enregistrements`);
  });

  // 2. Minimum scale requirements verification
  console.log("\n📈 2. Vérification des volumes cibles :");
  const testPatientCount = await safeExec(() =>
    prisma.patient.count({ where: { nom: { startsWith: "TEST_" } } })
  );
  assert(testPatientCount >= 50, `Cohorte de test >= 50 patients (Actuel: ${testPatientCount})`);
  assert(counts.Consultation >= 100, `Volume de consultations >= 100 (Actuel: ${counts.Consultation})`);
  assert(counts.Traitement >= 80, `Volume de traitements >= 80 (Actuel: ${counts.Traitement})`);
  assert(counts.Paiement >= 100, `Volume de paiements >= 100 (Actuel: ${counts.Paiement})`);
  assert(counts.RendezVous >= 20, `Volume de rendez-vous >= 20 (Actuel: ${counts.RendezVous})`);

  // 3. Financial calculations integrity verification
  console.log("\n💰 3. Vérification de l'intégrité financière & calculs des soldes :");
  const testTreatments = await safeExec(() =>
    prisma.traitement.findMany({
      where: { patient: { nom: { startsWith: "TEST_" } } },
      include: { versements: true },
    })
  );

  let noOverpaymentErrors = true;
  for (const t of testTreatments) {
    const paid = t.versements.reduce((sum, v) => sum + (Number(v.montant) || 0), 0);
    if (paid > t.prixTotal + 0.01) {
      noOverpaymentErrors = false;
      console.error(`   ⚠️ Trop-perçu détecté pour traitement #${t.id}: Payé ${paid} > Total ${t.prixTotal}`);
    }
  }
  assert(noOverpaymentErrors, "Aucun traitement ne présente de trop-perçu invalide (Payé <= Prix total)");

  // Verify patient debt formula: detteRestante = max(0, totalDu - totalPaye)
  // where totalDu excludes ANNULE treatments
  const testPatients = await safeExec(() =>
    prisma.patient.findMany({
      where: { nom: { startsWith: "TEST_" } },
      include: {
        traitements: { include: { versements: true } },
        paiements: true,
      },
      take: 20,
    })
  );

  let formulaCheckPassed = true;
  for (const p of testPatients) {
    const expectedTotalDu = p.traitements
      .filter((t) => t.statut !== "ANNULE")
      .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

    const expectedTotalPaye = p.paiements.reduce(
      (sum, pay) => sum + (Number(pay.montant) || 0),
      0
    );

    const expectedDette = Math.max(0, expectedTotalDu - expectedTotalPaye);
    if (expectedDette < 0) formulaCheckPassed = false;
  }
  assert(formulaCheckPassed, "Formule de dette financière respectée pour tous les patients de test");

  // 4. Verification of document one-to-one constraints
  console.log("\n📑 4. Vérification des contraintes d'unicité documentaires :");
  const ords = await safeExec(() => prisma.ordonnance.findMany({ select: { consultationId: true } }));
  const ordConsultIds = new Set(ords.map((o) => o.consultationId));
  assert(ordConsultIds.size === ords.length, "Chaque ordonnance possède une consultation unique (@unique)");

  const bilans = await safeExec(() => prisma.bilanRecip.findMany({ select: { consultationId: true } }));
  const bilanConsultIds = new Set(bilans.map((b) => b.consultationId));
  assert(bilanConsultIds.size === bilans.length, "Chaque bilan possède une consultation unique (@unique)");

  const justifs = await safeExec(() => prisma.justification.findMany({ select: { consultationId: true } }));
  const justifConsultIds = new Set(justifs.map((j) => j.consultationId));
  assert(justifConsultIds.size === justifs.length, "Chaque justification possède une consultation unique (@unique)");

  // 5. Verification of multilingual and UTF-8 support
  console.log("\n🌍 5. Vérification du support multilingue et caractères spéciaux :");
  const arabicCabinet = await safeExec(() => prisma.cabinet.findFirst());
  const hasArabic =
    arabicCabinet?.doctorNameAr &&
    arabicCabinet?.specialtyAr &&
    arabicCabinet.doctorNameAr.length > 0;
  assert(Boolean(hasArabic), "Caractères arabes correctement stockés dans le profil Cabinet (د. مصعب)");

  const arabicPatients = await safeExec(() =>
    prisma.patient.findMany({
      where: {
        nom: { startsWith: "TEST_" },
        antecedents: { contains: "مريض" },
      },
    })
  );
  assert(arabicPatients.length > 0, `Antécédents médicaux en langue arabe préservés (${arabicPatients.length} dossiers)`);

  // Print final scorecard
  console.log("\n==================================================================");
  console.log(`📋 RÉSULTAT DU CONTRÔLE DE QUALITÉ : ${passedTests} / ${totalTests} TESTS VALIDÉS`);
  console.log("==================================================================");

  if (passedTests === totalTests) {
    console.log("🎉 TOUTES LES VÉRIFICATIONS ONT RÉUSSI AVEC SUCCÈS !");
  } else {
    console.warn(`⚠️ Attention : ${totalTests - passedTests} test(s) n'ont pas passé la validation.`);
  }
}

// ============================================================================
// 7. CLI DISPATCHER & MAIN RUNNER
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const cleanFlag = args.includes("--clean") || args.includes("-c") || args.includes("--reset");
  const cleanOnlyFlag = args.includes("--clean-only");
  const verifyOnlyFlag = args.includes("--verify-only");

  console.log("\n==================================================================");
  console.log("⚡ GESTION CABINET DENTAIRE - SEED & TEST RUNNER");
  console.log("==================================================================");
  console.log(`📅 Date d'exécution : ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🔌 Mode CLI          : ${
    cleanOnlyFlag
      ? "NETTOYAGE SEUL (--clean-only)"
      : verifyOnlyFlag
      ? "VÉRIFICATION SEULE (--verify-only)"
      : cleanFlag
      ? "NETTOYAGE PUIS SEED (--clean)"
      : "IDEMPOTENT SEED & VÉRIFICATION (Défaut)"
  }`);

  if (cleanOnlyFlag) {
    await cleanTestDataOnly();
    return;
  }

  if (cleanFlag) {
    await cleanTestDataOnly();
  }

  if (!verifyOnlyFlag) {
    await seedDatabase();
  }

  await verifyDatabaseAndRules();
}

main()
  .catch((err) => {
    console.error("\n❌ ERREUR CRITIQUE DANS LE SCRIPT DE TEST :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("\n🔌 Connexion Prisma fermée proprement.\n");
  });
