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
  Loader2,
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

function isSameDate(itemDate, targetDateStr) {
  if (!targetDateStr) return true;
  if (!itemDate) return false;
  const d = new Date(itemDate);
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` === targetDateStr;
}

export default function FinancesPatientTab({
  patient,
  selectedPatient,
  patientId,
  onRefresh,
  query = "",
  dateFilter = "",
  showNewVersementModal,
  setShowNewVersementModal,
}) {
  const currentPatient = selectedPatient || patient;
  const currentPatientId = patientId || currentPatient?.id;

  const [search, setSearch] = useState("");
  const [internalVersementModalOpen, setInternalVersementModalOpen] =
    useState(false);
  const versementModalOpen =
    showNewVersementModal !== undefined
      ? showNewVersementModal
      : internalVersementModalOpen;
  const setVersementModalOpen = (val) => {
    setInternalVersementModalOpen(val);
    setShowNewVersementModal?.(val);
  };
  const [selectedTraitementId, setSelectedTraitementId] = useState("");
  const [montant, setMontant] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [localTraitements, setLocalTraitements] = useState(null);
  const [localPaiements, setLocalPaiements] = useState(null);

  // Independently fetch finances when patientId changes
  const fetchLocalFinances = async () => {
    if (!currentPatientId) return;
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPatientId) {
      fetchLocalFinances();
    }
  }, [currentPatientId]);

  if (!currentPatientId) {
    return (
      <div className="bg-white dark:bg-card rounded-2xl border border-[var(--color-100)] dark:border-border p-12 text-center shadow-sm">
        <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
          Aucun patient sélectionné
        </h3>
        <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1">
          Veuillez sélectionner un patient pour consulter ses finances.
        </p>
      </div>
    );
  }

  const rawTraitements =
    localTraitements !== null
      ? localTraitements
      : currentPatient?.traitements || [];
  const rawPaiements =
    localPaiements !== null ? localPaiements : currentPatient?.paiements || [];

  const traitements = rawTraitements.map((t) => {
    const paid =
      t.totalPaye !== undefined
        ? Number(t.totalPaye)
        : (t.versements || []).reduce(
            (acc, v) => acc + (Number(v.montant) || 0),
            0,
          );
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
    currentPatient?.detteRestante ?? Math.max(0, totalDu - totalPaye);

  // Active treatments with remaining balance
  const activeDebtTraitements = traitements.filter((t) => {
    if (t.statut === "ANNULE" || (t.resteAPayer || 0) <= 0) return false;
    const term = (query || "").trim().toLowerCase();
    if (term) {
      const matches =
        t.description?.toLowerCase().includes(term) ||
        t.dent?.toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  // Filtered payments list
  const filteredPaiements = paiements.filter((p) => {
    const term = (query || search || "").trim().toLowerCase();
    const desc = p.traitement?.description?.toLowerCase() || "";
    const noteStr = p.note?.toLowerCase() || "";
    const montantStr = String(p.montant || "");
    const dateStr = p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "";

    const matchesQuery =
      !term ||
      desc.includes(term) ||
      noteStr.includes(term) ||
      montantStr.includes(term) ||
      dateStr.toLowerCase().includes(term);

    const matchesDate =
      !dateFilter || isSameDate(p.date || p.createdAt, dateFilter);

    return matchesQuery && matchesDate;
  });

  // Selected treatment details in modal
  const selectedTraitement = traitements.find(
    (t) => t.id === Number(selectedTraitementId),
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
            "fr-FR",
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
          traitementId: selectedTraitementId
            ? Number(selectedTraitementId)
            : null,
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
        {/* Total facturé */}
        <Card className="rounded-2xl border border-[var(--color-100)] dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col ">
          <div className="flex items-start justify-between gap-0">
            <div className="min-w-0 b">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                Total facturé (Soins)
              </p>
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-foreground">
                {totalDu.toLocaleString("fr-FR")}
                <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-muted-foreground">
                  DZD
                </span>
              </p>
            </div>
            <div className="flex  shrink-0 items-center justify-center rounded-xl bg-[var(--color-100)] text-[var(--color-700)]">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-0 border-t border-slate-100 dark:border-border/60 pt-3 text-xs text-slate-500 dark:text-muted-foreground">
            {traitements.length} traitement(s) enregistré(s)
          </p>
        </Card>

        {/* Versements reçus */}
        <Card className="rounded-2xl border border-[var(--color-100)] dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
                Versements reçus
              </p>
              <p className="mt-2 truncate text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                {totalPaye.toLocaleString("fr-FR")}
                <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-muted-foreground">
                  DZD
                </span>
              </p>
            </div>
            <div className="flex  shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3.5 border-t border-slate-100 dark:border-border/60 pt-3 text-xs text-slate-500 dark:text-muted-foreground">
            {paiements.length} paiement(s) effectué(s)
          </p>
        </Card>

        {/* Solde restant (Crédit) */}
        <Card
          className={`rounded-2xl border ${
            detteRestante > 0
              ? "border-red-200 dark:border-red-900/60 bg-white dark:bg-card"
              : "border-[var(--color-100)] dark:border-border bg-white dark:bg-card"
          } p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold uppercase tracking-wider ${
                  detteRestante > 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-slate-500 dark:text-muted-foreground"
                }`}
              >
                Solde débiteur restant
              </p>
              <p
                className={`mt-2 truncate text-2xl font-bold tracking-tight ${
                  detteRestante > 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-slate-900 dark:text-foreground"
                }`}
              >
                {detteRestante.toLocaleString("fr-FR")}
                <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-muted-foreground">
                  DZD
                </span>
              </p>
            </div>
            <div
              className={`flex  shrink-0 items-center justify-center rounded-xl ${
                detteRestante > 0
                  ? "bg-amber-50 dark:bg-amber-950/50 text-red-600 dark:text-red-400"
                  : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3.5 flex items-center gap-1.5 border-t border-slate-100 dark:border-border/60 pt-3 text-xs text-slate-500 dark:text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${
                detteRestante > 0
                  ? "bg-red-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            {detteRestante > 0 ? "Paiement en attente" : "Compte soldé"}
          </p>
        </Card>
      </div>

      {/* ======================================================== */}
      {/* ⚠️ SOINS EN ATTENTE DE RÈGLEMENT */}
      {/* ======================================================== */}
      {activeDebtTraitements.length > 0 && (
        <div className="rounded-2xl border border-red-200/80 dark:border-red-900/50 bg-white dark:bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-foreground">
              <AlertCircle
                size={17}
                className="text-red-600 dark:text-red-400"
              />
              Traitements avec solde impayé
              <span className="rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:text-red-300">
                {activeDebtTraitements.length}
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeDebtTraitements.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-border bg-slate-50/80 dark:bg-muted/30 hover:border-[var(--color-300)] dark:hover:border-[var(--color-700)] transition-all p-3.5 shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    {t.dent && (
                      <span className="rounded-md border border-[var(--color-200)] dark:border-border bg-[var(--color-50)] dark:bg-card px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-700)] dark:text-[var(--color-300)]">
                        Dent {t.dent}
                      </span>
                    )}
                    <span className="truncate text-xs font-semibold text-slate-900 dark:text-foreground">
                      {t.description}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
                    Reste :{" "}
                    <strong className="font-bold text-red-700 dark:text-red-400">
                      {(t.resteAPayer || 0).toLocaleString("fr-FR")} DZD
                    </strong>{" "}
                    / {(t.prixTotal || 0).toLocaleString("fr-FR")} DZD
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenForTraitement(t.id)}
                  className="shrink-0 rounded-xl bg-[var(--color-600)] hover:bg-[var(--color-700)] text-xs text-white font-medium shadow-sm flex items-center gap-1.5"
                >
                  <CreditCard size={13} />
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
      <div className="bg-white dark:bg-card rounded-2xl border border-[var(--color-100)] dark:border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-border bg-gradient-to-r from-[var(--color-50)]/50 dark:from-muted/20 to-white dark:to-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-foreground flex items-center gap-2">
              <CreditCard size={18} className="text-[var(--color-600)]" />
              Historique des versements
            </h3>
          </div>
        </div>

        {loading && rawPaiements.length === 0 ? (
          <div className="p-16 text-center">
            <Loader2 className="w-9 h-9 animate-spin text-[var(--color-600)] mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 dark:text-muted-foreground">
              Chargement des versements...
            </p>
          </div>
        ) : filteredPaiements.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-50)] dark:bg-muted text-[var(--color-600)] dark:text-[var(--color-400)] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Receipt className="w-7 h-7" />
            </div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-foreground">
              Aucun versement trouvé
            </h4>
            <p className="text-sm text-slate-500 dark:text-muted-foreground mt-1 max-w-sm mx-auto">
              {query || search || dateFilter
                ? "Aucun paiement ne correspond à vos critères de recherche ou de filtre."
                : "Ce patient n'a encore enregistré aucun versement."}
            </p>
            {!(query || search || dateFilter) && (
              <Button
                onClick={() => {
                  setSelectedTraitementId("");
                  setVersementModalOpen(true);
                }}
                className="mt-4 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium rounded-xl text-xs sm:text-sm shadow-sm"
              >
                <Plus size={15} className="mr-1.5" />
                Enregistrer un versement
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-50)] dark:bg-muted/40 border-b border-[var(--color-100)] dark:border-border text-[11px] font-bold text-[var(--color-800)] dark:text-[var(--color-300)] uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Soin / Traitement associé</th>
                  <th className="py-3 px-4">Dent</th>
                  <th className="py-3 px-4">Note / Référence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-border text-sm">
                {filteredPaiements.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[var(--color-50)]/60 dark:hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-foreground flex items-center gap-2">
                      <Calendar size={14} className="text-[var(--color-500)]" />
                      {new Date(p.date).toLocaleDateString("fr-FR")}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 text-base">
                        {p.montant.toLocaleString("fr-FR")} DZD
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {p.traitement ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-foreground">
                            {p.traitement.description}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-muted-foreground italic text-xs">
                          Versement libre (sans soin précis)
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.traitement?.dent ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-[var(--color-100)] dark:bg-muted text-[var(--color-800)] dark:text-[var(--color-200)] border border-[var(--color-200)] dark:border-border">
                          Dent {p.traitement.dent}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-muted-foreground/40">
                          —
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 dark:text-muted-foreground text-xs">
                      {p.note || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePaiement(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
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
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white dark:bg-card border border-[var(--color-100)] dark:border-border shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-700)] dark:text-[var(--color-300)] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[var(--color-600)]" />
              Nouveau versement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-muted-foreground">
              Enregistrer un paiement pour le patient{" "}
              <strong className="text-slate-800 dark:text-foreground">
                {currentPatient?.nom}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVersement} className="space-y-4 mt-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] uppercase tracking-wider mb-1.5">
                Associer à un traitement
              </label>
              <select
                value={selectedTraitementId}
                onChange={(e) => setSelectedTraitementId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[var(--color-200)] dark:border-border bg-white dark:bg-card text-foreground focus:ring-2 focus:ring-[var(--color-400)] focus:border-[var(--color-500)] text-sm outline-none transition-all"
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
              <div className="p-3 bg-[var(--color-50)] dark:bg-muted/40 border border-[var(--color-200)] dark:border-border rounded-xl flex items-center justify-between text-xs">
                <span className="text-[var(--color-700)] dark:text-[var(--color-300)] font-medium">
                  Reste à payer sur ce soin :
                </span>
                <span className="font-bold text-[var(--color-900)] dark:text-foreground text-sm">
                  {(selectedTraitement.resteAPayer || 0).toLocaleString(
                    "fr-FR",
                  )}{" "}
                  DZD
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] uppercase tracking-wider mb-1.5">
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
                className="h-11 rounded-xl text-base font-semibold border-[var(--color-200)] dark:border-border focus:ring-2 focus:ring-[var(--color-400)] focus:border-[var(--color-500)] bg-white dark:bg-card text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-xl border-[var(--color-200)] dark:border-border focus:ring-2 focus:ring-[var(--color-400)] focus:border-[var(--color-500)] bg-white dark:bg-card text-foreground text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-700)] dark:text-[var(--color-300)] uppercase tracking-wider mb-1.5">
                  Note / Référence
                </label>
                <Input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Espèces, Virement..."
                  className="h-11 rounded-xl border-[var(--color-200)] dark:border-border focus:ring-2 focus:ring-[var(--color-400)] focus:border-[var(--color-500)] bg-white dark:bg-card text-foreground text-sm"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setVersementModalOpen(false)}
                className="rounded-xl border-slate-300 dark:border-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-muted"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={saving || !montant || parseFloat(montant) <= 0}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium rounded-xl shadow-md flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Valider le versement"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
