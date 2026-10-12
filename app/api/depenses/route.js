import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Helper to compute date range based on period key
 */
function getDateRangeForPeriod(period, startDateParam, endDateParam) {
  const now = new Date();

  if (startDateParam || endDateParam) {
    const range = {};
    if (startDateParam) {
      const s = new Date(startDateParam);
      s.setHours(0, 0, 0, 0);
      range.gte = s;
    }
    if (endDateParam) {
      const e = new Date(endDateParam);
      e.setHours(23, 59, 59, 999);
      range.lte = e;
    }
    return range;
  }

  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "prev_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (period === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  // "all" or undefined: no filter
  return null;
}

// ==========================================
// GET /api/depenses
// ==========================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "month";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const q = searchParams.get("q")?.trim() || "";

    const where = {};

    const dateRange = getDateRangeForPeriod(period, startDateParam, endDateParam);
    if (dateRange) {
      where.date = dateRange;
    }

    if (q) {
      where.description = {
        contains: q,
        mode: "insensitive",
      };
    }

    const depenses = await prisma.depense.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const totalMontant = depenses.reduce(
      (sum, d) => sum + (Number(d.montant) || 0),
      0
    );

    return NextResponse.json({
      depenses,
      totalMontant,
      count: depenses.length,
    });
  } catch (error) {
    console.error("GET /api/depenses error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des dépenses: " + error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// POST /api/depenses
// ==========================================
export async function POST(req) {
  try {
    const body = await req.json();
    const montantNum = parseFloat(body.montant);
    const description = body.description?.trim();

    if (isNaN(montantNum) || montantNum <= 0) {
      return NextResponse.json(
        { error: "Le montant de la dépense doit être un nombre supérieur à 0." },
        { status: 400 }
      );
    }

    if (!description || description.length === 0) {
      return NextResponse.json(
        { error: "La description de la dépense est obligatoire." },
        { status: 400 }
      );
    }

    let expenseDate = new Date();
    if (body.date) {
      const parsedDate = new Date(body.date);
      if (!isNaN(parsedDate.getTime())) {
        expenseDate = parsedDate;
      }
    }

    const newDepense = await prisma.depense.create({
      data: {
        montant: montantNum,
        description,
        date: expenseDate,
      },
    });

    return NextResponse.json(newDepense, { status: 201 });
  } catch (error) {
    console.error("POST /api/depenses error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la dépense: " + error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT /api/depenses
// ==========================================
export async function PUT(req) {
  try {
    const body = await req.json();
    const id = parseInt(body.id);
    const montantNum = parseFloat(body.montant);
    const description = body.description?.trim();

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: "Identifiant de la dépense manquant ou invalide." },
        { status: 400 }
      );
    }

    if (isNaN(montantNum) || montantNum <= 0) {
      return NextResponse.json(
        { error: "Le montant de la dépense doit être un nombre supérieur à 0." },
        { status: 400 }
      );
    }

    if (!description || description.length === 0) {
      return NextResponse.json(
        { error: "La description de la dépense est obligatoire." },
        { status: 400 }
      );
    }

    const updateData = {
      montant: montantNum,
      description,
    };

    if (body.date) {
      const parsedDate = new Date(body.date);
      if (!isNaN(parsedDate.getTime())) {
        updateData.date = parsedDate;
      }
    }

    const updated = await prisma.depense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/depenses error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de la dépense: " + error.message },
      { status: 500 }
    );
  }
}

// ==========================================
// DELETE /api/depenses
// ==========================================
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body?.id;
    }

    const idNum = parseInt(id);
    if (!idNum || isNaN(idNum)) {
      return NextResponse.json(
        { error: "Identifiant de la dépense requis pour la suppression." },
        { status: 400 }
      );
    }

    await prisma.depense.delete({
      where: { id: idNum },
    });

    return NextResponse.json({
      success: true,
      message: "Dépense supprimée avec succès.",
    });
  } catch (error) {
    console.error("DELETE /api/depenses error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la dépense: " + error.message },
      { status: 500 }
    );
  }
}

