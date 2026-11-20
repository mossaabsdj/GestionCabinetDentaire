import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseDateBoundary(param, isEnd = false) {
  if (!param) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) {
    const [y, m, d] = param.split("-").map(Number);
    return isEnd
      ? new Date(y, m - 1, d, 23, 59, 59, 999)
      : new Date(y, m - 1, d, 0, 0, 0, 0);
  }
  const dateObj = new Date(param);
  if (isNaN(dateObj.getTime())) return null;
  if (isEnd) dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const dateFilter = {};
    const parsedStart = parseDateBoundary(startDateParam, false);
    const parsedEnd = parseDateBoundary(endDateParam, true);
    if (parsedStart) dateFilter.gte = parsedStart;
    if (parsedEnd) dateFilter.lte = parsedEnd;

    const paymentWhere = {};
    const treatmentWhere = {};
    const depensesWhere = {};

    if (Object.keys(dateFilter).length > 0) {
      paymentWhere.date = dateFilter;
      treatmentWhere.createdAt = dateFilter;
      depensesWhere.date = dateFilter;
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
        patient: { select: { id: true, nom: true, telephone: true } },
        traitement: { select: { id: true, description: true, dent: true } },
      },
    });

    // 3. Status counts & billed
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

    // 4. Period Expenses
    const periodDepenses = await prisma.depense.findMany({
      where: depensesWhere,
      orderBy: { date: "desc" },
    });

    const totalDepenses = periodDepenses.reduce(
      (sum, d) => sum + (Number(d.montant) || 0),
      0
    );

    // 5. Total payments received in the period
    const totalEncaisse = allPaiements.reduce(
      (sum, p) => sum + (Number(p.montant) || 0),
      0
    );

    // 6. Net Profit for the selected period
    const periodBenefice = totalEncaisse - totalDepenses;

    // 7. Global debtor calculation across all clinic treatments
    const globalTreatments = await prisma.traitement.findMany({
      where: { statut: { not: "ANNULE" } },
      include: {
        versements: true,
        patient: { select: { id: true, nom: true } },
      },
    });

    let globalTotalBilled = 0;
    let globalTotalPaid = 0;
    const patientBalances = {};

    for (const t of globalTreatments) {
      const billedT = Number(t.prixTotal) || 0;
      globalTotalBilled += billedT;
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
      patientBalances[pid].totalDu += billedT;
      const paid = (t.versements || []).reduce(
        (acc, v) => acc + (Number(v.montant) || 0),
        0
      );
      globalTotalPaid += paid;
      patientBalances[pid].totalPaye += paid;
      patientBalances[pid].reste = Math.max(
        0,
        patientBalances[pid].totalDu - patientBalances[pid].totalPaye
      );
    }

    const resteARecouvrer = Math.max(0, globalTotalBilled - globalTotalPaid);

    const patientsDebiteurs = Object.values(patientBalances)
      .filter((p) => p.reste > 0)
      .sort((a, b) => b.reste - a.reste)
      .slice(0, 6);

    // 8. Monthly revenue & expenses activity (last 6 calendar months globally)
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
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyMap[key] = { key, label, montant: 0, depenses: 0, benefice: 0, count: 0 };
    }

    const sixMonthsPaiements = await prisma.paiement.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, montant: true },
    });

    const sixMonthsDepenses = await prisma.depense.findMany({
      where: { date: { gte: sixMonthsAgo } },
      select: { date: true, montant: true },
    });

    for (const p of sixMonthsPaiements) {
      const pDate = new Date(p.date);
      const key = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].montant += Number(p.montant) || 0;
        monthlyMap[key].count += 1;
      }
    }

    for (const d of sixMonthsDepenses) {
      const dDate = new Date(d.date);
      const key = `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].depenses += Number(d.montant) || 0;
      }
    }

    for (const key of Object.keys(monthlyMap)) {
      monthlyMap[key].benefice = monthlyMap[key].montant - monthlyMap[key].depenses;
    }

    const activitePaiements = Object.values(monthlyMap);

    // 9. Top dental treatments breakdown
    const treatmentCategories = {};
    for (const t of allTraitements.length > 0 ? allTraitements : globalTreatments) {
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

    // 10. Recent payments
    const recentVersements = allPaiements.slice(0, 10).map((p) => ({
      id: p.id,
      montant: p.montant,
      date: p.date,
      note: p.note,
      patientNom: p.patient?.nom || "—",
      patientTelephone: p.patient?.telephone || null,
      traitementDesc: p.traitement?.description || "Versement libre",
      dent: p.traitement?.dent || null,
    }));

    // 11. Current calendar month fallback stats (backward compatibility)
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthPaiements = await prisma.paiement.findMany({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      orderBy: { date: "desc" },
      include: {
        patient: { select: { id: true, nom: true, telephone: true } },
        traitement: { select: { id: true, description: true, dent: true } },
      },
    });

    const currentMonthEncaisse = currentMonthPaiements.reduce(
      (sum, p) => sum + (Number(p.montant) || 0),
      0
    );

    const currentMonthDepenses = await prisma.depense.findMany({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth,
        },
      },
      orderBy: { date: "desc" },
    });

    const currentMonthTotalDepenses = currentMonthDepenses.reduce(
      (sum, d) => sum + (Number(d.montant) || 0),
      0
    );

    const currentMonthBenefice = currentMonthEncaisse - currentMonthTotalDepenses;

    // Detailed lists for the selected period
    const periodPaiementsList = allPaiements.map((p) => ({
      id: p.id,
      date: p.date,
      patientNom: p.patient?.nom || "—",
      patientId: p.patientId,
      patientTelephone: p.patient?.telephone || null,
      montant: Number(p.montant) || 0,
      traitementDesc: p.traitement?.description || "Versement libre",
      dent: p.traitement?.dent || null,
      note: p.note || null,
    }));

    const periodDepensesList = periodDepenses.map((d) => ({
      id: d.id,
      date: d.date,
      description: d.description,
      montant: Number(d.montant) || 0,
    }));

    return NextResponse.json({
      totalBilled: Object.keys(dateFilter).length > 0 ? totalBilled : globalTotalBilled,
      totalEncaisse,
      totalDepenses,
      periodBenefice,
      resteARecouvrer,
      countTraitements: allTraitements.length,
      countEnCours,
      countTermine,
      countAnnule,
      activitePaiements,
      topTraitements,
      patientsDebiteurs,
      recentVersements,
      // Dynamic period data
      periodPaiementsCount: allPaiements.length,
      periodDepensesCount: periodDepenses.length,
      periodPaiementsList,
      periodDepensesList,
      // Calendar month compatibility
      currentMonthEncaisse,
      currentMonthTotalDepenses,
      currentMonthBenefice,
      currentMonthPaiementsCount: currentMonthPaiements.length,
      currentMonthDepensesCount: currentMonthDepenses.length,
      currentMonthPaiementsList: periodPaiementsList,
      currentMonthDepensesList: periodDepensesList,
    });
  } catch (error) {
    console.error("GET /api/Stats/finance error:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques financières" },
      { status: 500 }
    );
  }
}

