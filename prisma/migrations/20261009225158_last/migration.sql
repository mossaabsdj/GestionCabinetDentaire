/*
  Warnings:

  - You are about to drop the column `frequenceCardiaque` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `frequenceRespiratoire` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `glycemie` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `poids` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `saturationOxygene` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `taille` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `temperature` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `tensionDiastolique` on the `Consultation` table. All the data in the column will be lost.
  - You are about to drop the column `tensionSystolique` on the `Consultation` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."StatutTraitement" AS ENUM ('EN_COURS', 'TERMINE', 'ANNULE');

-- AlterTable
ALTER TABLE "public"."Consultation" DROP COLUMN "frequenceCardiaque",
DROP COLUMN "frequenceRespiratoire",
DROP COLUMN "glycemie",
DROP COLUMN "poids",
DROP COLUMN "saturationOxygene",
DROP COLUMN "taille",
DROP COLUMN "temperature",
DROP COLUMN "tensionDiastolique",
DROP COLUMN "tensionSystolique";

-- AlterTable
ALTER TABLE "public"."Paiement" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "traitementId" INTEGER;

-- AlterTable
ALTER TABLE "public"."RendezVous" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "patientId" INTEGER,
ADD COLUMN     "traitementId" INTEGER;

-- CreateTable
CREATE TABLE "public"."Traitement" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "dent" TEXT,
    "prixTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" "public"."StatutTraitement" NOT NULL DEFAULT 'EN_COURS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Traitement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsultationTraitement" (
    "id" SERIAL NOT NULL,
    "consultationId" INTEGER NOT NULL,
    "traitementId" INTEGER NOT NULL,
    "acteRealise" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationTraitement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RendezVous" ADD CONSTRAINT "RendezVous_traitementId_fkey" FOREIGN KEY ("traitementId") REFERENCES "public"."Traitement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Traitement" ADD CONSTRAINT "Traitement_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "public"."Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationTraitement" ADD CONSTRAINT "ConsultationTraitement_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "public"."Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsultationTraitement" ADD CONSTRAINT "ConsultationTraitement_traitementId_fkey" FOREIGN KEY ("traitementId") REFERENCES "public"."Traitement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Paiement" ADD CONSTRAINT "Paiement_traitementId_fkey" FOREIGN KEY ("traitementId") REFERENCES "public"."Traitement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
