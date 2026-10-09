"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Sparkles,
  Pill,
  FlaskConical,
  CreditCard,
  Stethoscope,
  ArrowRight,
  Receipt,
  Edit3,
  Trash2,
  Plus,
  X,
  Save,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

const STATUS_LABEL = {
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUS_STYLE = {
  EN_COURS: "bg-amber-100 text-amber-800 border-amber-200",
  TERMINE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ANNULE: "bg-slate-100 text-slate-700 border-slate-200",
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

const fmtDate = (
  d,
  opts = { day: "numeric", month: "short", year: "numeric" },
) => (d ? new Date(d).toLocaleDateString("fr-FR", opts) : "—");

const fmtMoney = (n) => `${(Number(n) || 0).toLocaleString("fr-FR")} DZD`;

export default function TraitementDetailModal({
  open,
  onOpenChange,
  traitement,
  onContinue,
  onEdit,
  onUpdated,
  onDeleteVersement,
  onAddVersement,
  onQuickStatusChange,
}) {
  const [currentTraitement, setCurrentTraitement] = useState(traitement);
  const [activeTab, setActiveTab] = useState("finance");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    dent: "",
    prixTotal: "",
    statut: "EN_COURS",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setCurrentTraitement(traitement);
    if (traitement) {
      setEditForm({
        description: traitement.description || "",
        dent: traitement.dent || "",
        prixTotal:
          traitement.prixTotal !== undefined
            ? String(traitement.prixTotal)
            : "",
        statut: traitement.statut || "EN_COURS",
      });
    }
    setIsEditing(false);
    setActiveTab("finance");
  }, [traitement, open]);

  if (!currentTraitement) return null;

  /* ---------- Calculs ---------- */
  const paid =
    currentTraitement.calculatedPaid !== undefined
      ? Number(currentTraitement.calculatedPaid)
      : currentTraitement.totalPaye !== undefined
        ? Number(currentTraitement.totalPaye)
        : (currentTraitement.versements || []).reduce(
            (sum, v) => sum + (Number(v.montant) || 0),
            0,
          );

  const total = Number(currentTraitement.prixTotal) || 0;
  const reste =
    currentTraitement.calculatedReste !== undefined
      ? Number(currentTraitement.calculatedReste)
      : currentTraitement.resteAPayer !== undefined
        ? Number(currentTraitement.resteAPayer)
        : Math.max(0, total - paid);

  const progressPercent =
    total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 100;

  const sessions = currentTraitement.consultationsTraitement || [];
  const versements = currentTraitement.versements || [];
  const rendezVous = currentTraitement.rendezVous || [];

  /* ---------- Actions ---------- */
  const handleEditClick = () => {
    if (onEdit) onEdit(currentTraitement);
    else setIsEditing((prev) => !prev);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.description.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Champ requis",
        text: "Veuillez renseigner la description du traitement.",
      });
      return;
    }

    const prix = parseFloat(editForm.prixTotal);
    if (isNaN(prix) || prix < 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Le prix total doit être un montant positif ou nul.",
      });
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch("/api/traitements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentTraitement.id,
          description: editForm.description.trim(),
          dent: editForm.dent?.trim() || null,
          prixTotal: prix,
          statut: editForm.statut,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de mise à jour");

      setCurrentTraitement((prev) => ({ ...prev, ...data }));
      setIsEditing(false);

      Swal.fire({
        icon: "success",
        title: "Traitement modifié !",
        text: "Les informations du traitement ont été mises à jour.",
        timer: 1500,
        showConfirmButton: false,
      });

      onUpdated?.(data);
    } catch (err) {
      console.error("Erreur modification traitement:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err?.message || "Impossible de mettre à jour le traitement.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (onQuickStatusChange) {
      await onQuickStatusChange(currentTraitement.id, newStatus);
      setCurrentTraitement((prev) => ({ ...prev, statut: newStatus }));
      return;
    }
    try {
      const res = await fetch("/api/traitements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentTraitement.id, statut: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentTraitement((prev) => ({ ...prev, statut: newStatus }));
        onUpdated?.(data);
      }
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    }
  };

  const canAddVersement = reste > 0 && !!onAddVersement;

  /* ---------- Render ---------- */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl min-w-4xl p-0 max-h-[97vh] overflow-hidden flex flex-col">
        {/* ============ HEADER ============ */}
        <DialogHeader className="p-4 pr-12 bg-gradient-to-r from-[var(--color-50)] to-white border-b border-[var(--color-200)] space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-[var(--color-100)] text-[var(--color-700)] text-xs font-semibold uppercase tracking-wider">
                  Dent {currentTraitement.dent || "—"}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider ${
                    STATUS_STYLE[currentTraitement.statut] ||
                    STATUS_STYLE.ANNULE
                  }`}
                >
                  {STATUS_LABEL[currentTraitement.statut] || "Annulé"}
                </span>

                {/* Quick status switch */}
                <div className="inline-flex items-center gap-0.5 bg-[var(--color-100)] p-0.5 rounded-lg border border-[var(--color-200)]">
                  {Object.keys(STATUS_LABEL).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(st)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all duration-200 ${
                        currentTraitement.statut === st
                          ? "bg-white text-[var(--color-700)] shadow-sm"
                          : "text-[var(--color-600)] hover:bg-white/60"
                      }`}
                    >
                      {STATUS_LABEL[st]}
                    </button>
                  ))}
                </div>
              </div>

              <DialogTitle className="text-xl font-bold tracking-tight text-[var(--color-700)] break-words">
                {currentTraitement.description}
              </DialogTitle>

              <DialogDescription className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <Calendar size={14} className="text-[var(--color-500)]" />
                <span>
                  Créé le{" "}
                  {fmtDate(currentTraitement.createdAt, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span>•</span>
                <span>{sessions.length} séance(s)</span>
                <span>•</span>
                <span>{versements.length} versement(s)</span>
              </DialogDescription>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              className="shrink-0 border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)] inline-flex items-center gap-1.5"
            >
              <Edit3 size={14} />
              {isEditing ? "Fermer l'édition" : "Modifier"}
            </Button>
          </div>
        </DialogHeader>

        {/* ============ EDIT FORM ============ */}
        <AnimatePresence>
          {isEditing && (
            <motion.form
              onSubmit={handleSaveEdit}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-b border-[var(--color-200)] bg-[var(--color-50)]/50"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--color-700)] flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-[var(--color-500)]" />
                    Modifier les informations du traitement
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-gray-400 hover:text-[var(--color-700)] p-1 rounded-lg transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-[var(--color-700)] font-medium">
                      Description / Libellé *
                    </Label>
                    <Input
                      required
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Ex: Traitement endodontique molaire..."
                      className="mt-1 border-[var(--color-200)] focus:ring-2 focus:ring-[var(--color-400)] bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[var(--color-700)] font-medium">
                      Dent
                    </Label>
                    <Input
                      value={editForm.dent}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, dent: e.target.value }))
                      }
                      placeholder="Ex: 16, 21..."
                      className="mt-1 border-[var(--color-200)] focus:ring-2 focus:ring-[var(--color-400)] bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-[var(--color-700)] font-medium">
                      Prix total (DZD) *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={editForm.prixTotal}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          prixTotal: e.target.value,
                        }))
                      }
                      className="mt-1 border-[var(--color-200)] focus:ring-2 focus:ring-[var(--color-400)] bg-white font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-[var(--color-700)] font-medium">
                      Statut du traitement
                    </Label>
                    <Select
                      value={editForm.statut}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, statut: v }))
                      }
                    >
                      <SelectTrigger className="mt-1 w-full bg-white border-[var(--color-300)] focus:ring-2 focus:ring-[var(--color-400)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    className="border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)]"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingEdit || !editForm.description.trim()}
                    className="bg-gradient-to-r from-[var(--color-600)] to-[var(--color-700)] hover:from-[var(--color-700)] hover:to-[var(--color-800)] shadow-md inline-flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    {savingEdit ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ============ TABS ============ */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="px-4 pt-3">
            <TabsList className="grid grid-cols-3 w-full bg-gradient-to-r from-[var(--color-100)] to-[var(--color-50)] text-[var(--color-700)] rounded-xl p-1 shadow-sm">
              <TabsTrigger
                value="finance"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Finances
              </TabsTrigger>
              <TabsTrigger
                value="seances"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                Séances
                <span className="ml-2 text-[10px] bg-[var(--color-100)] text-[var(--color-700)] px-1.5 py-0.5 rounded-full">
                  {sessions.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="versements"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Versements
                <span className="ml-2 text-[10px] bg-[var(--color-100)] text-[var(--color-700)] px-1.5 py-0.5 rounded-full">
                  {versements.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ---------- TAB 1 : FINANCES ---------- */}
          <TabsContent
            value="finance"
            className="flex-1 overflow-y-auto px-4 pb-4 mt-0"
          >
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="mt-3 border-[var(--color-300)] shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                  <CardTitle className="text-[var(--color-700)] flex items-center gap-2">
                    <CreditCard size={20} className="text-[var(--color-500)]" />
                    Situation financière
                  </CardTitle>
                  {canAddVersement && (
                    <Button
                      size="sm"
                      onClick={() => onAddVersement(currentTraitement)}
                      className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Versement
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="pt-4 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl border border-[var(--color-200)] bg-white shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Prix total
                      </p>
                      <p className="text-xl font-bold text-[var(--color-700)] mt-1">
                        {fmtMoney(total)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--color-200)] bg-white shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Total payé
                      </p>
                      <p className="text-xl font-bold text-emerald-700 mt-1">
                        {fmtMoney(paid)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-[var(--color-200)] bg-white shadow-sm">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                        Reste à payer
                      </p>
                      <p
                        className={`text-xl font-bold mt-1 ${
                          reste > 0 ? "text-red-600" : "text-emerald-700"
                        }`}
                      >
                        {fmtMoney(reste)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-[var(--color-700)]">
                        Progression du paiement
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-700)] bg-[var(--color-100)] px-2 py-0.5 rounded-full">
                        {progressPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-[var(--color-100)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          reste === 0
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)]"
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {reste === 0
                        ? "Traitement entièrement réglé."
                        : `${versements.length} versement(s) enregistré(s) — reste ${fmtMoney(reste)}.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ---------- TAB 2 : SÉANCES ---------- */}
          <TabsContent
            value="seances"
            className="flex-1 overflow-y-auto px-4 pb-4 mt-0"
          >
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="mt-3 space-y-3"
            >
              {sessions.length === 0 ? (
                <Card className="border-dashed border-[var(--color-300)]">
                  <CardContent className="py-10 flex flex-col items-center text-gray-400 text-sm">
                    <Sparkles size={36} className="mb-3 opacity-30" />
                    <p className="font-medium">Aucune séance enregistrée</p>
                    <p className="text-xs mt-1 text-center max-w-sm">
                      Ce traitement a été créé sans séance liée ou la première
                      séance n&rsquo;a pas encore eu lieu.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sessions.map((ct, idx) => {
                  const consultation = ct.consultation;
                  const dateStr = ct.createdAt || consultation?.createdAt;
                  const ordItems = consultation?.ordonnance?.items || [];
                  const bilanItems = consultation?.bilanRecip?.items || [];
                  const rdv = consultation?.rendezVous;

                  return (
                    <Card
                      key={ct.id || idx}
                      className="border-[var(--color-200)] shadow-md hover:border-[var(--color-300)] transition-all rounded-xl"
                    >
                      <CardHeader className="py-2.5 flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-sm text-[var(--color-700)]">
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-400)] to-[var(--color-600)] text-white font-semibold text-xs flex items-center justify-center">
                            {sessions.length - idx}
                          </span>
                          Séance du {fmtDate(dateStr)}
                        </CardTitle>
                        {dateStr && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={13} />
                            {new Date(dateStr).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </CardHeader>

                      <CardContent className="pt-3 space-y-3">
                        {/* Acte réalisé */}
                        <div className="p-3 rounded-xl bg-[var(--color-50)] border border-[var(--color-200)]">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-700)] flex items-center gap-1.5 mb-1">
                            <Sparkles
                              size={14}
                              className="text-[var(--color-500)]"
                            />
                            Acte réalisé
                          </span>
                          <p className="text-sm font-semibold text-slate-900">
                            {ct.acteRealise || "Acte de soin standard"}
                          </p>
                        </div>

                        {/* Motif & note */}
                        {(consultation?.motifDeConsultation ||
                          consultation?.note) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {consultation?.motifDeConsultation && (
                              <div className="p-3 rounded-xl border border-[var(--color-100)] bg-white">
                                <span className="font-medium text-[var(--color-700)] block mb-0.5">
                                  Motif de la séance
                                </span>
                                <span className="text-slate-800">
                                  {consultation.motifDeConsultation}
                                </span>
                              </div>
                            )}
                            {consultation?.note && (
                              <div className="p-3 rounded-xl border border-[var(--color-100)] bg-white">
                                <span className="font-medium text-[var(--color-700)] block mb-0.5">
                                  Observation / Note
                                </span>
                                <span className="text-slate-800 whitespace-pre-line">
                                  {consultation.note}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ordonnance */}
                        {ordItems.length > 0 && (
                          <div className="p-3 rounded-xl border border-[var(--color-200)] bg-white space-y-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-700)] flex items-center gap-1.5">
                              <Pill
                                size={14}
                                className="text-[var(--color-500)]"
                              />
                              Prescription délivrée ({ordItems.length})
                            </span>
                            <ul className="text-xs divide-y divide-[var(--color-100)]">
                              {ordItems.map((item, i) => (
                                <li
                                  key={i}
                                  className="py-1.5 flex items-center justify-between gap-2"
                                >
                                  <span className="font-medium text-slate-900">
                                    {item.medicament?.nom ||
                                      item.nom ||
                                      item.name}
                                  </span>
                                  <span className="text-gray-500 text-[11px] text-right">
                                    {[
                                      item.dosage,
                                      item.frequence || item.frequency,
                                      item.duree || item.duration,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Bilan */}
                        {bilanItems.length > 0 && (
                          <div className="p-3 rounded-xl border border-[var(--color-200)] bg-white space-y-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-700)] flex items-center gap-1.5">
                              <FlaskConical
                                size={14}
                                className="text-[var(--color-500)]"
                              />
                              Examens / Bilan demandés ({bilanItems.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {bilanItems.map((item, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-lg bg-[var(--color-50)] border border-[var(--color-200)] text-[var(--color-700)] text-xs font-medium"
                                >
                                  {item.bilan?.nom || item.nom || item.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Prochain RDV */}
                        {rdv && (
                          <div className="p-2.5 rounded-xl bg-[var(--color-50)] border border-[var(--color-200)] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar
                                size={14}
                                className="text-[var(--color-500)]"
                              />
                              <span className="font-semibold text-[var(--color-700)]">
                                Prochain RDV :
                              </span>
                              <span className="text-slate-700">
                                {fmtDate(rdv.date, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            {rdv.description && (
                              <span className="text-gray-500 italic text-[11px]">
                                {rdv.description}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}

              {/* Rendez-vous programmés */}
              {rendezVous.length > 0 && (
                <Card className="border-[var(--color-300)] shadow-md">
                  <CardHeader className="py-2.5 bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                    <CardTitle className="text-sm text-[var(--color-700)] flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Calendar
                          size={16}
                          className="text-[var(--color-500)]"
                        />
                        Rendez-vous programmés
                      </span>
                      <span className="text-xs bg-[var(--color-100)] text-[var(--color-700)] px-2 py-0.5 rounded-full">
                        {rendezVous.length}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2">
                    {rendezVous.map((rdv) => (
                      <div
                        key={rdv.id}
                        className="p-3 bg-white border border-[var(--color-100)] rounded-xl flex items-center gap-2.5 text-xs shadow-sm"
                      >
                        <Clock size={16} className="text-[var(--color-500)]" />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {fmtDate(rdv.date, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {rdv.description || rdv.note || "Séance de soin"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </TabsContent>

          {/* ---------- TAB 3 : VERSEMENTS ---------- */}
          <TabsContent
            value="versements"
            className="flex-1 overflow-y-auto px-4 pb-4 mt-0"
          >
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card className="mt-3 border-[var(--color-300)] shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                  <CardTitle className="text-[var(--color-700)] flex items-center gap-2">
                    <Receipt size={20} className="text-[var(--color-500)]" />
                    Historique des versements
                    <span className="text-xs bg-[var(--color-100)] text-[var(--color-700)] px-2 py-0.5 rounded-full">
                      {versements.length}
                    </span>
                  </CardTitle>
                  {canAddVersement && (
                    <Button
                      size="sm"
                      onClick={() => onAddVersement(currentTraitement)}
                      className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md inline-flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      Nouveau versement
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="pt-4">
                  {versements.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm">
                      <Receipt size={36} className="mb-3 opacity-30" />
                      <p className="font-medium">Aucun versement enregistré</p>
                      <p className="text-xs mt-1">
                        Les paiements de ce traitement apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <>
                      <ul className="space-y-2">
                        <AnimatePresence>
                          {versements.map((v) => (
                            <motion.li
                              key={v.id}
                              variants={itemVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                              className="flex items-center justify-between bg-white border border-[var(--color-100)] rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[var(--color-300)] transition-all duration-300"
                            >
                              <div>
                                <span className="font-bold text-emerald-700 text-sm">
                                  +{fmtMoney(v.montant)}
                                </span>
                                {v.note && (
                                  <span className="text-xs text-gray-600 ml-2">
                                    ({v.note})
                                  </span>
                                )}
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Le {fmtDate(v.date || v.createdAt)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                                  Encaissé
                                </span>
                                {onDeleteVersement && (
                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="hover:bg-red-100 transition rounded-full"
                                      onClick={() => onDeleteVersement(v.id)}
                                      title="Supprimer ce versement"
                                    >
                                      <Trash2
                                        size={16}
                                        className="text-red-500"
                                      />
                                    </Button>
                                  </motion.div>
                                )}
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>

                      <div className="mt-4 pt-3 border-t border-[var(--color-100)] flex items-center justify-between text-sm">
                        <span className="text-[var(--color-700)] font-medium">
                          Total encaissé
                        </span>
                        <span className="font-bold text-emerald-700">
                          {fmtMoney(paid)}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* ============ FOOTER ============ */}
        <div className="px-4 py-3 bg-gradient-to-r from-[var(--color-50)] to-white border-t border-[var(--color-200)] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--color-700)] hover:bg-[var(--color-50)]"
          >
            Fermer
          </Button>

          {currentTraitement.statut === "EN_COURS" && (
            <Button
              type="button"
              onClick={() => onContinue?.(currentTraitement)}
              className="bg-gradient-to-r from-[var(--color-600)] to-[var(--color-700)] hover:from-[var(--color-700)] hover:to-[var(--color-800)] shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2"
            >
              <ArrowRight size={16} />
              Continuer le traitement
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
