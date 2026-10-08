"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Plus,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Trash2,
  Search,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";

export default function FinancesPatientTab({
  patient,
  selectedPatient,
  patientId,
  onRefresh,
}) {
  const currentPatient = selectedPatient || patient;
  const currentPatientId = patientId || currentPatient?.id;

  const [search, setSearch] = useState("");
  const [versementModalOpen, setVersementModalOpen] = useState(false);
  const [selectedTraitementId, setSelectedTraitementId] = useState("");
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const [localTraitements, setLocalTraitements] = useState(null);
  const [localPaiements, setLocalPaiements] = useState(null);

  // Independently fetch finances when patientId changes
  const fetchLocalFinances = async () => {
    if (!currentPatientId) return;
    try {
      const [resTr, resVer] = await Promise.all([
        fetch(`/api/traitements?patientId=${currentPatientId}`),
        fetch(`/api/versements?patientId=${currentPatientId}`),
      ]);
      if (resTr.ok) {
        const dataTr = await resTr.json();
        setLocalTraitements(dataTr);
      }
      if (resVer.ok) {
        const dataVer = await resVer.json();
        setLocalPaiements(dataVer);
      }
    } catch (err) {
      console.error("Erreur chargement local finances:", err);
    }
  };

  useEffect(() => {
    if (currentPatientId) {
      fetchLocalFinances();
    }
  }, [currentPatientId]);

  const rawTraitements =
    localTraitements !== null
      ? localTraitements
      : (currentPatient?.traitements || []);
  const rawPaiements =
    localPaiements !== null
      ? localPaiements
      : (currentPatient?.paiements || []);

  const traitements = rawTraitements.map((t) => {
    const paid =
      t.totalPaye !== undefined
        ? Number(t.totalPaye)
        : (t.versements || []).reduce((acc, v) => acc + (Number(v.montant) || 0), 0);
    const reste =
      t.resteAPayer !== undefined
        ? Number(t.resteAPayer)
        : Math.max(0, (Number(t.prixTotal) || 0) - paid);
    return {
      ...t,
      totalPaye: paid,
      resteAPayer: reste,
    };
  });

  const paiements = rawPaiements;

  // Financial calculations
  const totalDu =
    currentPatient?.totalDu ??
    traitements
      .filter((t) => t.statut !== "ANNULE")
      .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

  const totalPaye =
    currentPatient?.totalPaye ??
    (paiements.length > 0
      ? paiements.reduce((sum, p) => sum + (Number(p.montant) || 0), 0)
      : traitements.reduce((sum, t) => sum + (t.totalPaye || 0), 0));

  const detteRestante =
    currentPatient?.detteRestante ??
    Math.max(0, totalDu - totalPaye);

  // Active treatments with remaining balance
  const activeDebtTraitements = traitements.filter(
    (t) => t.statut !== "ANNULE" && (t.resteAPayer || 0) > 0
  );

  // Filtered payments list
  const filteredPaiements = paiements.filter((p) => {
    const term = search.toLowerCase();
    const desc = p.traitement?.description?.toLowerCase() || "";
    const noteStr = p.note?.toLowerCase() || "";
    const montantStr = String(p.montant);
    return (
      desc.includes(term) || noteStr.includes(term) || montantStr.includes(term)
    );
  });

  // Selected treatment details in modal
  const selectedTraitement = traitements.find(
    (t) => t.id === Number(selectedTraitementId)
  );

  // Quick open payment modal for specific treatment
  const handleOpenForTraitement = (tId) => {
    setSelectedTraitementId(String(tId));
    setVersementModalOpen(true);
  };

  const handleCreateVersement = async (e) => {
    e.preventDefault();
    const parsedMontant = parseFloat(montant);

    if (isNaN(parsedMontant) || parsedMontant <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Le montant du versement doit être supérieur à 0.",
      });
      return;
    }

    if (selectedTraitement) {
      const reste = selectedTraitement.resteAPayer || 0;
      if (parsedMontant > reste + 0.001) {
        Swal.fire({
          icon: "warning",
          title: "Montant excessif",
          text: `Le versement dépasse le solde restant (${reste.toLocaleString(
            "fr-FR"
          )} DZD) pour ce traitement.`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/versements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentPatientId,
          traitementId: selectedTraitementId ? Number(selectedTraitementId) : null,
          montant: parsedMontant,
          note: note.trim() || null,
          date: date || new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'enregistrement");

      setVersementModalOpen(false);
      setSelectedTraitementId("");
      setMontant("");
      setNote("");
      setDate(new Date().toISOString().split("T")[0]);

      await fetchLocalFinances();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Versement enregistré !",
        text: "Le compte du patient a été mis à jour avec succès.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err?.message || "Impossible d'enregistrer le versement.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePaiement = async (id) => {
    const result = await Swal.fire({
      title: "Supprimer ce versement ?",
      text: "Le montant sera déduit des paiements et réinjecté dans le solde dû.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/versements?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur de suppression");

      await fetchLocalFinances();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Paiement supprimé",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de supprimer ce versement.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 📊 STATISTIQUES FINANCIÈRES DU PATIENT */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Total facturé (Soins)
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-950 mt-1">
              {totalDu.toLocaleString("fr-FR")} DZD
            </p>
            <p className="text-xs text-blue-500 mt-1">
              {traitements.length} traitement(s) enregistré(s)
            </p>
          </div>
          <div className="p-3.5 bg-blue-100 text-blue-700 rounded-2xl shadow-2xs">
            <Receipt className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Versements reçus
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-950 mt-1">
              {totalPaye.toLocaleString("fr-FR")} DZD
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {paiements.length} paiement(s) effectué(s)
            </p>
          </div>
          <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-2xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Solde débiteur restant
            </p>
            <p
              className={`text-2xl sm:text-3xl font-bold mt-1 ${
                detteRestante > 0 ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {detteRestante.toLocaleString("fr-FR")} DZD
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {detteRestante > 0 ? "Paiement en attente" : "Compte soldé"}
            </p>
          </div>
          <div className="p-3.5 bg-amber-100 text-amber-700 rounded-2xl shadow-2xs">
            <DollarSign className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* ⚠️ SOINS EN ATTENTE DE RÈGLEMENT */}
      {/* ======================================================== */}
      {activeDebtTraitements.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5">
          <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2 mb-3">
            <AlertCircle size={18} className="text-amber-600" />
            Traitements avec solde impayé ({activeDebtTraitements.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeDebtTraitements.map((t) => (
              <div
                key={t.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    {t.dent && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        Dent {t.dent}
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {t.description}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reste :{" "}
                    <strong className="text-amber-700 font-semibold">
                      {(t.resteAPayer || 0).toLocaleString("fr-FR")} DZD
                    </strong>{" "}
                    / {(t.prixTotal || 0).toLocaleString("fr-FR")} DZD
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenForTraitement(t.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs shrink-0"
                >
                  Payer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🔍 HISTORIQUE DES PAIEMENTS */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-[var(--color-600)]" />
              Historique des versements
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Traçabilité chronologique de tous les paiements du patient
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-2.5 text-slate-400"
              />
              <Input
                type="text"
                placeholder="Rechercher un versement..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs sm:text-sm w-48 sm:w-64"
              />
            </div>

            <Button
              onClick={() => {
                setSelectedTraitementId("");
                setVersementModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs sm:text-sm flex items-center gap-1.5 h-10"
            >
              <Plus size={16} />
              Nouveau versement
            </Button>
          </div>
        </div>

        {filteredPaiements.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm">Aucun versement trouvé pour ce patient.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Soin / Traitement associé</th>
                  <th className="py-3 px-4">Dent</th>
                  <th className="py-3 px-4">Note / Référence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPaiements.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-800 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(p.date).toLocaleDateString("fr-FR")}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700 text-base">
                        {p.montant.toLocaleString("fr-FR")} DZD
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {p.traitement ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">
                            {p.traitement.description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">
                          Versement libre (sans soin précis)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.traitement?.dent ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {p.traitement.dent}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {p.note || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePaiement(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer ce paiement"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 💳 MODAL NOUVEAU VERSEMENT GÉNÉRAL */}
      {/* ======================================================== */}
      <Dialog open={versementModalOpen} onOpenChange={setVersementModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Nouveau versement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enregistrer un paiement pour le patient{" "}
              <strong>{currentPatient?.nom}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVersement} className="space-y-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Associer à un traitement
              </label>
              <select
                value={selectedTraitementId}
                onChange={(e) => setSelectedTraitementId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <option value="">
                  -- Versement libre / Aucun soin particulier --
                </option>
                {traitements
                  .filter((t) => t.statut !== "ANNULE")
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.description} {t.dent ? `(Dent ${t.dent})` : ""} — Reste
                      : {(t.resteAPayer || 0).toLocaleString("fr-FR")} DZD
                    </option>
                  ))}
              </select>
            </div>

            {selectedTraitement && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-800">
                  Reste à payer sur ce soin :
                </span>
                <span className="font-bold text-emerald-950 text-sm">
                  {(selectedTraitement.resteAPayer || 0).toLocaleString(
                    "fr-FR"
                  )}{" "}
                  DZD
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant du versement (DZD) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                max={
                  selectedTraitement
                    ? selectedTraitement.resteAPayer
                    : undefined
                }
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="Ex: 5000"
                className="h-11 rounded-xl text-base font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note / Référence
                </label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Espèces, Virement..."
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVersementModalOpen(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving || !montant || parseFloat(montant) <= 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                {saving ? "Enregistrement..." : "Valider le versement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

