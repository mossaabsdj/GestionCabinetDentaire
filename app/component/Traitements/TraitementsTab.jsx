"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit3,
  Trash2,
  AlertCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Eye,
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
import TraitementDetailModal from "./TraitementDetailModal";

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

export default function TraitementsTab({
  patient,
  selectedPatient,
  patientId,
  onRefresh,
  onContinueTraitement,
  query = "",
  dateFilter = "",
  showNewTraitementModal,
  setShowNewTraitementModal,
}) {
  const currentPatient = selectedPatient || patient;
  const currentPatientId = patientId || currentPatient?.id;

  const [filterStatut, setFilterStatut] = useState("TOUS");
  const [expandedTraitementId, setExpandedTraitementId] = useState(null);
  const [localTraitements, setLocalTraitements] = useState(null);
  const [loadingLocal, setLoadingLocal] = useState(false);

  // Fetch treatments independently when patientId changes
  const fetchLocalTraitements = async () => {
    if (!currentPatientId) return;
    try {
      setLoadingLocal(true);
      const res = await fetch(`/api/traitements?patientId=${currentPatientId}`);
      if (res.ok) {
        const data = await res.json();
        setLocalTraitements(data);
      }
    } catch (err) {
      console.error("Erreur chargement local traitements:", err);
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    if (currentPatientId) {
      fetchLocalTraitements();
    }
  }, [currentPatientId]);

  // Modal: Nouveau Traitement
  const [internalShowNewModal, setInternalShowNewModal] = useState(false);
  const showNewModal =
    showNewTraitementModal !== undefined
      ? showNewTraitementModal
      : internalShowNewModal;
  const setShowNewModal = (val) => {
    setInternalShowNewModal(val);
    setShowNewTraitementModal?.(val);
  };
  const [newForm, setNewForm] = useState({
    description: "",
    dent: "",
    prixTotal: "",
    initialVersement: "",
    initialVersementNote: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  // Modal: Nouveau Versement
  const [versementModal, setVersementModal] = useState({
    open: false,
    traitement: null,
    montant: "",
    note: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [savingVersement, setSavingVersement] = useState(false);

  // Modal: Modifier Traitement
  const [editModal, setEditModal] = useState({
    open: false,
    id: null,
    description: "",
    dent: "",
    prixTotal: "",
    statut: "EN_COURS",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal: Détails du traitement
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailTraitement, setSelectedDetailTraitement] = useState(null);

  // Compute enriched treatments
  const sourceTraitements =
    localTraitements !== null
      ? localTraitements
      : currentPatient?.traitements || [];

  const traitements = sourceTraitements.map((t) => {
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

  const filteredTraitements = traitements.filter((t) => {
    if (filterStatut !== "TOUS" && t.statut !== filterStatut) return false;

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      const matchesDesc = t.description?.toLowerCase().includes(q);
      const matchesDent = t.dent?.toLowerCase().includes(q);
      const matchesActe = t.consultationsTraitement?.some(
        (ct) =>
          ct.acteRealise?.toLowerCase().includes(q) ||
          ct.consultation?.motifDeConsultation?.toLowerCase().includes(q) ||
          ct.consultation?.note?.toLowerCase().includes(q),
      );
      const matchesPrice = String(t.prixTotal || "").includes(q);
      if (!matchesDesc && !matchesDent && !matchesActe && !matchesPrice) {
        return false;
      }
    }

    if (dateFilter) {
      const matchesCreatedAt = isSameDate(t.createdAt, dateFilter);
      const matchesSessions = t.consultationsTraitement?.some((ct) =>
        isSameDate(ct.createdAt || ct.consultation?.createdAt, dateFilter),
      );
      const matchesVersements = t.versements?.some((v) =>
        isSameDate(v.date || v.createdAt, dateFilter),
      );
      if (!matchesCreatedAt && !matchesSessions && !matchesVersements) {
        return false;
      }
    }

    return true;
  });

  // Calculate totals
  const totalPrix = traitements
    .filter((t) => t.statut !== "ANNULE")
    .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

  const totalPaye = traitements.reduce(
    (sum, t) => sum + (Number(t.totalPaye) || 0),
    0,
  );

  const resteTotal = Math.max(0, totalPrix - totalPaye);

  // Toggle card expansion
  const toggleExpand = (id) => {
    setExpandedTraitementId(expandedTraitementId === id ? null : id);
  };

  // 1. Create new treatment
  const handleCreateTraitement = async (e) => {
    e.preventDefault();
    if (!newForm.description.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Champ requis",
        text: "Veuillez saisir une description pour le traitement.",
      });
      return;
    }

    const prix = parseFloat(newForm.prixTotal);
    if (isNaN(prix) || prix < 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Le prix total doit être un nombre positif ou nul.",
      });
      return;
    }

    setSavingNew(true);
    try {
      const payload = {
        patientId: currentPatientId,
        description: newForm.description.trim(),
        dent: newForm.dent.trim() || null,
        prixTotal: prix,
        statut: "EN_COURS",
      };

      if (parseFloat(newForm.initialVersement) > 0) {
        payload.versement = {
          montant: parseFloat(newForm.initialVersement),
          note: newForm.initialVersementNote?.trim() || "Versement initial",
          date: new Date().toISOString(),
        };
      }

      const res = await fetch("/api/traitements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      setShowNewModal(false);
      setNewForm({
        description: "",
        dent: "",
        prixTotal: "",
        initialVersement: "",
        initialVersementNote: "",
      });

      await fetchLocalTraitements();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Traitement créé !",
        text: "Le nouveau traitement a été enregistré avec succès.",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err?.message || "Impossible de créer le traitement.",
      });
    } finally {
      setSavingNew(false);
    }
  };

  // 2. Add versement
  const handleSaveVersement = async (e) => {
    e.preventDefault();
    const montant = parseFloat(versementModal.montant);
    const reste = versementModal.traitement?.resteAPayer ?? 0;

    if (isNaN(montant) || montant <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Veuillez entrer un montant supérieur à 0.",
      });
      return;
    }

    if (montant > reste + 0.001) {
      Swal.fire({
        icon: "warning",
        title: "Montant excessif",
        text: `Le versement ne peut pas dépasser le reste à payer (${reste.toLocaleString(
          "fr-FR",
        )} DZD).`,
      });
      return;
    }

    setSavingVersement(true);
    try {
      const res = await fetch("/api/versements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentPatientId,
          traitementId: versementModal.traitement.id,
          montant,
          note: versementModal.note?.trim() || null,
          date: versementModal.date || new Date().toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Erreur lors de l'enregistrement");

      setVersementModal({
        open: false,
        traitement: null,
        montant: "",
        note: "",
        date: new Date().toISOString().split("T")[0],
      });

      await fetchLocalTraitements();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Versement enregistré !",
        text: "Le versement a été ajouté avec succès.",
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
      setSavingVersement(false);
    }
  };

  // 3. Edit treatment
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const res = await fetch("/api/traitements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editModal.id,
          description: editModal.description.trim(),
          dent: editModal.dent?.trim() || null,
          prixTotal: parseFloat(editModal.prixTotal),
          statut: editModal.statut,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de mise à jour");

      setEditModal({
        open: false,
        id: null,
        description: "",
        dent: "",
        prixTotal: "",
        statut: "EN_COURS",
      });

      if (selectedDetailTraitement?.id === editModal.id) {
        setSelectedDetailTraitement((prev) => ({
          ...prev,
          ...data,
          description: editModal.description.trim(),
          dent: editModal.dent?.trim() || null,
          prixTotal: parseFloat(editModal.prixTotal),
          statut: editModal.statut,
        }));
      }

      await fetchLocalTraitements();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Traitement mis à jour !",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err?.message || "Impossible de modifier le traitement.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // 4. Quick status change
  const handleQuickStatusChange = async (traitementId, newStatus) => {
    try {
      const res = await fetch("/api/traitements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: traitementId,
          statut: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (selectedDetailTraitement?.id === traitementId) {
        setSelectedDetailTraitement((prev) =>
          prev ? { ...prev, statut: newStatus } : null
        );
      }

      await fetchLocalTraitements();
      await onRefresh?.();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de modifier le statut.",
      });
    }
  };

  // 5. Delete versement
  const handleDeleteVersement = async (versementId) => {
    const result = await Swal.fire({
      title: "Supprimer ce versement ?",
      text: "Cette action annulera ce paiement dans l'historique financier.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/versements?id=${versementId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erreur de suppression");

      await fetchLocalTraitements();
      await onRefresh?.();

      Swal.fire({
        icon: "success",
        title: "Versement supprimé",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de supprimer le versement.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 📊 RÉSUMÉ FINANCIER RAPIDE DU PATIENT */}
      {/* ======================================================== */}

      {/* ======================================================== */}
      {/* 🔍 BARRE D'ACTIONS ET FILTRES */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[var(--color-200)] shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "TOUS", label: "Tous les soins", count: traitements.length },
            {
              id: "EN_COURS",
              label: "En cours",
              count: traitements.filter((t) => t.statut === "EN_COURS").length,
            },
            {
              id: "TERMINE",
              label: "Terminés",
              count: traitements.filter((t) => t.statut === "TERMINE").length,
            },
            {
              id: "ANNULE",
              label: "Annulés",
              count: traitements.filter((t) => t.statut === "ANNULE").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatut(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                filterStatut === tab.id
                  ? "bg-[var(--color-600)] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-xs ${
                  filterStatut === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📋 LISTE DES TRAITEMENTS */}
      {/* ======================================================== */}
      {filteredTraitements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">
            Aucun traitement enregistré
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {filterStatut === "TOUS"
              ? "Ce patient n'a pas encore de traitement. Vous pouvez en créer un ou en attacher un lors d'une nouvelle consultation."
              : `Aucun traitement avec le statut "${filterStatut}".`}
          </p>
          <Button
            onClick={() => setShowNewModal(true)}
            variant="outline"
            className="mt-4 rounded-xl border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)]"
          >
            + Créer un traitement
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTraitements.map((t) => {
            const isExpanded = expandedTraitementId === t.id;
            const sessionsCount = t.consultationsTraitement?.length || 0;
            const versementsCount = t.versements?.length || 0;
            const rendezVousCount = t.rendezVous?.length || 0;
            const progressPercent =
              t.prixTotal > 0
                ? Math.min(
                    100,
                    Math.round(((t.totalPaye || 0) / t.prixTotal) * 100),
                  )
                : 100;

            return (
              <Card
                key={t.id}
                onClick={() => {
                  setSelectedDetailTraitement(t);
                  setDetailModalOpen(true);
                }}
                className="overflow-hidden border border-slate-200 hover:border-[var(--color-400)] transition-all shadow-sm hover:shadow-md rounded-2xl bg-white cursor-pointer group"
              >
                {/* Header de la carte de traitement */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Badge Dent */}
                      <div className="p-2.5 rounded-xl bg-[var(--color-100)] text-[var(--color-700)] flex flex-col items-center justify-center min-w-[56px] text-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className="text-[10px] font-semibold uppercase text-slate-500">
                          Dent
                        </span>
                        <span className="text-sm font-bold text-[var(--color-800)]">
                          {t.dent || "—"}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[var(--color-700)] transition-colors truncate">
                            {t.description}
                          </h4>

                          {/* Statut Badge */}
                          {t.statut === "EN_COURS" && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              En cours
                            </span>
                          )}
                          {t.statut === "TERMINE" && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Terminé
                            </span>
                          )}
                          {t.statut === "ANNULE" && (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 border border-slate-300">
                              Annulé
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                          <span>
                            Créé le{" "}
                            {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          <span>•</span>
                          <span>{sessionsCount} séance(s)</span>
                          <span>•</span>
                          <span>{versementsCount} versement(s)</span>
                        </p>
                      </div>
                    </div>

                    {/* Actions directes */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {t.statut === "EN_COURS" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onContinueTraitement?.(t);
                          }}
                          className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                          title="Ouvrir une nouvelle consultation et continuer ce traitement"
                        >
                          <ArrowRight size={14} />
                          Continuer
                        </Button>
                      )}

                      {t.resteAPayer > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersementModal({
                              open: true,
                              traitement: t,
                              montant: "",
                              note: "",
                              date: new Date().toISOString().split("T")[0],
                            });
                          }}
                          className="border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)] rounded-xl text-xs font-medium flex items-center gap-1"
                        >
                          <CreditCard size={14} />
                          Versement
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModal({
                            open: true,
                            id: t.id,
                            description: t.description,
                            dent: t.dent || "",
                            prixTotal: t.prixTotal,
                            statut: t.statut,
                          });
                        }}
                        className="text-slate-600 hover:text-slate-900 rounded-xl text-xs"
                        title="Modifier le traitement"
                      >
                        <Edit3 size={15} />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailTraitement(t);
                          setDetailModalOpen(true);
                        }}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium flex items-center gap-1 shadow-2xs"
                        title="Voir les détails complets du soin"
                      >
                        <Eye size={14} />
                        Détails
                      </Button>
                    </div>
                  </div>

                  {/* Barre financière */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 mb-1.5">
                      <span>
                        Prix total :{" "}
                        <strong className="text-slate-900 font-semibold">
                          {(t.prixTotal || 0).toLocaleString("fr-FR")} DZD
                        </strong>
                      </span>
                      <span>
                        Payé :{" "}
                        <strong className="text-emerald-700 font-semibold">
                          {(t.totalPaye || 0).toLocaleString("fr-FR")} DZD
                        </strong>
                      </span>
                      <span>
                        Reste :{" "}
                        <strong
                          className={`font-bold ${
                            t.resteAPayer > 0
                              ? "text-red-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {(t.resteAPayer || 0).toLocaleString("fr-FR")} DZD
                        </strong>
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          t.resteAPayer === 0
                            ? "bg-emerald-500"
                            : "bg-[var(--color-600)]"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ➕ MODAL NOUVEAU TRAITEMENT */}
      {/* ======================================================== */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-600)]" />
              Nouveau traitement dentaire
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Définissez le soin à entreprendre pour le patient{" "}
              <strong>{selectedPatient?.nom}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTraitement} className="space-y-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description / Libellé du soin *
              </label>
              <Input
                type="text"
                required
                value={newForm.description}
                onChange={(e) =>
                  setNewForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Ex: Traitement canalaire, Dévitalisation, Couronne céramique..."
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dent(s) concernée(s)
                </label>
                <Input
                  type="text"
                  value={newForm.dent}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, dent: e.target.value }))
                  }
                  placeholder="Ex: 16, 21, 22..."
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prix total prévu (DZD) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={newForm.prixTotal}
                  onChange={(e) =>
                    setNewForm((prev) => ({
                      ...prev,
                      prixTotal: e.target.value,
                    }))
                  }
                  placeholder="Ex: 15000"
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" />
                Premier versement à l'ouverture (Optionnel)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={newForm.initialVersement}
                  onChange={(e) =>
                    setNewForm((prev) => ({
                      ...prev,
                      initialVersement: e.target.value,
                    }))
                  }
                  placeholder="Montant (DZD)"
                  className="h-10 rounded-lg text-sm bg-white"
                />
                <Input
                  type="text"
                  value={newForm.initialVersementNote}
                  onChange={(e) =>
                    setNewForm((prev) => ({
                      ...prev,
                      initialVersementNote: e.target.value,
                    }))
                  }
                  placeholder="Note (ex: Acompte)"
                  className="h-10 rounded-lg text-sm bg-white"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewModal(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={savingNew || !newForm.description.trim()}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl"
              >
                {savingNew ? "Enregistrement..." : "Créer le traitement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 💳 MODAL NOUVEAU VERSEMENT */}
      {/* ======================================================== */}
      <Dialog
        open={versementModal.open}
        onOpenChange={(open) =>
          setVersementModal((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Enregistrer un versement
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pour le soin :{" "}
              <strong>{versementModal.traitement?.description}</strong>{" "}
              {versementModal.traitement?.dent &&
                `(Dent ${versementModal.traitement.dent})`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVersement} className="space-y-4 mt-3">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-emerald-800">
                Reste à payer actuel sur ce soin :
              </span>
              <span className="font-bold text-emerald-950 text-sm">
                {(versementModal.traitement?.resteAPayer || 0).toLocaleString(
                  "fr-FR",
                )}{" "}
                DZD
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant du versement (DZD) *
              </label>
              <Input
                type="number"
                step="0.01"
                required
                max={versementModal.traitement?.resteAPayer || undefined}
                value={versementModal.montant}
                onChange={(e) =>
                  setVersementModal((prev) => ({
                    ...prev,
                    montant: e.target.value,
                  }))
                }
                placeholder="Ex: 5000"
                className="h-11 rounded-xl text-base font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date du paiement
                </label>
                <Input
                  type="date"
                  value={versementModal.date}
                  onChange={(e) =>
                    setVersementModal((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note / Référence
                </label>
                <Input
                  type="text"
                  value={versementModal.note}
                  onChange={(e) =>
                    setVersementModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Ex: Espèces, Chèque..."
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVersementModal((prev) => ({ ...prev, open: false }))
                }
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  savingVersement ||
                  !versementModal.montant ||
                  parseFloat(versementModal.montant) <= 0
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                {savingVersement ? "Validation..." : "Valider le versement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* ✏️ MODAL MODIFIER TRAITEMENT */}
      {/* ======================================================== */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => setEditModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              Modifier le traitement
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description / Libellé *
              </label>
              <Input
                type="text"
                required
                value={editModal.description}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Dent
                </label>
                <Input
                  type="text"
                  value={editModal.dent}
                  onChange={(e) =>
                    setEditModal((prev) => ({ ...prev, dent: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prix total (DZD) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={editModal.prixTotal}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      prixTotal: e.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Statut
              </label>
              <select
                value={editModal.statut}
                onChange={(e) =>
                  setEditModal((prev) => ({ ...prev, statut: e.target.value }))
                }
                className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm"
              >
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditModal((prev) => ({ ...prev, open: false }))
                }
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={savingEdit || !editModal.description.trim()}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl"
              >
                {savingEdit
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 🔍 MODAL DÉTAILS DU TRAITEMENT */}
      {/* ======================================================== */}
      <TraitementDetailModal
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open);
          if (!open) setSelectedDetailTraitement(null);
        }}
        traitement={selectedDetailTraitement}
        onContinue={(t) => {
          setDetailModalOpen(false);
          onContinueTraitement?.(t);
        }}
        onUpdated={async (updated) => {
          setSelectedDetailTraitement((prev) =>
            prev?.id === updated.id ? { ...prev, ...updated } : prev,
          );
          await fetchLocalTraitements();
          await onRefresh?.();
        }}
        onAddVersement={(t) => {
          setVersementModal({
            open: true,
            traitement: t,
            montant: "",
            note: "",
            date: new Date().toISOString().split("T")[0],
          });
        }}
        onDeleteVersement={handleDeleteVersement}
        onQuickStatusChange={handleQuickStatusChange}
      />
    </div>
  );
}
