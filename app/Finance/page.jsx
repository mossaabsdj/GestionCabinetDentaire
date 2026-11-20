"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  Receipt,
  TrendingDown,
  CreditCard,
  AlertCircle,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Search,
  User,
  ChevronRight,
  Wallet,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  FileText,
  X,
  PieChart,
  BarChart3,
  CalendarDays,
  Percent,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import Swal from "sweetalert2";

export default function FinanceDashboardPage() {
  // Navigation / Tabs state: 'finance' | 'statistiques'
  const [activeTab, setActiveTab] = useState("finance");

  // Date filter state: 'today' | 'week' | 'month' (default) | 'select_month' | 'all'
  const [period, setPeriod] = useState("month");

  // Month picker state (for 'select_month')
  const currentYearMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());

  // Data states
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search queries for lists
  const [versementsSearch, setVersementsSearch] = useState("");
  const [depensesSearch, setDepensesSearch] = useState("");

  // Profit breakdown modal state
  const [profitModalOpen, setProfitModalOpen] = useState(false);
  const [profitModalSearch, setProfitModalSearch] = useState("");

  // Versement Modal states (Add / Edit)
  const [versementModalOpen, setVersementModalOpen] = useState(false);
  const [editingVersement, setEditingVersement] = useState(null); // null if adding
  const [patientsList, setPatientsList] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [selectedTraitementId, setSelectedTraitementId] = useState("");
  const [versementMontant, setVersementMontant] = useState("");
  const [versementDate, setVersementDate] = useState("");
  const [versementNote, setVersementNote] = useState("");
  const [versementSubmitting, setVersementSubmitting] = useState(false);
  const [patientSearchInModal, setPatientSearchInModal] = useState("");

  // Depense Modal states (Add / Edit)
  const [depenseModalOpen, setDepenseModalOpen] = useState(false);
  const [editingDepense, setEditingDepense] = useState(null); // null if adding
  const [depenseMontant, setDepenseMontant] = useState("");
  const [depenseDescription, setDepenseDescription] = useState("");
  const [depenseDate, setDepenseDate] = useState("");
  const [depenseSubmitting, setDepenseSubmitting] = useState(false);

  // Helper to compute date range from current period
  const computeDateRange = () => {
    const now = new Date();
    if (period === "today") {
      const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      return {
        startDate: startStr,
        endDate: startStr,
        label: `Aujourd'hui (${now.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })})`,
      };
    }
    if (period === "week") {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

      const startStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      const endStr = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;

      return {
        startDate: startStr,
        endDate: endStr,
        label: `Cette semaine (${monday.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${sunday.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })})`,
      };
    }
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-01`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

      const monthName = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      return {
        startDate: startStr,
        endDate: endStr,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      };
    }
    if (period === "select_month") {
      const [yearStr, monthStr] = (selectedMonth || currentYearMonth()).split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10); // 1-12
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);

      const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
      const endStr = `${year}-${String(month).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;

      const monthName = start.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
      return {
        startDate: startStr,
        endDate: endStr,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      };
    }
    // "all"
    return {
      startDate: null,
      endDate: null,
      label: "Tout l'historique (Global)",
    };
  };

  const currentPeriodInfo = computeDateRange();

  // Fetch all finance statistics and lists for the selected period
  const fetchFinanceData = async () => {
    setLoading(true);
    setError("");
    try {
      const { startDate, endDate } = computeDateRange();
      let queryUrl = "/api/Stats/finance";
      const params = [];
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      if (params.length > 0) {
        queryUrl += `?${params.join("&")}`;
      }

      const res = await fetch(queryUrl);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Erreur de chargement des données financières");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors du calcul des statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [period, selectedMonth]);

  // Load patients list for add versement modal
  const fetchPatientsForModal = async () => {
    setLoadingPatients(true);
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        const list = await res.json();
        setPatientsList(list || []);
      }
    } catch (err) {
      console.error("Erreur chargement patients:", err);
    } finally {
      setLoadingPatients(false);
    }
  };

  // When patient is selected in versement modal, load patient's treatments
  const handlePatientSelectChange = async (patientId) => {
    setSelectedPatientId(patientId);
    setSelectedTraitementId("");
    setPatientTreatments([]);

    if (!patientId) return;

    try {
      const res = await fetch(`/api/patients?id=${patientId}`);
      if (res.ok) {
        const pData = await res.json();
        const treatmentsWithRemaining = (pData.traitements || []).filter(
          (t) => t.statut !== "ANNULE" && (t.resteAPayer === undefined || t.resteAPayer > 0)
        );
        setPatientTreatments(treatmentsWithRemaining);
      }
    } catch (err) {
      console.error("Erreur chargement soins patient:", err);
    }
  };

  // ========================================================
  // VERSEMENTS ACTIONS
  // ========================================================
  const handleOpenAddVersement = () => {
    setEditingVersement(null);
    setSelectedPatientId("");
    setSelectedTraitementId("");
    setPatientTreatments([]);
    setVersementMontant("");
    setVersementDate(new Date().toISOString().split("T")[0]);
    setVersementNote("");
    setPatientSearchInModal("");
    setVersementModalOpen(true);
    if (patientsList.length === 0) {
      fetchPatientsForModal();
    }
  };

  const handleOpenEditVersement = (v) => {
    setEditingVersement(v);
    setSelectedPatientId(String(v.patientId || ""));
    setVersementMontant(String(v.montant || ""));
    const dStr = v.date
      ? new Date(v.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setVersementDate(dStr);
    setVersementNote(v.note || "");
    setVersementModalOpen(true);
  };

  const handleSaveVersement = async (e) => {
    e.preventDefault();
    const parsedMontant = parseFloat(versementMontant);
    if (isNaN(parsedMontant) || parsedMontant <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Le montant du versement doit être supérieur à 0 DZD.",
        confirmButtonColor: "#059669",
      });
      return;
    }

    if (!editingVersement && !selectedPatientId) {
      Swal.fire({
        icon: "warning",
        title: "Patient obligatoire",
        text: "Veuillez sélectionner un patient.",
        confirmButtonColor: "#059669",
      });
      return;
    }

    setVersementSubmitting(true);
    try {
      if (editingVersement) {
        // Edit existing payment
        const res = await fetch("/api/versements", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingVersement.id,
            montant: parsedMontant,
            note: versementNote.trim() || null,
            date: versementDate ? new Date(versementDate).toISOString() : new Date().toISOString(),
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Erreur de modification du versement");

        Swal.fire({
          icon: "success",
          title: "Versement modifié",
          text: "Le versement a été mis à jour avec succès.",
          timer: 1800,
          showConfirmButton: false,
        });
      } else {
        // Create new payment
        const res = await fetch("/api/versements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId: Number(selectedPatientId),
            traitementId: selectedTraitementId ? Number(selectedTraitementId) : null,
            montant: parsedMontant,
            note: versementNote.trim() || null,
            date: versementDate ? new Date(versementDate).toISOString() : new Date().toISOString(),
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Erreur d'enregistrement du versement");

        Swal.fire({
          icon: "success",
          title: "Versement enregistré",
          text: "Le paiement a été encaissé avec succès.",
          timer: 1800,
          showConfirmButton: false,
        });
      }

      setVersementModalOpen(false);
      fetchFinanceData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible d'enregistrer le versement.",
        confirmButtonColor: "#059669",
      });
    } finally {
      setVersementSubmitting(false);
    }
  };

  const handleDeleteVersement = async (id) => {
    const confirm = await Swal.fire({
      title: "Supprimer ce versement ?",
      text: "Cette action est irréversible et recalculera la dette du patient et la trésorerie.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await fetch(`/api/versements?id=${id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur lors de la suppression");

      Swal.fire({
        icon: "success",
        title: "Supprimé !",
        text: "Le versement a été supprimé.",
        timer: 1600,
        showConfirmButton: false,
      });

      fetchFinanceData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible de supprimer le versement.",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // ========================================================
  // DEPENSES ACTIONS
  // ========================================================
  const handleOpenAddDepense = () => {
    setEditingDepense(null);
    setDepenseMontant("");
    setDepenseDescription("");
    setDepenseDate(new Date().toISOString().split("T")[0]);
    setDepenseModalOpen(true);
  };

  const handleOpenEditDepense = (d) => {
    setEditingDepense(d);
    setDepenseMontant(String(d.montant || ""));
    setDepenseDescription(d.description || "");
    const dStr = d.date
      ? new Date(d.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    setDepenseDate(dStr);
    setDepenseModalOpen(true);
  };

  const handleSaveDepense = async (e) => {
    e.preventDefault();
    const parsedMontant = parseFloat(depenseMontant);
    if (isNaN(parsedMontant) || parsedMontant <= 0) {
      Swal.fire({
        icon: "warning",
        title: "Montant invalide",
        text: "Le montant de la dépense doit être supérieur à 0 DZD.",
        confirmButtonColor: "#e11d48",
      });
      return;
    }

    if (!depenseDescription.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Description requise",
        text: "Veuillez indiquer un motif ou une description pour cette charge.",
        confirmButtonColor: "#e11d48",
      });
      return;
    }

    setDepenseSubmitting(true);
    try {
      const isEdit = !!editingDepense;
      const url = "/api/depenses";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        montant: parsedMontant,
        description: depenseDescription.trim(),
        date: depenseDate ? new Date(depenseDate).toISOString() : new Date().toISOString(),
        ...(isEdit ? { id: editingDepense.id } : {}),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur lors de l'enregistrement");

      Swal.fire({
        icon: "success",
        title: isEdit ? "Dépense modifiée" : "Dépense enregistrée",
        text: isEdit
          ? "La dépense a été mise à jour avec succès."
          : "La nouvelle dépense a été ajoutée avec succès.",
        timer: 1800,
        showConfirmButton: false,
      });

      setDepenseModalOpen(false);
      fetchFinanceData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible d'enregistrer la dépense.",
        confirmButtonColor: "#e11d48",
      });
    } finally {
      setDepenseSubmitting(false);
    }
  };

  const handleDeleteDepense = async (id) => {
    const confirm = await Swal.fire({
      title: "Supprimer cette dépense ?",
      text: "Cette action est irréversible et modifiera le résultat net du cabinet.",
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
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Erreur de suppression");

      Swal.fire({
        icon: "success",
        title: "Supprimée !",
        text: "La dépense a été supprimée.",
        timer: 1600,
        showConfirmButton: false,
      });

      fetchFinanceData();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err.message || "Impossible de supprimer la dépense.",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  // ========================================================
  // FILTERED LISTS FOR DISPLAY
  // ========================================================
  const rawPaiements = data?.periodPaiementsList || [];
  const rawDepenses = data?.periodDepensesList || [];

  const filteredPaiements = useMemo(() => {
    const q = versementsSearch.trim().toLowerCase();
    if (!q) return rawPaiements;
    return rawPaiements.filter((p) => {
      const patientMatch = (p.patientNom || "").toLowerCase().includes(q);
      const descMatch = (p.traitementDesc || "").toLowerCase().includes(q);
      const noteMatch = (p.note || "").toLowerCase().includes(q);
      const montantMatch = String(p.montant || "").includes(q);
      const dateMatch = p.date
        ? new Date(p.date).toLocaleDateString("fr-FR").toLowerCase().includes(q)
        : false;
      return patientMatch || descMatch || noteMatch || montantMatch || dateMatch;
    });
  }, [rawPaiements, versementsSearch]);

  const filteredDepenses = useMemo(() => {
    const q = depensesSearch.trim().toLowerCase();
    if (!q) return rawDepenses;
    return rawDepenses.filter((d) => {
      const descMatch = (d.description || "").toLowerCase().includes(q);
      const montantMatch = String(d.montant || "").includes(q);
      const dateMatch = d.date
        ? new Date(d.date).toLocaleDateString("fr-FR").toLowerCase().includes(q)
        : false;
      return descMatch || montantMatch || dateMatch;
    });
  }, [rawDepenses, depensesSearch]);

  // Modal breakdown lists
  const modalFilteredPaiements = useMemo(() => {
    const q = profitModalSearch.trim().toLowerCase();
    if (!q) return rawPaiements;
    return rawPaiements.filter(
      (p) =>
        (p.patientNom || "").toLowerCase().includes(q) ||
        (p.traitementDesc || "").toLowerCase().includes(q) ||
        (p.note || "").toLowerCase().includes(q)
    );
  }, [rawPaiements, profitModalSearch]);

  const modalFilteredDepenses = useMemo(() => {
    const q = profitModalSearch.trim().toLowerCase();
    if (!q) return rawDepenses;
    return rawDepenses.filter((d) =>
      (d.description || "").toLowerCase().includes(q)
    );
  }, [rawDepenses, profitModalSearch]);

  // Totals for current filtered display
  const displayedPaiementsTotal = useMemo(
    () => filteredPaiements.reduce((sum, p) => sum + (Number(p.montant) || 0), 0),
    [filteredPaiements]
  );
  const displayedDepensesTotal = useMemo(
    () => filteredDepenses.reduce((sum, d) => sum + (Number(d.montant) || 0), 0),
    [filteredDepenses]
  );

  // Filtered patients for dropdown in modal
  const modalFilteredPatients = useMemo(() => {
    if (!patientSearchInModal.trim()) return patientsList;
    const q = patientSearchInModal.toLowerCase();
    return patientsList.filter(
      (pt) =>
        pt.nom?.toLowerCase().includes(q) ||
        pt.telephone?.toLowerCase().includes(q)
    );
  }, [patientsList, patientSearchInModal]);

  // Key KPI values
  const totalEncaissePeriod = Number(data?.totalEncaisse || 0);
  const totalDepensesPeriod = Number(data?.totalDepenses || 0);
  const beneficeNetPeriod = Number(
    data?.periodBenefice !== undefined
      ? data.periodBenefice
      : totalEncaissePeriod - totalDepensesPeriod
  );
  const totalFacturePeriod = Number(data?.totalBilled || 0);
  const resteARecouvrerGlobal = Number(data?.resteARecouvrer || 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-50)] via-white to-slate-50 p-3 sm:p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ======================================================== */}
        {/* TOP HEADER: TITLE & TAB SWITCHER */}
        {/* ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[var(--color-600)] to-[var(--color-500)] text-white shadow-md flex-shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  Finances & Trésorerie
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-medium">
                  Suivi des encaissements patients, des dépenses et de la rentabilité du cabinet
                </p>
              </div>
            </div>
          </div>

          {/* TABS SELECTOR & REFRESH */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("finance")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === "finance"
                    ? "bg-white text-[var(--color-700)] shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Finance & Trésorerie</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("statistiques")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === "statistiques"
                    ? "bg-white text-[var(--color-700)] shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Statistiques</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinanceData}
              disabled={loading}
              className="rounded-xl border-slate-200 hover:bg-slate-50 h-9 px-3"
              title="Actualiser les données"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-600 ${loading ? "animate-spin text-[var(--color-600)]" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DATE FILTERS BAR (Consistent across tabs & tables) */}
        {/* ======================================================== */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Période :
            </span>

            {/* Ce jour */}
            <button
              type="button"
              onClick={() => setPeriod("today")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "today"
                  ? "bg-[var(--color-600)] text-white shadow-sm font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Ce jour
            </button>

            {/* cette mois (default) */}
            <button
              type="button"
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "month"
                  ? "bg-[var(--color-600)] text-white shadow-sm font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Ce mois
            </button>

            {/* Cette semaine */}
            <button
              type="button"
              onClick={() => setPeriod("week")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "week"
                  ? "bg-[var(--color-600)] text-white shadow-sm font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Cette semaine
            </button>

            {/* Sélectionner un mois */}
            <div className="relative inline-flex items-center">
              <button
                type="button"
                onClick={() => setPeriod("select_month")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  period === "select_month"
                    ? "bg-[var(--color-600)] text-white shadow-sm font-bold"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Sélectionner un mois</span>
              </button>
            </div>

            {/* Tout */}
            <button
              type="button"
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "all"
                  ? "bg-[var(--color-600)] text-white shadow-sm font-bold"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              Tout
            </button>
          </div>

          {/* Month selector input if 'select_month' is active OR display active period badge */}
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
            {period === "select_month" && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                <span className="text-[11px] text-slate-500 font-medium">Mois :</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 border-none outline-none focus:ring-0 cursor-pointer"
                />
              </div>
            )}

            <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 font-medium text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentPeriodInfo.label}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================================== */}
        {/* TOP SUMMARY STATS CARDS (Always visible on main page)     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Card 1: Total Facturé */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Facturé
                </span>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {loading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
                ) : (
                  `${totalFacturePeriod.toLocaleString("fr-FR")} DZD`
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Montant des soins engagés
            </p>
          </motion.div>

          {/* Card 2: Total Encaissé */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.04 }}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Total Encaissé
                </span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                {loading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
                ) : (
                  `+${totalEncaissePeriod.toLocaleString("fr-FR")} DZD`
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {data?.periodPaiementsCount || 0} versement(s) sur la période
            </p>
          </motion.div>

          {/* Card 3: Total Dépenses */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-rose-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                  Total Dépenses
                </span>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-rose-700">
                {loading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
                ) : (
                  `-${totalDepensesPeriod.toLocaleString("fr-FR")} DZD`
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {data?.periodDepensesCount || 0} charge(s) du cabinet
            </p>
          </motion.div>

          {/* Card 4: Bénéfice Net (Clickable Modal) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.12 }}
            onClick={() => setProfitModalOpen(true)}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-300 shadow-sm hover:shadow-md hover:border-emerald-400 hover:ring-2 hover:ring-emerald-200/50 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  Bénéfice Net
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                      beneficeNetPeriod >= 0
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {beneficeNetPeriod >= 0 ? "Positif" : "Déficit"}
                  </span>
                </span>
                <div className="p-2 rounded-xl bg-emerald-600 text-white group-hover:scale-105 transition-transform shadow-xs">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`text-xl sm:text-2xl font-extrabold ${
                  beneficeNetPeriod >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {loading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
                ) : (
                  `${beneficeNetPeriod.toLocaleString("fr-FR")} DZD`
                )}
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-emerald-700 font-semibold transition-colors">
              <span>Voir le détail</span>
              <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </motion.div>

          {/* Card 5: Reste à Recouvrer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.16 }}
            className="p-4 sm:p-5 rounded-2xl bg-white border border-amber-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Reste à Recouvrer
                </span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-800">
                {loading ? (
                  <div className="h-7 w-28 bg-slate-100 animate-pulse rounded" />
                ) : (
                  `${resteARecouvrerGlobal.toLocaleString("fr-FR")} DZD`
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Crédits patients globaux en attente
            </p>
          </motion.div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: FINANCE & TRÉSORERIE (SIDE-BY-SIDE COLUMNS)       */}
        {/* ======================================================== */}
        {activeTab === "finance" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ---------------------------------------------------- */}
            {/* LEFT COLUMN: VERSEMENTS (PATIENT PAYMENTS)           */}
            {/* ---------------------------------------------------- */}
            <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        Versements & Encaissements
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                          {filteredPaiements.length}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total affiché :{" "}
                        <span className="font-bold text-emerald-700">
                          +{displayedPaiementsTotal.toLocaleString("fr-FR")} DZD
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Add Versement Button */}
                  <Button
                    onClick={handleOpenAddVersement}
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Nouveau versement
                  </Button>
                </div>

                {/* Search bar */}
                <div className="relative mt-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filtrer par patient, traitement, note ou montant..."
                    value={versementsSearch}
                    onChange={(e) => setVersementsSearch(e.target.value)}
                    className="pl-9 pr-8 text-xs h-9 rounded-xl border-slate-200 bg-white"
                  />
                  {versementsSearch && (
                    <button
                      type="button"
                      onClick={() => setVersementsSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>

              {/* Scrollable Table Container */}
              <div className="relative flex flex-col h-[520px]">
                <div className="overflow-y-auto overflow-x-auto flex-1 scroll-smooth">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-xs">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold text-slate-600 uppercase py-2.5 w-[95px]">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 uppercase py-2.5">
                          Patient & Acte
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 uppercase py-2.5 w-[120px]">
                          Montant
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 uppercase py-2.5 w-[75px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-16" /></TableCell>
                            <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-36" /></TableCell>
                            <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-12 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredPaiements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-80 text-center py-10">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                              <div className="p-3 bg-emerald-50 rounded-full border border-emerald-100">
                                <DollarSign className="w-7 h-7 text-emerald-400" />
                              </div>
                              <div className="text-sm font-semibold text-slate-700">
                                Aucun versement trouvé
                              </div>
                              <p className="text-xs text-slate-400 max-w-xs">
                                {versementsSearch
                                  ? "Aucun résultat ne correspond à votre filtre de recherche."
                                  : "Aucun versement n'a été enregistré pour cette période."}
                              </p>
                              <Button
                                size="sm"
                                onClick={handleOpenAddVersement}
                                className="mt-2 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Encaisser un versement
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPaiements.map((pmt) => (
                          <TableRow
                            key={pmt.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <TableCell className="text-xs font-medium text-slate-600 align-top py-3">
                              {pmt.date
                                ? new Date(pmt.date).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })
                                : "—"}
                            </TableCell>

                            <TableCell className="align-top py-3">
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <span>{pmt.patientNom}</span>
                                  {pmt.patientTelephone && (
                                    <span className="text-[10px] text-slate-400 font-normal">
                                      · {pmt.patientTelephone}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1">
                                  {pmt.traitementDesc && (
                                    <span className="text-slate-600 font-medium truncate max-w-[170px]">
                                      {pmt.traitementDesc}
                                    </span>
                                  )}
                                  {pmt.dent && (
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                      D{pmt.dent}
                                    </span>
                                  )}
                                </div>
                                {pmt.note && (
                                  <div className="text-[10px] text-slate-400 italic line-clamp-1">
                                    {pmt.note}
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right align-top py-3">
                              <span className="text-xs font-extrabold text-emerald-700 whitespace-nowrap">
                                +{Number(pmt.montant).toLocaleString("fr-FR")} DZD
                              </span>
                            </TableCell>

                            <TableCell className="text-right align-top py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditVersement(pmt)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteVersement(pmt.id)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
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

                {/* Pinned Card Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium shrink-0">
                  <span>
                    Affichage : <strong className="text-slate-800">{filteredPaiements.length}</strong> versement(s)
                  </span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    +{displayedPaiementsTotal.toLocaleString("fr-FR")} DZD
                  </span>
                </div>
              </div>
            </Card>

            {/* ---------------------------------------------------- */}
            {/* RIGHT COLUMN: DÉPENSES (EXPENSES)                    */}
            {/* ---------------------------------------------------- */}
            <Card className="rounded-2xl border-slate-200/90 shadow-sm bg-white overflow-hidden flex flex-col">
              <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-gradient-to-r from-rose-50/70 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        Dépenses & Charges
                        <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                          {filteredDepenses.length}
                        </span>
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Total affiché :{" "}
                        <span className="font-bold text-rose-700">
                          -{displayedDepensesTotal.toLocaleString("fr-FR")} DZD
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Add Depense Button */}
                  <Button
                    onClick={handleOpenAddDepense}
                    size="sm"
                    className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle dépense
                  </Button>
                </div>

                {/* Search bar */}
                <div className="relative mt-3">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Filtrer par motif, description ou montant..."
                    value={depensesSearch}
                    onChange={(e) => setDepensesSearch(e.target.value)}
                    className="pl-9 pr-8 text-xs h-9 rounded-xl border-slate-200 bg-white"
                  />
                  {depensesSearch && (
                    <button
                      type="button"
                      onClick={() => setDepensesSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </CardHeader>

              {/* Scrollable Table Container */}
              <div className="relative flex flex-col h-[520px]">
                <div className="overflow-y-auto overflow-x-auto flex-1 scroll-smooth">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-xs">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-bold text-slate-600 uppercase py-2.5 w-[95px]">
                          Date
                        </TableHead>
                        <TableHead className="text-xs font-bold text-slate-600 uppercase py-2.5">
                          Description / Motif
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 uppercase py-2.5 w-[120px]">
                          Montant
                        </TableHead>
                        <TableHead className="text-right text-xs font-bold text-slate-600 uppercase py-2.5 w-[75px]">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-16" /></TableCell>
                            <TableCell><div className="h-4 bg-slate-100 animate-pulse rounded w-36" /></TableCell>
                            <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-20 ml-auto" /></TableCell>
                            <TableCell className="text-right"><div className="h-4 bg-slate-100 animate-pulse rounded w-12 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : filteredDepenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-80 text-center py-10">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                              <div className="p-3 bg-rose-50 rounded-full border border-rose-100">
                                <Receipt className="w-7 h-7 text-rose-400" />
                              </div>
                              <div className="text-sm font-semibold text-slate-700">
                                Aucune dépense trouvée
                              </div>
                              <p className="text-xs text-slate-400 max-w-xs">
                                {depensesSearch
                                  ? "Aucune dépense ne correspond à votre filtre de recherche."
                                  : "Aucune charge enregistrée pour cette période."}
                              </p>
                              <Button
                                size="sm"
                                onClick={handleOpenAddDepense}
                                className="mt-2 text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Ajouter une charge
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDepenses.map((dep) => (
                          <TableRow
                            key={dep.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <TableCell className="text-xs font-medium text-slate-600 align-top py-3">
                              {dep.date
                                ? new Date(dep.date).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })
                                : "—"}
                            </TableCell>

                            <TableCell className="align-top py-3">
                              <div className="text-xs font-bold text-slate-800 line-clamp-2">
                                {dep.description}
                              </div>
                            </TableCell>

                            <TableCell className="text-right align-top py-3">
                              <span className="text-xs font-extrabold text-rose-700 whitespace-nowrap">
                                -{Number(dep.montant).toLocaleString("fr-FR")} DZD
                              </span>
                            </TableCell>

                            <TableCell className="text-right align-top py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleOpenEditDepense(dep)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDepense(dep.id)}
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
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

                {/* Pinned Card Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium shrink-0">
                  <span>
                    Affichage : <strong className="text-slate-800">{filteredDepenses.length}</strong> dépense(s)
                  </span>
                  <span className="font-extrabold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    -{displayedDepensesTotal.toLocaleString("fr-FR")} DZD
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: STATISTIQUES (CHARTS & DETAILED INDICATORS)       */}
        {/* ======================================================== */}
        {activeTab === "statistiques" && (
          <div className="space-y-6">
            {/* Section 1: Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Évolution mensuelle des encaissements & charges */}
              <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Évolution Mensuelle : Encaissements vs Charges
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tendance de la trésorerie sur les 6 derniers mois
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                        Encaissements
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-rose-700">
                        <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                        Dépenses
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-2">
                  <div className="h-72 w-full">
                    {loading ? (
                      <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl" />
                    ) : (data?.activitePaiements || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={data.activitePaiements}
                          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorRevenuStats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.7} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDepenseStats" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.6} />
                              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          />
                          <Tooltip
                            formatter={(val, name) => [
                              `${Number(val).toLocaleString("fr-FR")} DZD`,
                              name === "montant" ? "Encaissements" : "Dépenses",
                            ]}
                            contentStyle={{
                              borderRadius: "12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                              border: "none",
                              fontSize: "12px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="montant"
                            name="montant"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#colorRevenuStats)"
                          />
                          <Area
                            type="monotone"
                            dataKey="depenses"
                            name="depenses"
                            stroke="#e11d48"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorDepenseStats)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Aucune donnée d'évolution disponible.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chart 2: Top Soins Dentaires par CA */}
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between bg-white">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Top Actes par Chiffre d'Affaires
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prestations générant le plus de revenus
                  </p>
                </CardHeader>

                <CardContent className="pt-4 space-y-3.5 flex-1 overflow-y-auto max-h-[300px]">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-10 bg-slate-50 animate-pulse rounded-xl" />
                    ))
                  ) : (data?.topTraitements || []).length > 0 ? (
                    data.topTraitements.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                            {item.description}
                          </span>
                          <span className="font-bold text-slate-800">
                            {Number(item.revenuTotal).toLocaleString("fr-FR")} DZD
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{item.count} séance(s) réalisée(s)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (item.revenuTotal /
                                    (data.topTraitements[0]?.revenuTotal || 1)) *
                                    100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-10">
                      Aucun soin enregistré pour le moment.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Tables Row (Top Débiteurs & Flux récents) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Table 1: Crédits Patients à Recouvrer (Top Débiteurs) */}
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    Crédits Patients à Recouvrer (Top Débiteurs)
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Patients avec le solde débiteur le plus important
                  </p>
                </CardHeader>

                <div className="overflow-y-auto max-h-[360px] divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                      </div>
                    ))
                  ) : (data?.patientsDebiteurs || []).length > 0 ? (
                    data.patientsDebiteurs.map((deb) => (
                      <div
                        key={deb.patientId}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-800">
                              {deb.nom}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Total soins : {Number(deb.totalDu).toLocaleString("fr-FR")} DZD · Payé :{" "}
                              {Number(deb.totalPaye).toLocaleString("fr-FR")} DZD
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800">
                            {Number(deb.reste).toLocaleString("fr-FR")} DZD
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      🎉 Aucun crédit impayé ! Tous les patients sont à jour.
                    </div>
                  )}
                </div>
              </Card>

              {/* Table 2: Flux des Récents Versements */}
              <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden bg-white flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Derniers Versements Encaissés
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Historique chronologique des encaissements récents
                  </p>
                </CardHeader>

                <div className="overflow-y-auto max-h-[360px] divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-4 flex items-center justify-between animate-pulse">
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                      </div>
                    ))
                  ) : (data?.recentVersements || []).length > 0 ? (
                    data.recentVersements.map((pmt) => (
                      <div
                        key={pmt.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-slate-800">
                              {pmt.patientNom}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <span>{pmt.traitementDesc}</span>
                              {pmt.dent && (
                                <span className="bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                                  Dent {pmt.dent}
                                </span>
                              )}
                              <span>·</span>
                              <span>
                                {pmt.date ? new Date(pmt.date).toLocaleDateString("fr-FR") : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700">
                            +{Number(pmt.montant).toLocaleString("fr-FR")} DZD
                          </span>
                          {pmt.note && (
                            <div className="text-[10px] text-slate-400 max-w-[130px] truncate">
                              {pmt.note}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Aucun versement récent enregistré.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Section 3: Indicateurs & Rentabilité */}
            <Card className="rounded-2xl border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    Synthèse de Rentabilité — {currentPeriodInfo.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Calcul instantané du bénéfice net d'exploitation selon la période filtrée
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-emerald-700 font-bold shadow-xs">
                    Revenus : +{totalEncaissePeriod.toLocaleString("fr-FR")} DZD
                  </div>
                  <span className="text-slate-400 font-bold">−</span>
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-rose-700 font-bold shadow-xs">
                    Dépenses : -{totalDepensesPeriod.toLocaleString("fr-FR")} DZD
                  </div>
                  <span className="text-slate-400 font-bold">=</span>
                  <div
                    className={`px-3.5 py-1.5 rounded-xl font-black text-white shadow-sm ${
                      beneficeNetPeriod >= 0
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600"
                        : "bg-gradient-to-r from-rose-600 to-red-600"
                    }`}
                  >
                    Bénéfice Net : {beneficeNetPeriod.toLocaleString("fr-FR")} DZD
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL 1: DÉTAIL DU BÉNÉFICE NET                          */}
        {/* ======================================================== */}
        <Dialog open={profitModalOpen} onOpenChange={setProfitModalOpen}>
          <DialogContent className="w-[96vw] max-w-5xl sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 shadow-2xl">
            <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <Wallet className="w-5 h-5" />
                    </span>
                    Détail du Bénéfice Net — {currentPeriodInfo.label}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-1">
                    Récapitulatif des encaissements perçus et des charges d'exploitation
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-full lg:w-64">
                    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Filtrer ce détail..."
                      value={profitModalSearch}
                      onChange={(e) => setProfitModalSearch(e.target.value)}
                      className="h-9 text-xs pr-9 bg-white border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Summary 3 Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Revenus Encaissés
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {rawPaiements.length} versement(s)
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1.5">
                    +{totalEncaissePeriod.toLocaleString("fr-FR")} DZD
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span className="flex items-center gap-1.5 text-rose-700">
                      <TrendingDown className="w-3.5 h-3.5" />
                      Dépenses du Cabinet
                    </span>
                    <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                      {rawDepenses.length} dépense(s)
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-rose-700 mt-1.5">
                    -{totalDepensesPeriod.toLocaleString("fr-FR")} DZD
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl shadow-xs text-white ${
                    beneficeNetPeriod >= 0
                      ? "bg-gradient-to-br from-emerald-600 to-teal-700"
                      : "bg-gradient-to-br from-rose-600 to-red-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                    <span>Bénéfice Net</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                      {beneficeNetPeriod >= 0 ? "Bénéficiaire" : "Déficit"}
                    </span>
                  </div>
                  <div className="text-lg font-black mt-1.5">
                    {beneficeNetPeriod.toLocaleString("fr-FR")} DZD
                  </div>
                </div>
              </div>
            </DialogHeader>

            {/* Modal Body: Two columns of items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Versements list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="py-2.5 px-3 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      Versements reçus ({modalFilteredPaiements.length})
                    </span>
                    <span>+{totalEncaissePeriod.toLocaleString("fr-FR")} DZD</span>
                  </div>
                  <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto p-2 space-y-1">
                    {modalFilteredPaiements.length > 0 ? (
                      modalFilteredPaiements.map((pmt) => (
                        <li
                          key={pmt.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{pmt.patientNom}</div>
                            <div className="text-[11px] text-slate-400">
                              {pmt.traitementDesc || "Versement libre"}{" "}
                              {pmt.date && `· ${new Date(pmt.date).toLocaleDateString("fr-FR")}`}
                            </div>
                          </div>
                          <div className="font-bold text-emerald-700">
                            +{Number(pmt.montant).toLocaleString("fr-FR")} DZD
                          </div>
                        </li>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Aucun versement trouvé
                      </div>
                    )}
                  </ul>
                </div>

                {/* Right: Dépenses list */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="py-2.5 px-3 bg-rose-50/70 border-b border-rose-100 flex items-center justify-between text-xs font-bold text-rose-800">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-rose-600" />
                      Dépenses du cabinet ({modalFilteredDepenses.length})
                    </span>
                    <span>-{totalDepensesPeriod.toLocaleString("fr-FR")} DZD</span>
                  </div>
                  <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto p-2 space-y-1">
                    {modalFilteredDepenses.length > 0 ? (
                      modalFilteredDepenses.map((dep) => (
                        <li
                          key={dep.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-xs"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">{dep.description}</div>
                            <div className="text-[11px] text-slate-400">
                              {dep.date && new Date(dep.date).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                          <div className="font-bold text-rose-700">
                            -{Number(dep.montant).toLocaleString("fr-FR")} DZD
                          </div>
                        </li>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400">
                        Aucune dépense trouvée
                      </div>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProfitModalOpen(false)}
                className="rounded-xl text-xs border-slate-300 text-slate-700"
              >
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 2: AJOUTER / MODIFIER UN VERSEMENT                 */}
        {/* ======================================================== */}
        <Dialog open={versementModalOpen} onOpenChange={setVersementModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-xl">
            <DialogHeader>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg font-bold text-slate-800">
                  {editingVersement ? "Modifier le versement" : "Encaisser un versement"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                {editingVersement
                  ? "Modifiez les informations du versement sélectionné."
                  : "Enregistrez un encaissement patient et affectez-le à un soin."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveVersement} className="space-y-4 pt-2">
              {/* Patient selection (only when adding) */}
              {!editingVersement && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Patient <span className="text-red-500">*</span>
                  </Label>
                  <div className="space-y-1.5">
                    <Input
                      type="text"
                      placeholder="Rechercher un patient par nom ou tél..."
                      value={patientSearchInModal}
                      onChange={(e) => setPatientSearchInModal(e.target.value)}
                      className="text-xs h-8 rounded-lg border-slate-200"
                    />
                    <select
                      value={selectedPatientId}
                      onChange={(e) => handlePatientSelectChange(e.target.value)}
                      required
                      className="w-full text-xs h-9 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Sélectionner un patient...</option>
                      {modalFilteredPatients.map((pt) => (
                        <option key={pt.id} value={pt.id}>
                          {pt.nom} {pt.telephone ? `(${pt.telephone})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Treatment selection (when adding and patient chosen) */}
              {!editingVersement && selectedPatientId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Soin / Traitement associé (Optionnel)
                  </Label>
                  <select
                    value={selectedTraitementId}
                    onChange={(e) => setSelectedTraitementId(e.target.value)}
                    className="w-full text-xs h-9 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Versement libre (sans affectation)</option>
                    {patientTreatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description || "Traitement"} {t.dent ? `(Dent ${t.dent})` : ""} — Reste :{" "}
                        {Number(t.resteAPayer || 0).toLocaleString("fr-FR")} DZD
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Montant */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Montant encaissé (DZD) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="Ex: 5000"
                    value={versementMontant}
                    onChange={(e) => setVersementMontant(e.target.value)}
                    className="rounded-xl border-slate-200 text-sm pr-12 focus:ring-1 focus:ring-emerald-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    DZD
                  </span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Date de versement <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  required
                  value={versementDate}
                  onChange={(e) => setVersementDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Observation / Note (Optionnel)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: Espèces, Virement, Acompte..."
                  value={versementNote}
                  onChange={(e) => setVersementNote(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVersementModalOpen(false)}
                  disabled={versementSubmitting}
                  className="rounded-xl text-xs border-slate-200"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={versementSubmitting}
                  className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow font-semibold"
                >
                  {versementSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Enregistrement...
                    </>
                  ) : editingVersement ? (
                    "Modifier le versement"
                  ) : (
                    "Encaisser"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ======================================================== */}
        {/* MODAL 3: AJOUTER / MODIFIER UNE DÉPENSE                  */}
        {/* ======================================================== */}
        <Dialog open={depenseModalOpen} onOpenChange={setDepenseModalOpen}>
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
              <DialogDescription className="text-xs text-slate-500">
                {editingDepense
                  ? "Modifiez les informations de la charge enregistrée."
                  : "Saisissez les détails de la dépense engagée pour le cabinet."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveDepense} className="space-y-4 pt-2">
              {/* Montant */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Montant (DZD) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min="1"
                    required
                    placeholder="Ex: 8500"
                    value={depenseMontant}
                    onChange={(e) => setDepenseMontant(e.target.value)}
                    className="rounded-xl border-slate-200 text-sm pr-12 focus:ring-1 focus:ring-rose-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    DZD
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
                  placeholder="Ex: Consommables dentaires, Prothésiste, Loyer..."
                  value={depenseDescription}
                  onChange={(e) => setDepenseDescription(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs focus:ring-1 focus:ring-rose-500"
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
                  value={depenseDate}
                  onChange={(e) => setDepenseDate(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDepenseModalOpen(false)}
                  disabled={depenseSubmitting}
                  className="rounded-xl text-xs border-slate-200"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={depenseSubmitting}
                  className="rounded-xl text-xs bg-rose-600 hover:bg-rose-700 text-white shadow font-semibold"
                >
                  {depenseSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Enregistrement...
                    </>
                  ) : editingDepense ? (
                    "Modifier la dépense"
                  ) : (
                    "Ajouter la dépense"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
