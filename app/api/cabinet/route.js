import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_CABINET_DATA = {
  title: "Docteur",
  doctorName: "Docteur",
  doctorNameAr: "دكتور",
  specialty: "Chirurgien Dentiste",
  specialtyAr: "جراحة و طب الأسنان",
  cabinetName: "Cabinet Dentaire",
  cabinetNameAr: "عيادة طب الأسنان",
  address: "Rue Frères KAFI logts 38, 1er étage",
  addressAr: "شارع الإخوة كافي عقار 38 الطابق الأول",
  city: "El-Harrouch SKIKDA",
  cityAr: "(بزاز لعلاوي) الحروش - سكيكدة",
  phones: "0652 76 89 72 / 0562 24 40 87",
  logo: "/uploads/image.PNG",
};

// =========================
// GET: Fetch cabinet settings
// =========================
export async function GET() {
  try {
    let cabinet = await prisma.cabinet.findFirst();

    if (!cabinet) {
      // Auto-seed default cabinet row if not found
      cabinet = await prisma.cabinet.create({
        data: DEFAULT_CABINET_DATA,
      });
    }

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("GET /api/cabinet error:", error);
    // Fallback to default in case of DB read error
    return NextResponse.json(DEFAULT_CABINET_DATA, { status: 200 });
  }
}

// =========================
// PUT / POST: Update cabinet settings
// =========================
export async function PUT(req) {
  try {
    const body = await req.json();

    const existing = await prisma.cabinet.findFirst();

    const dataToSave = {
      title:
        body.title !== undefined
          ? (typeof body.title === "string" ? body.title.trim() : body.title)
          : (existing?.title ?? DEFAULT_CABINET_DATA.title),
      doctorName:
        body.doctorName !== undefined
          ? (typeof body.doctorName === "string" ? body.doctorName.trim() : body.doctorName)
          : (existing?.doctorName ?? DEFAULT_CABINET_DATA.doctorName),
      doctorNameAr:
        body.doctorNameAr !== undefined
          ? (typeof body.doctorNameAr === "string" ? body.doctorNameAr.trim() : body.doctorNameAr)
          : (existing?.doctorNameAr ?? DEFAULT_CABINET_DATA.doctorNameAr),
      specialty:
        body.specialty !== undefined
          ? (typeof body.specialty === "string" ? body.specialty.trim() : body.specialty)
          : (existing?.specialty ?? DEFAULT_CABINET_DATA.specialty),
      specialtyAr:
        body.specialtyAr !== undefined
          ? (typeof body.specialtyAr === "string" ? body.specialtyAr.trim() : body.specialtyAr)
          : (existing?.specialtyAr ?? DEFAULT_CABINET_DATA.specialtyAr),
      cabinetName:
        body.cabinetName !== undefined
          ? (typeof body.cabinetName === "string" ? body.cabinetName.trim() : body.cabinetName)
          : (existing?.cabinetName ?? DEFAULT_CABINET_DATA.cabinetName),
      cabinetNameAr:
        body.cabinetNameAr !== undefined
          ? (typeof body.cabinetNameAr === "string" ? body.cabinetNameAr.trim() : body.cabinetNameAr)
          : (existing?.cabinetNameAr ?? DEFAULT_CABINET_DATA.cabinetNameAr),
      address:
        body.address !== undefined
          ? (typeof body.address === "string" ? body.address.trim() : body.address)
          : (existing?.address ?? DEFAULT_CABINET_DATA.address),
      addressAr:
        body.addressAr !== undefined
          ? (typeof body.addressAr === "string" ? body.addressAr.trim() : body.addressAr)
          : (existing?.addressAr ?? DEFAULT_CABINET_DATA.addressAr),
      city:
        body.city !== undefined
          ? (typeof body.city === "string" ? body.city.trim() : body.city)
          : (existing?.city ?? DEFAULT_CABINET_DATA.city),
      cityAr:
        body.cityAr !== undefined
          ? (typeof body.cityAr === "string" ? body.cityAr.trim() : body.cityAr)
          : (existing?.cityAr ?? DEFAULT_CABINET_DATA.cityAr),
      phones:
        body.phones !== undefined
          ? (typeof body.phones === "string" ? body.phones.trim() : body.phones)
          : (existing?.phones ?? DEFAULT_CABINET_DATA.phones),
      logo:
        body.logo !== undefined
          ? (typeof body.logo === "string" ? body.logo.trim() : body.logo) || DEFAULT_CABINET_DATA.logo
          : (existing?.logo ?? DEFAULT_CABINET_DATA.logo),
    };

    let updated;
    if (existing) {
      updated = await prisma.cabinet.update({
        where: { id: existing.id },
        data: dataToSave,
      });
    } else {
      updated = await prisma.cabinet.create({
        data: dataToSave,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/cabinet error:", error);
    return NextResponse.json(
      { error: "Échec de la mise à jour des paramètres du cabinet." },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  return PUT(req);
}
