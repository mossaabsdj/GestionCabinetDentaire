"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Calendar,
  Clock,
  Activity,
  Droplets,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  Syringe,
  X,
  CheckCircle,
  Search,
  ExternalLink,
  Save,
  Edit3,
  Image as ImageIcon,
} from "lucide-react";
import { calculateAge } from "@/lib/age";
import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";

// ==========================================
// Helper Utilities
// ==========================================

function formatDateDisplay(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTimeDisplay(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForInput(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

const BLOOD_GROUPS = [
  { value: "A_POS", label: "A+" },
  { value: "A_NEG", label: "A-" },
  { value: "B_POS", label: "B+" },
  { value: "B_NEG", label: "B-" },
  { value: "AB_POS", label: "AB+" },
  { value: "AB_NEG", label: "AB-" },
  { value: "O_POS", label: "O+" },
  { value: "O_NEG", label: "O-" },
];

function getBloodGroupLabel(bg) {
  if (!bg) return "-";
  const found = BLOOD_GROUPS.find((g) => g.value === bg);
  return found ? found.label : bg.replace("_", " ");
}

// ==========================================
// Main PatientModal Component
// ==========================================

export default function PatientModal({ open, onClose, patient = {} }) {
  const [fullPatient, setFullPatient] = useState(patient);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [basePath, setBasePath] = useState("");

  // Search filters per tab
  const [searchVisites, setSearchVisites] = useState("");
  const [searchVaccines, setSearchVaccines] = useState("");
  const [searchPrescriptions, setSearchPrescriptions] = useState("");
  const [docFilter, setDocFilter] = useState("all"); // 'all' | 'bilans' | 'radios'

  // Form Data for Tab 1 (Informations & Coordonnées)
  const [formData, setFormData] = useState({
    id: patient?.id || "",
    nom: patient?.nom || "",
    sexe: patient?.sexe || "",
    telephone: patient?.telephone || "",
    adresse: patient?.adresse || "",
    groupeSanguin: patient?.groupeSanguin || "",
    dateDeNaissance: patient?.dateDeNaissance
      ? formatDateForInput(patient.dateDeNaissance)
      : "",
    antecedents: patient?.antecedents || "",
  });

  // Get Electron base path for file opening if running in desktop shell
  useEffect(() => {
    if (typeof window !== "undefined" && window?.electron?.getAppPath) {
      window.electron
        .getAppPath()
        .then((path) => setBasePath(path))
        .catch(() => setBasePath(""));
    }
  }, []);

  // Sync state when patient prop changes or modal opens
  useEffect(() => {
    if (patient && patient.id) {
      setFullPatient(patient);
      setIsEditingInfo(false);
      setFormData({
        id: patient.id,
        nom: patient.nom || "",
        sexe: patient.sexe || "",
        telephone: patient.telephone || "",
        adresse: patient.adresse || "",
        groupeSanguin: patient.groupeSanguin || "",
        dateDeNaissance: patient.dateDeNaissance
          ? formatDateForInput(patient.dateDeNaissance)
          : "",
        antecedents: patient.antecedents || "",
      });
      fetchFullPatientDetails(patient.id);
    }
  }, [patient?.id, open]);

  // Fetch complete patient dossier including all relations
  async function fetchFullPatientDetails(id) {
    if (!id) return;
    try {
      setLoadingDetails(true);
      const res = await fetch(`/api/patients?id=${id}`);
      if (!res.ok) throw new Error("Erreur de chargement du patient");
      const data = await res.json();
      setFullPatient(data);
      setFormData({
        id: data.id,
        nom: data.nom || "",
        sexe: data.sexe || "",
        telephone: data.telephone || "",
        adresse: data.adresse || "",
        groupeSanguin: data.groupeSanguin || "",
        dateDeNaissance: data.dateDeNaissance
          ? formatDateForInput(data.dateDeNaissance)
          : "",
        antecedents: data.antecedents || "",
      });
    } catch (err) {
      console.error("❌ fetchFullPatientDetails error:", err);
    } finally {
      setLoadingDetails(false);
    }
  }

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancelInfo = () => {
    setIsEditingInfo(false);
    setErrorMessage("");
    setFormData({
      id: fullPatient.id,
      nom: fullPatient.nom || "",
      sexe: fullPatient.sexe || "",
      telephone: fullPatient.telephone || "",
      adresse: fullPatient.adresse || "",
      groupeSanguin: fullPatient.groupeSanguin || "",
      dateDeNaissance: fullPatient.dateDeNaissance
        ? formatDateForInput(fullPatient.dateDeNaissance)
        : "",
      antecedents: fullPatient.antecedents || "",
    });
  };

  // Save changes to patient profile (from Tab 1)
  const handleSaveInfo = async (e) => {
    if (e) e.preventDefault();
    if (!formData.nom || formData.nom.trim() === "") {
      setErrorMessage("Le nom complet est obligatoire.");
      return;
    }

    setSaveLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/patients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dateDeNaissance: formData.dateDeNaissance || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Échec de l'enregistrement");
      }

      const updated = await response.json();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setIsEditingInfo(false);
      await fetchFullPatientDetails(updated.id);
    } catch (err) {
      console.error("❌ handleSaveInfo error:", err);
      setErrorMessage(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaveLoading(false);
    }
  };

  // Open file helper (compatible Electron shell & web browser)
  const handleOpenFile = (fileName) => {
    if (!fileName) return;
    if (typeof window !== "undefined" && window?.electron?.openFile) {
      const fullPath = basePath
        ? `${basePath}/public/uploads/${fileName}`
        : fileName;
      window.electron.openFile(fullPath);
    } else if (typeof window !== "undefined") {
      window.open(`/uploads/${fileName}`, "_blank");
    }
  };

  // ==========================================
  // Data Aggregations
  // ==========================================

  const consultations = useMemo(() => {
    return fullPatient.consultations || [];
  }, [fullPatient.consultations]);

  const vaccinations = useMemo(() => {
    return fullPatient.vaccinations || [];
  }, [fullPatient.vaccinations]);

  const ordonnances = useMemo(() => {
    return fullPatient.ordonnances || [];
  }, [fullPatient.ordonnances]);

  const radios = useMemo(() => {
    return fullPatient.radios || [];
  }, [fullPatient.radios]);

  const bilanFiles = useMemo(() => {
    return fullPatient.bilanFiles || [];
  }, [fullPatient.bilanFiles]);

  const bilansRecip = useMemo(() => {
    return fullPatient.bilans || [];
  }, [fullPatient.bilans]);

  // Patient Age formatted string
  const patientAge = useMemo(() => {
    return calculateAge(fullPatient.dateDeNaissance) || "";
  }, [fullPatient.dateDeNaissance]);

  // Combined documents list
  const combinedDocuments = useMemo(() => {
    const list = [];

    radios.forEach((r) => {
      list.push({
        id: `radio-${r.id}`,
        title: r.description || "Radiographie",
        date: r.createdAt,
        type: "Radio",
        fichier: r.fichier,
      });
    });

    bilanFiles.forEach((bf) => {
      list.push({
        id: `bilanfile-${bf.id}`,
        title: bf.description || bf.type || "Résultat d'analyse",
        date: bf.createdAt,
        type: "BilanFile",
        fichier: bf.fichier,
      });
    });

    bilansRecip.forEach((br) => {
      const itemsCount = br.items?.length || 0;
      list.push({
        id: `bilanrecip-${br.id}`,
        title: `Bilan biologique prescrit (${itemsCount} test${itemsCount > 1 ? "s" : ""})`,
        date: br.createdAt,
        type: "BilanRecip",
        items: br.items || [],
        raw: br,
      });
    });

    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (docFilter === "radios") {
      return list.filter((d) => d.type === "Radio");
    }
    if (docFilter === "bilans") {
      return list.filter(
        (d) => d.type === "BilanFile" || d.type === "BilanRecip",
      );
    }
    return list;
  }, [radios, bilanFiles, bilansRecip, docFilter]);

  // Filtered consultations for tab
  const filteredConsultations = useMemo(() => {
    if (!searchVisites.trim()) return consultations;
    const q = searchVisites.toLowerCase().trim();
    return consultations.filter(
      (c) =>
        (c.motifDeConsultation &&
          c.motifDeConsultation.toLowerCase().includes(q)) ||
        (c.note && c.note.toLowerCase().includes(q)) ||
        formatDateDisplay(c.createdAt).includes(q),
    );
  }, [consultations, searchVisites]);

  // Filtered vaccinations for tab
  const filteredVaccinations = useMemo(() => {
    if (!searchVaccines.trim()) return vaccinations;
    const q = searchVaccines.toLowerCase().trim();
    return vaccinations.filter(
      (v) =>
        (v.vaccine?.name && v.vaccine.name.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q)),
    );
  }, [vaccinations, searchVaccines]);

  // Filtered prescriptions for tab
  const filteredPrescriptions = useMemo(() => {
    if (!searchPrescriptions.trim()) return ordonnances;
    const q = searchPrescriptions.toLowerCase().trim();
    return ordonnances.filter((ord) => {
      const matchesDate = formatDateDisplay(ord.createdAt).includes(q);
      const matchesMed = (ord.items || []).some(
        (it) =>
          it.medicament?.nom && it.medicament.nom.toLowerCase().includes(q),
      );
      return matchesDate || matchesMed;
    });
  }, [ordonnances, searchPrescriptions]);

  // Tabs definition matching existing project UI
  const tabsList = [
    { id: "info", label: "Informations & Coordonnées" },
    {
      id: "consultations",
      label: "Consultations",
      count: consultations.length,
    },
    { id: "vaccinations", label: "Vaccinations", count: vaccinations.length },
    { id: "prescriptions", label: "Ordonnances", count: ordonnances.length },
    {
      id: "documents",
      label: "Bilans & Radios",
      count: radios.length + bilanFiles.length + bilansRecip.length,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl border border-[var(--color-200)]"
        showCloseButton={false}
      >
        {/* ======================================================== */}
        {/* HEADER: Simplified (Full Name, Age, ID only)             */}
        {/* ======================================================== */}
        <DialogHeader className="p-4 sm:px-6 sm:py-4 border-b border-[var(--color-200)] bg-gradient-to-r from-[var(--color-50)] to-white flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-[var(--color-800)] tracking-tight">
              {fullPatient.nom || "Dossier Patient"}
            </DialogTitle>
            {patientAge && (
              <span className="px-3 py-1 text-xs sm:text-sm rounded-full bg-[var(--color-100)] text-[var(--color-800)] font-semibold border border-[var(--color-200)] shadow-2xs">
                {patientAge}
              </span>
            )}
            <span className="text-xs text-gray-500 font-mono">
              #{fullPatient.id}
            </span>
            {loadingDetails && (
              <span className="flex items-center gap-1 text-xs text-[var(--color-600)] animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 p-0"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        {/* ======================================================== */}
        {/* TAB HEADER NAVIGATION: Always Visible & Project-styled  */}
        {/* ======================================================== */}
        <div className="flex border-b border-[var(--color-200)] bg-[var(--color-50)]/40 px-4 sm:px-6 overflow-x-auto scrollbar-hide shrink-0">
          {tabsList.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "text-[var(--color-700)] border-[var(--color-600)] font-bold bg-white"
                  : "text-gray-600 border-transparent hover:text-[var(--color-600)] hover:border-[var(--color-300)]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-[var(--color-100)] text-[var(--color-800)] font-bold"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ======================================================== */}
        {/* TAB CONTENTS (Scrollable area)                           */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
          {/* ------------------------------------------------------ */}
          {/* TAB 1: INFORMATIONS & COORDONNÉES ONLY (Directly Editable)*/}
          {/* ------------------------------------------------------ */}
          {activeTab === "info" && (
            <Card className="border border-[var(--color-200)] shadow-sm bg-white rounded-xl">
              <CardContent className="p-4 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-800)]">
                      Informations & Coordonnées du Patient
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isEditingInfo
                        ? "Modifiez les informations ci-dessous puis enregistrez."
                        : "Consultez les informations et coordonnées du patient."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {saveSuccess && (
                      <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 px-3 py-1 rounded-full border border-green-200 mr-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Enregistré avec succès !
                      </span>
                    )}

                    {!isEditingInfo ? (
                      <Button
                        type="button"
                        onClick={() => {
                          setIsEditingInfo(true);
                          setErrorMessage("");
                        }}
                        className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white shadow font-semibold flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-lg"
                      >
                        <Edit3 className="w-4 h-4" /> Modifier
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancelInfo}
                          disabled={saveLoading}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm px-3.5 py-2 rounded-lg"
                        >
                          Annuler
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveInfo}
                          disabled={saveLoading}
                          className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white shadow font-semibold flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-lg"
                        >
                          {saveLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" /> Enregistrer
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSaveInfo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Nom complet */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Nom complet *
                      </Label>
                      <Input
                        value={formData.nom}
                        disabled={!isEditingInfo}
                        onChange={(e) => handleChange("nom", e.target.value)}
                        placeholder="Nom et prénom..."
                        className="focus:ring-[var(--color-500)] disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                        required
                      />
                    </div>

                    {/* Sexe */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Sexe *
                      </Label>
                      <select
                        disabled={!isEditingInfo}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-[var(--color-500)] bg-white disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                        value={formData.sexe}
                        onChange={(e) => handleChange("sexe", e.target.value)}
                      >
                        <option value="">Sélectionner...</option>
                        <option value="garçon">Garçon</option>
                        <option value="fille">Fille</option>
                      </select>
                    </div>

                    {/* Date de naissance */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Date de naissance
                      </Label>
                      <Input
                        type="date"
                        disabled={!isEditingInfo}
                        value={formData.dateDeNaissance}
                        onChange={(e) =>
                          handleChange("dateDeNaissance", e.target.value)
                        }
                        className="focus:ring-[var(--color-500)] disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Groupe Sanguin */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Groupe sanguin
                      </Label>
                      <select
                        disabled={!isEditingInfo}
                        className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-[var(--color-500)] bg-white disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                        value={formData.groupeSanguin}
                        onChange={(e) =>
                          handleChange("groupeSanguin", e.target.value)
                        }
                      >
                        <option value="">Inconnu / Non renseigné</option>
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg.value} value={bg.value}>
                            {bg.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Téléphone */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-700">
                        Téléphone
                      </Label>
                      <Input
                        type="tel"
                        disabled={!isEditingInfo}
                        placeholder="06 XX XX XX XX"
                        value={formData.telephone}
                        onChange={(e) =>
                          handleChange("telephone", e.target.value)
                        }
                        className="focus:ring-[var(--color-500)] disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Adresse */}
                    <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                      <Label className="text-xs font-semibold text-gray-700">
                        Adresse de résidence
                      </Label>
                      <Input
                        disabled={!isEditingInfo}
                        placeholder="Adresse complète..."
                        value={formData.adresse}
                        onChange={(e) =>
                          handleChange("adresse", e.target.value)
                        }
                        className="focus:ring-[var(--color-500)] disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Antécédents */}
                    <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                      <Label className="text-xs font-semibold text-gray-700">
                        Antécédents médicaux, chirurgicaux & allergies
                      </Label>
                      <Textarea
                        rows={3}
                        disabled={!isEditingInfo}
                        placeholder="Ex: Asthme, allergies médicamenteuses, terrain atopique..."
                        value={formData.antecedents}
                        onChange={(e) =>
                          handleChange("antecedents", e.target.value)
                        }
                        className="focus:ring-[var(--color-500)] disabled:bg-gray-50 disabled:text-gray-700 disabled:border-gray-200 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 2: CONSULTATIONS (No Edit Buttons, Project UI)     */}
          {/* ------------------------------------------------------ */}
          {activeTab === "consultations" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Filtrer par motif, date ou note..."
                    value={searchVisites}
                    onChange={(e) => setSearchVisites(e.target.value)}
                    className="pl-9 h-9 text-xs focus:ring-[var(--color-500)]"
                  />
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {filteredConsultations.length} consultation
                  {filteredConsultations.length > 1 ? "s" : ""}
                </div>
              </div>

              {filteredConsultations.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                  <Stethoscope className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    Aucune consultation trouvée
                  </p>
                  <p className="text-xs text-gray-500">
                    {searchVisites
                      ? "Aucun résultat ne correspond à votre recherche."
                      : "Ce patient n'a pas encore de visite enregistrée."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredConsultations.map((consult) => {
                    return (
                      <Card
                        key={consult.id}
                        className="border border-gray-200 bg-white shadow-2xs hover:shadow-sm transition overflow-hidden"
                      >
                        <CardContent className="p-4 sm:p-5 space-y-3">
                          {/* Consultation Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-100)] text-[var(--color-800)]">
                                Consultation #{consult.id}
                              </span>
                              <h4 className="text-sm font-bold text-gray-900">
                                {consult.motifDeConsultation ||
                                  "Consultation médicale"}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-[var(--color-600)]" />
                              <span>
                                {formatDateTimeDisplay(consult.createdAt)}
                              </span>
                              {consult.rendezVous && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200 text-2xs">
                                  RDV :{" "}
                                  {formatDateDisplay(consult.rendezVous.date)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notes and Clinical observations */}
                          {consult.note && (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-800">
                              <span className="font-semibold text-gray-700 block mb-0.5">
                                Notes & Diagnostic :
                              </span>
                              <p className="whitespace-pre-line leading-relaxed">
                                {consult.note}
                              </p>
                            </div>
                          )}

                          {/* Attached Prescriptions, Bilans, Files */}
                          <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-gray-100">
                            {/* Ordonnance liée */}
                            {consult.ordonnance && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  printOrdonnance({
                                    nom: fullPatient.nom,
                                    age: patientAge,
                                    consultationId: consult.id,
                                    items: consult.ordonnance.items || [],
                                  })
                                }
                                className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                              >
                                🖨️ Imprimer l'Ordonnance
                              </Button>
                            )}

                            {/* Bilan lié */}
                            {consult.bilanRecip && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  printBilan({
                                    nom: fullPatient.nom,
                                    age: patientAge,
                                    consultationId: consult.id,
                                    items: (consult.bilanRecip.items || []).map(
                                      (it) => ({
                                        nom: it.bilan?.nom,
                                      }),
                                    ),
                                  })
                                }
                                className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                              >
                                🖨️ Imprimer le Bilan
                              </Button>
                            )}

                            {/* Justification liée */}
                            {consult.justificationRecord && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  printJustification({
                                    nom: fullPatient.nom,
                                    age: patientAge,
                                    consultationId: consult.id,
                                    texte: consult.justificationRecord.texte,
                                  })
                                }
                                className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                              >
                                🖨️ Imprimer Justification
                              </Button>
                            )}

                            {/* Radios liées */}
                            {consult.radios?.map((r) => (
                              <Button
                                key={r.id}
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenFile(r.fichier)}
                                className="border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1 text-xs"
                              >
                                <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                                Radio: {r.description || "Cliché"}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 3: VACCINATIONS (Exact Existing Project UI)         */}
          {/* ------------------------------------------------------ */}
          {activeTab === "vaccinations" && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom de vaccin..."
                    value={searchVaccines}
                    onChange={(e) => setSearchVaccines(e.target.value)}
                    className="pl-9 h-9 text-xs focus:ring-[var(--color-500)]"
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  {filteredVaccinations.length} vaccination
                  {filteredVaccinations.length > 1 ? "s" : ""}
                </span>
              </div>

              {filteredVaccinations.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                  <Syringe className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    Aucune vaccination enregistrée
                  </p>
                  <p className="text-xs text-gray-500">
                    {searchVaccines
                      ? "Aucun vaccin ne correspond à votre recherche."
                      : "Le carnet vaccinal de ce patient est vide."}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--color-100)] overflow-hidden bg-white">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-gradient-to-r from-[var(--color-100)] to-[var(--color-200)] text-[var(--color-800)]">
                      <tr>
                        <th className="text-left px-6 py-3 font-bold text-sm">
                          Vaccin
                        </th>
                        <th className="text-left px-6 py-3 font-bold text-sm">
                          Date d'administration
                        </th>
                        <th className="text-left px-6 py-3 font-bold text-sm">
                          Dose / Rappel
                        </th>
                        <th className="text-left px-6 py-3 font-bold text-sm">
                          Notes / Observations
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVaccinations.map((vaccine, index) => (
                        <tr
                          key={vaccine.id}
                          className={`transition-colors hover:bg-[var(--color-50)] ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-[var(--color-100)] rounded-full">
                              <Syringe className="w-4 h-4 text-[var(--color-700)]" />
                            </div>
                            {vaccine.vaccine?.name || vaccine.name || "Vaccin"}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-medium">
                            {formatDateDisplay(vaccine.dateGiven)}
                          </td>
                          <td className="px-6 py-4">
                            {vaccine.doseNumber ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-100)] text-[var(--color-800)]">
                                Dose #{vaccine.doseNumber}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {vaccine.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 5: ORDONNANCES (Exact Project Print Button)        */}
          {/* ------------------------------------------------------ */}
          {activeTab === "prescriptions" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par médicament ou date..."
                    value={searchPrescriptions}
                    onChange={(e) => setSearchPrescriptions(e.target.value)}
                    className="pl-9 h-9 text-xs focus:ring-[var(--color-500)]"
                  />
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  {filteredPrescriptions.length} ordonnance
                  {filteredPrescriptions.length > 1 ? "s" : ""}
                </div>
              </div>

              {filteredPrescriptions.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                  <Pill className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    Aucune ordonnance délivrée
                  </p>
                  <p className="text-xs text-gray-500">
                    {searchPrescriptions
                      ? "Aucune ordonnance ne correspond à votre filtre."
                      : "Ce patient n'a pas encore d'ordonnance enregistrée."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPrescriptions.map((ord) => (
                    <Card
                      key={ord.id}
                      className="border border-gray-200 bg-white shadow-2xs hover:shadow-sm transition overflow-hidden"
                    >
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-[var(--color-100)] text-[var(--color-700)] font-bold text-xs">
                              <Pill className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">
                                Ordonnance #{ord.id}
                              </h4>
                              <span className="text-xs text-gray-500">
                                Émise le {formatDateTimeDisplay(ord.createdAt)}
                              </span>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() =>
                              printOrdonnance({
                                nom: fullPatient.nom,
                                age: patientAge,
                                ordonnanceId: ord.id,
                                items: ord.items || [],
                              })
                            }
                            className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                          >
                            🖨️ Imprimer l'Ordonnance
                          </Button>
                        </div>

                        {/* Medications Table */}
                        <div className="rounded-lg border border-gray-100 overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[var(--color-50)] border-b border-[var(--color-100)] text-gray-700 font-semibold">
                                <th className="p-2.5">Médicament</th>
                                <th className="p-2.5">Dosage</th>
                                <th className="p-2.5">Fréquence</th>
                                <th className="p-2.5">Durée</th>
                                <th className="p-2.5 text-right">Quantité</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(ord.items || []).map((it, idx) => (
                                <tr
                                  key={it.id || idx}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="p-2.5 font-bold text-gray-900">
                                    {it.medicament?.nom || "—"}
                                  </td>
                                  <td className="p-2.5 text-gray-700">
                                    {it.dosage || "—"}
                                  </td>
                                  <td className="p-2.5 text-gray-700">
                                    {it.frequence || "—"}
                                  </td>
                                  <td className="p-2.5 text-gray-700">
                                    {it.duree || "—"}
                                  </td>
                                  <td className="p-2.5 text-right font-medium text-gray-800">
                                    {it.quantite
                                      ? `${it.quantite} boîte${it.quantite > 1 ? "s" : ""}`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------ */}
          {/* TAB 6: BILANS & RADIOS (Clean Project UI)              */}
          {/* ------------------------------------------------------ */}
          {activeTab === "documents" && (
            <div className="space-y-4">
              {/* Filter pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant={docFilter === "all" ? "default" : "outline"}
                    onClick={() => setDocFilter("all")}
                    className={
                      docFilter === "all"
                        ? "bg-[var(--color-600)] text-white"
                        : "border-gray-200"
                    }
                  >
                    Tous les documents ({combinedDocuments.length})
                  </Button>
                  <Button
                    size="xs"
                    variant={docFilter === "bilans" ? "default" : "outline"}
                    onClick={() => setDocFilter("bilans")}
                    className={
                      docFilter === "bilans"
                        ? "bg-[var(--color-600)] text-white"
                        : "border-gray-200"
                    }
                  >
                    Bilans & Analyses ({bilanFiles.length + bilansRecip.length})
                  </Button>
                  <Button
                    size="xs"
                    variant={docFilter === "radios" ? "default" : "outline"}
                    onClick={() => setDocFilter("radios")}
                    className={
                      docFilter === "radios"
                        ? "bg-[var(--color-600)] text-white"
                        : "border-gray-200"
                    }
                  >
                    Radiographies ({radios.length})
                  </Button>
                </div>
              </div>

              {combinedDocuments.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-gray-300" />
                  <p className="text-sm font-semibold text-gray-700">
                    Aucun document trouvé
                  </p>
                  <p className="text-xs text-gray-500">
                    Aucun examen radiologique ou biologique n'est rattaché à ce
                    dossier.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {combinedDocuments.map((doc) => {
                    const isRadio = doc.type === "Radio";
                    const isBilanRecip = doc.type === "BilanRecip";

                    return (
                      <Card
                        key={doc.id}
                        className="border border-gray-200 bg-white shadow-2xs hover:shadow-sm transition overflow-hidden"
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-xl bg-[var(--color-100)] text-[var(--color-700)]">
                                {isRadio ? (
                                  <ImageIcon className="w-5 h-5" />
                                ) : (
                                  <FlaskConical className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 line-clamp-1">
                                  {doc.title}
                                </h4>
                                <span className="text-xs text-gray-500">
                                  {formatDateTimeDisplay(doc.date)}
                                </span>
                              </div>
                            </div>

                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-100)] text-[var(--color-800)]">
                              {isRadio
                                ? "Radiographie"
                                : doc.type === "BilanFile"
                                  ? "Fichier Bilan"
                                  : "Prescription"}
                            </span>
                          </div>

                          {/* Bilan Recip items preview */}
                          {isBilanRecip && doc.items && (
                            <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
                              <span className="font-semibold text-gray-700 block">
                                Examens demandés :
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {doc.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-800 text-2xs"
                                  >
                                    {it.bilan?.nom || "Bilan"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action button */}
                          <div className="pt-2 flex justify-end border-t border-gray-100">
                            {doc.fichier ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenFile(doc.fichier)}
                                className="border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Ouvrir le fichier
                              </Button>
                            ) : isBilanRecip ? (
                              <Button
                                size="sm"
                                onClick={() =>
                                  printBilan({
                                    nom: fullPatient.nom,
                                    age: patientAge,
                                    items: (doc.items || []).map((it) => ({
                                      nom: it.bilan?.nom,
                                    })),
                                  })
                                }
                                className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5"
                              >
                                🖨️ Imprimer le Bilan
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* FOOTER: Simple and Clean                                */}
        {/* ======================================================== */}
        <div className="bg-gray-50 border-t border-[var(--color-200)] px-6 py-3 flex items-center justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
