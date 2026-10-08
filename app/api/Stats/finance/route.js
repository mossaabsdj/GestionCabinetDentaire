import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const dateFilter = {};
    if (startDateParam) dateFilter.gte = new Date(startDateParam);
    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const paymentWhere = {};
    const treatmentWhere = {};

    if (Object.keys(dateFilter).length > 0) {
      paymentWhere.date = dateFilter;
      treatmentWhere.createdAt = dateFilter;
    }

    // 1. All treatments (with their payments)
    const allTraitements = await prisma.traitement.findMany({
      where: treatmentWhere,
      include: {
        versements: true,
        patient: { select: { id: true, nom: true } },
      },
    });

    // 2. All payments in the period
    const allPaiements = await prisma.paiement.findMany({
      where: paymentWhere,
      orderBy: { date: "desc" },
      include: {
        patient: { select: { id: true, nom: true } },
        traitement: { select: { id: true, description: true, dent: true } },
      },
    });

    // 3. Status counts
    let countEnCours = 0;
    let countTermine = 0;
    let countAnnule = 0;
    let totalBilled = 0; // Total expected revenue (excluding cancelled)
    let totalPaidFromTreatments = 0;

    for (const t of allTraitements) {
      if (t.statut === "EN_COURS") countEnCours++;
      else if (t.statut === "TERMINE") countTermine++;
      else if (t.statut === "ANNULE") countAnnule++;

      if (t.statut !== "ANNULE") {
        totalBilled += Number(t.prixTotal) || 0;
      }

      const paidForT = (t.versements || []).reduce(
        (acc, v) => acc + (Number(v.montant) || 0),
        0
      );
      totalPaidFromTreatments += paidForT;
    }

    // 4. Total payments received in the period
    const totalEncaisse = allPaiements.reduce(
      (sum, p) => sum + (Number(p.montant) || 0),
      0
    );

    // 5. Total outstanding balance across all active treatments
    const resteARecouvrer = Math.max(0, totalBilled - totalPaidFromTreatments);

    // 6. Monthly revenue activity (last 6 months or based on data)
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];

    const monthlyMap = {};
    const now = new Date();
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = { key, label, montant: 0, count: 0 };
    }

    for (const p of allPaiements) {
      const pDate = new Date(p.date);
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      if (monthlyMap[key]) {
        monthlyMap[key].montant += Number(p.montant) || 0;
        monthlyMap[key].count += 1;
      }
    }

    const activitePaiements = Object.values(monthlyMap);

    // 7. Top dental treatments breakdown
    const treatmentCategories = {};
    for (const t of allTraitements) {
      if (t.statut === "ANNULE") continue;
      const desc = t.description?.trim() || "Autre soin";
      if (!treatmentCategories[desc]) {
        treatmentCategories[desc] = {
          description: desc,
          count: 0,
          revenuTotal: 0,
        };
      }
      treatmentCategories[desc].count += 1;
      treatmentCategories[desc].revenuTotal += Number(t.prixTotal) || 0;
    }

    const topTraitements = Object.values(treatmentCategories)
      .sort((a, b) => b.revenuTotal - a.revenuTotal)
      .slice(0, 6);

    // 8. Patients with highest outstanding balance
    const patientBalances = {};
    for (const t of allTraitements) {
      if (t.statut === "ANNULE") continue;
      const pid = t.patientId;
      if (!patientBalances[pid]) {
        patientBalances[pid] = {
          patientId: pid,
          nom: t.patient?.nom || `Patient #${pid}`,
          totalDu: 0,
          totalPaye: 0,
          reste: 0,
        };
      }
      patientBalances[pid].totalDu += Number(t.prixTotal) || 0;
      const paid = (t.versements || []).reduce(
        (acc, v) => acc + (Number(v.montant) || 0),
        0
      );
      patientBalances[pid].totalPaye += paid;
      patientBalances[pid].reste = Math.max(
        0,
        patientBalances[pid].totalDu - patientBalances[pid].totalPaye
      );
    }

    const patientsDebiteurs = Object.values(patientBalances)
      .filter((p) => p.reste > 0)
      .sort((a, b) => b.reste - a.reste)
      .slice(0, 5);

    // 9. Recent payments
    const recentVersements = allPaiements.slice(0, 8).map((p) => ({
      id: p.id,
      montant: p.montant,
      date: p.date,
      note: p.note,
      patientNom: p.patient?.nom || "—",
      traitementDesc: p.traitement?.description || "Versement libre",
      dent: p.traitement?.dent || null,
    }));

    return NextResponse.json({
      totalBilled,
      totalEncaisse,
      resteARecouvrer,
      countTraitements: allTraitements.length,
      countEnCours,
      countTermine,
      countAnnule,
      activitePaiements,
      topTraitements,
      patientsDebiteurs,
      recentVersements,
    });
  } catch (error) {
    console.error("GET /api/Stats/finance error:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques financières" },
      { status: 500 }
    );
  }
}

