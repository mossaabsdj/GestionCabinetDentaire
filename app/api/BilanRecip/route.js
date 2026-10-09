import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ✅ GET — Fetch all or by patientId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");

    const where = patientId ? { patientId: Number(patientId) } : {};

    const bilanRecips = await prisma.bilanRecip.findMany({
      where,
      include: {
        patient: true,
        consultation: true,
        items: {
          include: {
            bilan: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bilanRecips);
  } catch (error) {
    console.error("❌ Error fetching bilanRecip:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des bilans reçus." },
      { status: 500 },
    );
  }
}

// ✅ POST — Create a new BilanRecip with nested items
export async function POST(request) {
  try {
    const data = await request.json();
    const { patientId, consultationId, items } = data;

    if (!patientId || !consultationId) {
      return NextResponse.json(
        { error: "patientId et consultationId sont requis." },
        { status: 400 },
      );
    }

    const newBilanRecip = await prisma.bilanRecip.create({
      data: {
        patientId,
        consultationId,
        items: {
          create:
            items.map((it) => ({
              bilanId: it.bilanId,
              resultat: it.resultat || null,
              remarque: it.remarque || null,
            })) || [],
        },
      },
      include: {
        items: {
          include: {
            bilan: true,
          },
        },
      },
    });

    return NextResponse.json(newBilanRecip, { status: 201 });
  } catch (error) {
    console.error("❌ Error creating bilanRecip:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du bilan reçu." },
      { status: 500 },
    );
  }
}
// ✅ DELETE — Remove a BilanRecip and its related items
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "L'ID du bilan est requis pour la suppression." },
        { status: 400 },
      );
    }

    // First delete related items
    await prisma.bilanItem.deleteMany({
      where: { bilanRecipId: Number(id) },
    });

    // Then delete the bilanRecip itself
    await prisma.bilanRecip.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Bilan reçu supprimé avec succès." });
  } catch (error) {
    console.error("❌ Error deleting BilanRecip:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du bilan reçu." },
      { status: 500 },
    );
  }
}
// ✅ PUT — Update an existing BilanRecip and its items

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, items } = data;

    if (!id) {
      return NextResponse.json(
        { error: "L'ID du bilan est requis pour la mise à jour." },
        { status: 400 },
      );
    }

    // 🧹 Delete old items before recreating them
    await prisma.bilanItem.deleteMany({
      where: { bilanRecipId: Number(id) },
    });

    // 🧩 Update only the items list
    const updatedBilanRecip = await prisma.bilanRecip.update({
      where: { id: Number(id) },
      data: {
        items: {
          create:
            items.map((it) => ({
              bilanId: Number(it.bilanId || it.id),
              resultat: it.resultat || null,
              remarque: it.remarque || null,
            })) || [],
        },
      },
      include: {
        items: {
          include: {
            bilan: true,
          },
        },
      },
    });

    return NextResponse.json(updatedBilanRecip, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating BilanRecip:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du bilan reçu." },
      { status: 500 },
    );
  }
}
