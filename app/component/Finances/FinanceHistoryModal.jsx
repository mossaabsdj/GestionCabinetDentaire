"use client";

import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Printer,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  Sparkles,
  Clock,
  FileText,
  User,
} from "lucide-react";

export default function FinanceHistoryModal({
  patientId,
  selectedPatient,
  patient,
  open,
  setopen,
  fetchPatientById,
}) {
  const currentPatient = selectedPatient || patient;
  const currentPatientId = patientId || currentPatient?.id;

  const [versements, setVersements] = useState([]);
  const [traitements, setTraitements] = useState([]);
  const [currentVersementIndex, setCurrentVersementIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [printReceiptModal, setPrintReceiptModal] = useState(false);

  const printAreaRef = useRef(null);

  // Fetch financial data (versements + treatments)
  const fetchFinancialHistory = async () => {
    if (!currentPatientId) return;
    setLoading(true);
    try {
      const [resVer, resTr] = await Promise.all([
        fetch(`/api/versements?patientId=${currentPatientId}`),
        fetch(`/api/traitements?patientId=${currentPatientId}`),
      ]);

      let verData = [];
      if (resVer.ok) {
        verData = await resVer.json();
      }

      let trData = [];
      if (resTr.ok) {
        trData = await resTr.json();
      }

      setTraitements(trData);

      const sortedVersements = Array.isArray(verData)
        ? verData.sort(
            (a, b) =>
              new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
          )
        : [];

      setVersements(sortedVersements);
      setCurrentVersementIndex(0);
    } catch (err) {
      console.error("❌ Erreur lors du chargement de l'historique financier:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && currentPatientId) {
      fetchFinancialHistory();
    }
  }, [open, currentPatientId]);

  const selectedVersement =
    versements.length > 0 && currentVersementIndex < versements.length
      ? versements[currentVersementIndex]
      : null;

  // Pagination Handlers
  const handlePrevVersement = () => {
    if (currentVersementIndex > 0) {
      setCurrentVersementIndex((prev) => prev - 1);
    }
  };

  const handleNextVersement = () => {
    if (currentVersementIndex < versements.length - 1) {
      setCurrentVersementIndex((prev) => prev + 1);
    }
  };

  // Delete Versement
  const handleDeleteVersement = async (id) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/versements?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Impossible de supprimer ce versement");
      }

      Swal.fire({
        icon: "success",
        title: "Supprimé !",
        text: "Le versement a été supprimé avec succès.",
        confirmButtonColor: "#10b981",
        timer: 1800,
      });

      // Refresh data
      await fetchFinancialHistory();
      if (fetchPatientById && currentPatientId) {
        await fetchPatientById(currentPatientId);
      }
    } catch (err) {
      console.error("❌ Erreur suppression versement:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Erreur lors de la suppression.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  // Trigger Print Receipt
  const handlePrint = () => {
    const printContent = document.getElementById("receipt-print-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=600,height=700");
    printWindow.document.write(`
      <html>
        <head>
          <title>Reçu de Versement - ${currentPatient?.nom || "Patient"}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
            .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 16px; margin-bottom: 16px; }
            .cabinet { font-size: 20px; font-weight: bold; color: #0284c7; }
            .title { font-size: 16px; font-weight: 600; margin-top: 4px; text-transform: uppercase; }
            .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
            .info-label { color: #64748b; font-weight: 500; }
            .info-value { font-weight: 600; color: #0f172a; }
            .amount-box { margin: 20px 0; padding: 16px; background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 8px; text-align: center; }
            .amount-val { font-size: 24px; font-weight: bold; color: #166534; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Calculations for global totals
  const totalFacture = traitements
    .filter((t) => t.statut !== "ANNULE")
    .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

  const totalRegle = versements.reduce(
    (sum, v) => sum + (Number(v.montant) || 0),
    0
  );

  const dette = Math.max(0, totalFacture - totalRegle);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          setopen(val);
        }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl max-h-[92vh] bg-gradient-to-br from-[var(--color-50)] to-white rounded-2xl p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar shadow-2xl">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-[var(--color-600)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Chargement de l'historique financier...</p>
            </div>
          ) : versements.length === 0 ? (
            <div className="py-12 text-center">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[var(--color-700)] flex items-center justify-center gap-2">
                  <CreditCard className="w-6 h-6" />
                  Historique Financier du Patient
                </DialogTitle>
                <DialogDescription className="text-center text-gray-500 mt-2">
                  {currentPatient?.nom} — Aucun versement enregistré pour le moment.
                </DialogDescription>
              </DialogHeader>

              {/* Global Financial Banner even when no versements */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl mx-auto text-left">
                <Card className="p-4 bg-white border border-blue-100 rounded-xl shadow-xs">
                  <p className="text-xs font-semibold text-blue-600 uppercase">Total des soins</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {totalFacture.toLocaleString("fr-FR")} DZD
                  </p>
                </Card>
                <Card className="p-4 bg-white border border-emerald-100 rounded-xl shadow-xs">
                  <p className="text-xs font-semibold text-emerald-600 uppercase">Total réglé</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">0 DZD</p>
                </Card>
                <Card className="p-4 bg-white border border-amber-100 rounded-xl shadow-xs">
                  <p className="text-xs font-semibold text-amber-600 uppercase">Solde restant</p>
                  <p className="text-xl font-bold text-amber-800 mt-1">
                    {dette.toLocaleString("fr-FR")} DZD
                  </p>
                </Card>
              </div>

              <div className="mt-8 flex justify-center">
                <Button
                  onClick={() => setopen(false)}
                  className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl px-6"
                >
                  Fermer
                </Button>
              </div>
            </div>
          ) : (
            selectedVersement && (
              <>
                <DialogHeader>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {/* Title and Navigation Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pr-8 sm:pr-10">
                      <DialogTitle className="text-xl sm:text-2xl font-bold text-[var(--color-700)] flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-[var(--color-600)]" />
                        Versement #{selectedVersement.id}
                      </DialogTitle>

                      {/* Center: Pagination Navigation */}
                      {versements.length > 1 && (
                        <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md border border-gray-100">
                          <button
                            onClick={handlePrevVersement}
                            disabled={currentVersementIndex === 0}
                            className={`p-2 sm:p-2.5 rounded-lg transition-all font-semibold ${
                              currentVersementIndex === 0
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-[var(--color-500)] text-white hover:bg-[var(--color-600)] shadow-md hover:shadow-lg"
                            }`}
                            title="Versement précédent"
                          >
                            <ChevronLeft size={18} />
                          </button>

                          <span className="text-xs sm:text-sm font-semibold text-gray-700 min-w-[95px] sm:min-w-[110px] text-center">
                            Versement {currentVersementIndex + 1} / {versements.length}
                          </span>

                          <button
                            onClick={handleNextVersement}
                            disabled={currentVersementIndex === versements.length - 1}
                            className={`p-2 sm:p-2.5 rounded-lg transition-all font-semibold ${
                              currentVersementIndex === versements.length - 1
                                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                : "bg-[var(--color-500)] text-white hover:bg-[var(--color-600)] shadow-md hover:shadow-lg"
                            }`}
                            title="Versement suivant"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}

                      {/* Right: Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setPrintReceiptModal(true)}
                          className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 text-xs sm:text-sm"
                          title="Imprimer un reçu pour ce versement"
                        >
                          <Printer size={16} /> Reçu
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(true)}
                          className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 text-xs sm:text-sm"
                          title="Supprimer ce versement"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Date/Time and Amount Badges Row */}
                    <div className="flex flex-wrap justify-end items-center gap-2 sm:gap-3">
                      {/* Amount badge */}
                      <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 sm:px-5 py-2 border-2 border-emerald-200 shadow-sm text-xs sm:text-sm">
                        <ArrowDownRight className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">
                          Montant
                        </span>
                        <span className="font-bold text-emerald-900 text-sm sm:text-base">
                          +{Number(selectedVersement.montant).toLocaleString("fr-FR")} DZD
                        </span>
                      </div>

                      {/* Date badge */}
                      <div className="inline-flex items-center gap-2 sm:gap-3 rounded-xl bg-white px-3.5 sm:px-5 py-2 sm:py-2.5 border-2 border-[var(--color-100)] shadow-md text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-600)]" />
                        <span className="text-xs uppercase tracking-wider text-[var(--color-600)] font-semibold">
                          Date du versement
                        </span>
                        <span className="font-bold text-[var(--color-900)] text-sm sm:text-base">
                          {selectedVersement.date
                            ? new Date(selectedVersement.date).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : selectedVersement.createdAt
                            ? new Date(selectedVersement.createdAt).toLocaleDateString("fr-FR")
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                {/* 📊 GLOBAL FINANCIAL BANNER */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Total des soins
                      </p>
                      <p className="text-lg font-bold text-slate-900 mt-0.5">
                        {totalFacture.toLocaleString("fr-FR")} DZD
                      </p>
                    </div>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                      <Receipt size={18} />
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-emerald-200 rounded-xl shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
                        Total réglé ({versements.length})
                      </p>
                      <p className="text-lg font-bold text-emerald-900 mt-0.5">
                        {totalRegle.toLocaleString("fr-FR")} DZD
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>

                  <div className="p-3.5 bg-white border border-amber-200 rounded-xl shadow-2xs flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                        Solde restant
                      </p>
                      <p
                        className={`text-lg font-bold mt-0.5 ${
                          dette > 0 ? "text-amber-800" : "text-emerald-800"
                        }`}
                      >
                        {dette.toLocaleString("fr-FR")} DZD
                      </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                      <DollarSign size={18} />
                    </div>
                  </div>
                </div>

                {/* 💳 DETAILS OF CURRENT VERSEMENT */}
                <div className="mt-5 space-y-4">
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <Sparkles size={18} className="text-[var(--color-600)]" />
                      Détails du versement sélectionné
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Montant */}
                      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                        <span className="text-xs font-semibold text-emerald-800 block mb-1">
                          Montant encaissé
                        </span>
                        <span className="text-xl font-extrabold text-emerald-950">
                          {Number(selectedVersement.montant).toLocaleString("fr-FR")} DZD
                        </span>
                      </div>

                      {/* Traitement lié */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-xs font-semibold text-slate-600 block mb-1">
                          Traitement associé
                        </span>
                        {selectedVersement.traitement ? (
                          <div>
                            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              {selectedVersement.traitement.dent && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[var(--color-100)] text-[var(--color-700)]">
                                  Dent {selectedVersement.traitement.dent}
                                </span>
                              )}
                              {selectedVersement.traitement.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Prix du soin :{" "}
                              {(selectedVersement.traitement.prixTotal || 0).toLocaleString("fr-FR")} DZD
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500 italic">
                            Versement libre / Aucun soin spécifique
                          </span>
                        )}
                      </div>

                      {/* Note / Mode */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-xs font-semibold text-slate-600 block mb-1">
                          Note / Référence
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {selectedVersement.note || "Aucune note renseignée"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 📑 HISTORIQUE COMPLET DES VERSEMENTS */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                      <CreditCard size={18} className="text-[var(--color-600)]" />
                      Tous les versements ({versements.length})
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Réf</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Montant</th>
                            <th className="py-2.5 px-3">Soin lié</th>
                            <th className="py-2.5 px-3">Note</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {versements.map((v, idx) => {
                            const isSelected = idx === currentVersementIndex;
                            return (
                              <tr
                                key={v.id}
                                onClick={() => setCurrentVersementIndex(idx)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-[var(--color-50)]/70 font-semibold"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="py-2.5 px-3 text-slate-700">
                                  #{v.id}
                                </td>
                                <td className="py-2.5 px-3 text-slate-900 whitespace-nowrap">
                                  {v.date
                                    ? new Date(v.date).toLocaleDateString("fr-FR")
                                    : "—"}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-emerald-700 whitespace-nowrap">
                                  +{Number(v.montant).toLocaleString("fr-FR")} DZD
                                </td>
                                <td className="py-2.5 px-3 text-slate-800 truncate max-w-[200px]">
                                  {v.traitement ? (
                                    <span>
                                      {v.traitement.dent && `[D${v.traitement.dent}] `}
                                      {v.traitement.description}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Général</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]">
                                  {v.note || "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentVersementIndex(idx);
                                      setDeleteConfirm(true);
                                    }}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                    title="Supprimer ce versement"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setopen(false)}
                    variant="outline"
                    className="rounded-xl px-5"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* 🗑️ DELETE CONFIRM DIALOG */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 size={22} />
              Supprimer le versement #{selectedVersement?.id} ?
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              Montant :{" "}
              <strong>
                {Number(selectedVersement?.montant || 0).toLocaleString("fr-FR")} DZD
              </strong>
              .<br />
              Cette action mettra à jour le solde restant et le crédit du patient.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3 mt-5">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-5 py-2 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-semibold text-gray-700 text-sm shadow-sm"
            >
              Annuler
            </button>
            <button
              onClick={() => handleDeleteVersement(selectedVersement?.id)}
              disabled={isDeleting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {isDeleting ? "Suppression..." : "Confirmer la suppression"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🖨️ PRINT RECEIPT MODAL */}
      <Dialog open={printReceiptModal} onOpenChange={setPrintReceiptModal}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Printer size={18} className="text-emerald-600" />
              Reçu de versement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Aperçu avant impression pour le patient {currentPatient?.nom}.
            </DialogDescription>
          </DialogHeader>

          {selectedVersement && (
            <div id="receipt-print-area" className="mt-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <div className="header text-center pb-3 border-b border-dashed border-slate-300">
                <h4 className="cabinet text-lg font-bold text-[var(--color-700)]">
                  CABINET DENTAIRE
                </h4>
                <p className="text-xs text-slate-500">REÇU DE PAIEMENT N° {selectedVersement.id}</p>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Patient :</span>
                  <span className="font-bold text-slate-800">{currentPatient?.nom}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date :</span>
                  <span className="font-semibold text-slate-800">
                    {selectedVersement.date
                      ? new Date(selectedVersement.date).toLocaleDateString("fr-FR")
                      : "—"}
                  </span>
                </div>
                {selectedVersement.traitement && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Acte / Soin :</span>
                    <span className="font-semibold text-slate-800">
                      {selectedVersement.traitement.description}
                      {selectedVersement.traitement.dent ? ` (Dent ${selectedVersement.traitement.dent})` : ""}
                    </span>
                  </div>
                )}
                {selectedVersement.note && (
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Note :</span>
                    <span className="text-slate-700">{selectedVersement.note}</span>
                  </div>
                )}
              </div>

              <div className="amount-box my-4 p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
                <span className="text-xs uppercase font-semibold text-emerald-800 block mb-0.5">
                  Montant Réglé
                </span>
                <span className="amount-val text-2xl font-black text-emerald-900">
                  {Number(selectedVersement.montant).toLocaleString("fr-FR")} DZD
                </span>
              </div>

              <p className="text-[10px] text-center text-slate-400 mt-2">
                Document généré le {new Date().toLocaleDateString("fr-FR")} à{" "}
                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}

          <DialogFooter className="mt-5 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setPrintReceiptModal(false)}
              className="rounded-xl text-xs"
            >
              Fermer
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs flex items-center gap-1.5"
            >
              <Printer size={15} /> Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

