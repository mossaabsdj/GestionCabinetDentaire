"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Edit2,
  Trash2,
  DollarSign,
  TrendingDown,
  AlertCircle,
  FileText,
  X,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

export default function DepensesPage() {
  const [depenses, setDepenses] = useState([]);
  const [totalMontant, setTotalMontant] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("month"); // 'today', 'month', 'prev_month', 'year', 'all', 'custom'

  // Custom date range filter
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Modal State (Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState(null); // null if adding, object if editing
  const [formMontant, setFormMontant] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Fetch expenses from API
  const fetchDepenses = async () => {
    setLoading(true);
    try {
      let url = `/api/depenses?period=${period}`;
      if (period === "custom") {
        if (customStart) url += `&startDate=${customStart}`;
        if (customEnd) url += `&endDate=${customEnd}`;
      }
      if (searchQuery.trim()) {
        url += `&q=${encodeURIComponent(searchQuery.trim())}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Erreur de chargement des dépenses.");
      }

      const data = await res.json();
      setDepenses(data.depenses || []);
      setTotalMontant(data.totalMontant || 0);
      setCount(data.count || 0);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible de charger les dépenses.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepenses();
  }, [period, customStart, customEnd]);

  // Debounced or live search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDepenses();
  };

  // Open Modal for Create
  const handleOpenAdd = () => {
    setEditingDepense(null);
    setFormMontant("");
    setFormDescription("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormError("");
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (depense) => {
    setEditingDepense(depense);
    setFormMontant(depense.montant.toString());
    setFormDescription(depense.description || "");
    const dStr = depense.date
      ? new Date(depense.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setFormDate(dStr);
    setFormError("");
    setModalOpen(true);
  };

  // Handle Save (Create or Update)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setFormError("");

    const montantNum = parseFloat(formMontant);
    if (isNaN(montantNum) || montantNum <= 0) {
      setFormError("Le montant doit être un nombre supérieur à 0 DA.");
      return;
    }

    if (!formDescription.trim()) {
      setFormError("Veuillez renseigner une description ou un motif valide.");
      return;
    }

    if (!formDate) {
      setFormError("Veuillez sélectionner une date valide.");
      return;
    }

    setFormSubmitting(true);
    try {
      const isEdit = !!editingDepense;
      const url = "/api/depenses";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        montant: montantNum,
        description: formDescription.trim(),
        date: new Date(formDate).toISOString(),
        ...(isEdit ? { id: editingDepense.id } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de l'enregistrement.");
      }

      setModalOpen(false);
      Swal.fire({
        icon: "success",
        title: isEdit ? "Dépense modifiée" : "Dépense enregistrée",
        text: isEdit
          ? "La dépense a été mise à jour avec succès."
          : "La nouvelle dépense a été ajoutée avec succès.",
        timer: 2000,
        showConfirmButton: false,
      });

      // Refresh list immediately
      fetchDepenses();
    } catch (err) {
      console.error(err);
      setFormError(err.message || "Erreur lors de la sauvegarde.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete with Confirmation
  const handleDeleteExpense = async (id) => {
    const confirm = await Swal.fire({
      title: "Supprimer cette dépense ?",
      text: "Cette action est irréversible et modifiera le calcul des bénéfices.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/depenses?id=${id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de la suppression.");
      }

      Swal.fire({
        icon: "success",
        title: "Supprimé !",
        text: "La dépense a été supprimée avec succès.",
        timer: 1800,
        showConfirmButton: false,
      });

      // Refresh list immediately
      fetchDepenses();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible de supprimer la dépense.",
        confirmButtonColor: "#2563eb",
      });
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-50)] via-white to-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ======================================================== */}
        {/* HEADER */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-500 text-white shadow-md">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  Gestion des Dépenses
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Enregistrement et suivi des charges et dépenses du cabinet
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenAdd}
              className="rounded-xl bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white shadow-sm flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nouvelle dépense
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchDepenses}
              disabled={loading}
              className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600"
              title="Rafraîchir"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUMMARY CARDS */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Total des Dépenses
              </span>
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-700">
              {loading ? (
                <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${Number(totalMontant || 0).toLocaleString("fr-FR")} DA`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {period === "today" && "Dépenses d'aujourd'hui"}
              {period === "month" && "Dépenses de ce mois en cours"}
              {period === "prev_month" && "Dépenses du mois précédent"}
              {period === "year" && "Dépenses de l'année courante"}
              {period === "all" && "Total cumulé toutes dates confondues"}
              {period === "custom" && "Total de la période personnalisée"}
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nombre d'Opérations
              </span>
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800">
              {loading ? (
                <div className="h-8 w-16 bg-slate-100 animate-pulse rounded" />
              ) : (
                `${count} opération${count > 1 ? "s" : ""}`
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Charges comptabilisées sur la période
            </p>
          </Card>

          <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Moyenne par Dépense
              </span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">
              {loading ? (
                <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
              ) : count > 0 ? (
                `${Math.round(totalMontant / count).toLocaleString("fr-FR")} DA`
              ) : (
                "0 DA"
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Montant moyen par charge enregistrée
            </p>
          </Card>
        </div>

        {/* ======================================================== */}
        {/* FILTERS & SEARCH */}
        {/* ======================================================== */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Period tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => {
                  setPeriod("month");
                  setShowCustomDates(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "month"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Ce mois
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("prev_month");
                  setShowCustomDates(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "prev_month"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Mois précédent
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("today");
                  setShowCustomDates(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "today"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Aujourd'hui
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("year");
                  setShowCustomDates(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "year"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Cette année
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("all");
                  setShowCustomDates(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  period === "all"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                Toutes les dates
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod("custom");
                  setShowCustomDates(true);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                  period === "custom"
                    ? "bg-white text-slate-900 shadow-sm font-bold"
                    : "hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Période personnalisée
              </button>
            </div>

            {/* Search input */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Rechercher une description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 rounded-xl border-slate-200 text-xs focus:ring-1 focus:ring-[var(--color-500)]"
              />
            </form>
          </div>

          {/* Custom Date Pickers Drawer */}
          {showCustomDates && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Du :</span>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-auto text-xs py-1 h-8 rounded-lg border-slate-200"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Au :</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-auto text-xs py-1 h-8 rounded-lg border-slate-200"
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={fetchDepenses}
                className="h-8 rounded-lg text-xs"
              >
                Appliquer
              </Button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* EXPENSES TABLE */}
        {/* ======================================================== */}
        <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="w-[140px] text-xs font-bold text-slate-600 uppercase">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 uppercase">
                    Description / Motif
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-600 uppercase w-[180px]">
                    Montant (DA)
                  </TableHead>
                  <TableHead className="text-right text-xs font-bold text-slate-600 uppercase w-[120px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-20" /></TableCell>
                      <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-48" /></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-24 ml-auto" /></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : depenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center py-10">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <div className="p-3 bg-slate-50 rounded-full border border-slate-100">
                          <Receipt className="w-8 h-8 text-slate-300" />
                        </div>
                        <div className="text-sm font-semibold text-slate-600">
                          Aucune dépense trouvée
                        </div>
                        <p className="text-xs text-slate-400 max-w-xs">
                          {searchQuery
                            ? "Aucun résultat ne correspond à votre recherche."
                            : "Aucune dépense n'a été enregistrée pour cette période."}
                        </p>
                        <Button
                          size="sm"
                          onClick={handleOpenAdd}
                          className="mt-2 text-xs rounded-xl bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Ajouter une dépense
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  depenses.map((dep) => (
                    <TableRow
                      key={dep.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <TableCell className="text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{formatDateDisplay(dep.date)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-800">
                        {dep.description}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600 text-sm">
                        {Number(dep.montant).toLocaleString("fr-FR")} DA
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(dep)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Modifier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(dep.id)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer with Total */}
          {!loading && depenses.length > 0 && (
            <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-medium">
              <div>
                Affichage de <span className="font-bold text-slate-800">{depenses.length}</span> dépense(s)
              </div>
              <div className="flex items-center gap-2">
                <span>Total de la sélection :</span>
                <span className="text-sm font-extrabold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  {Number(totalMontant).toLocaleString("fr-FR")} DA
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ======================================================== */}
      {/* ADD / EDIT MODAL */}
      {/* ======================================================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                <Receipt className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-800">
                {editingDepense ? "Modifier la dépense" : "Nouvelle dépense"}
              </DialogTitle>
            </div>
            <p className="text-xs text-slate-500">
              {editingDepense
                ? "Modifiez les informations de la dépense enregistrée."
                : "Saisissez les détails de la dépense engagée pour le cabinet."}
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveExpense} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Montant */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Montant (en DA) <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="Ex: 5000"
                  value={formMontant}
                  onChange={(e) => setFormMontant(e.target.value)}
                  className="rounded-xl border-slate-200 text-sm pr-12 focus:ring-1 focus:ring-[var(--color-500)]"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  DA
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Description / Motif <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                required
                placeholder="Ex: Achat consommables dentaires, Facture électricité..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="rounded-xl border-slate-200 text-sm focus:ring-1 focus:ring-[var(--color-500)]"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Date de la dépense <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="rounded-xl border-slate-200 text-sm focus:ring-1 focus:ring-[var(--color-500)]"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={formSubmitting}
                className="rounded-xl text-xs border-slate-200"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={formSubmitting}
                className="rounded-xl text-xs bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white shadow font-semibold"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Enregistrement...
                  </>
                ) : editingDepense ? (
                  "Enregistrer les modifications"
                ) : (
                  "Ajouter la dépense"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

