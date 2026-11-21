"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Trash2,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  Loader2,
  Printer,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";
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

function splitName(fullname) {
  let prenom = "";
  let nom = "";
  if (fullname && fullname.trim()) {
    const parts = fullname.trim().split(" ");
    if (parts.length === 1) nom = parts[0];
    else {
      prenom = parts.slice(0, -1).join(" ");
      nom = parts[parts.length - 1];
    }
  }
  return { nom, prenom };
}

export default function PatientVisits({
  patientId,
  query,
  dateFilter,
  fetchPatientById,
}) {
  const [visits, setVisits] = useState([]);
  const [filtredData, setfiltredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [currentVisitIndex, setCurrentVisitIndex] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedData, setEditedData] = useState({});

  // 🔄 Filter by query and dateFilter
  useEffect(() => {
    let filtred = visits || [];
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      filtred = filtred.filter(
        (v) =>
          v.id.toString().includes(q) ||
          (v.motifDeConsultation &&
            v.motifDeConsultation.toLowerCase().includes(q)) ||
          (v.note && v.note.toLowerCase().includes(q)),
      );
    }
    if (dateFilter) {
      filtred = filtred.filter((v) => isSameDate(v.createdAt, dateFilter));
    }
    setfiltredData(filtred);
  }, [query, dateFilter, visits]);

  // 🔄 Keep selectedVisit & currentVisitIndex synchronized when filters change
  useEffect(() => {
    if (!selectedVisit) return;
    const idx = filtredData.findIndex((v) => v.id === selectedVisit.id);
    if (idx !== -1 && idx !== currentVisitIndex) {
      setCurrentVisitIndex(idx);
    }
  }, [filtredData, selectedVisit, currentVisitIndex]);

  // ⌨️ Navigate between consultations with Left / Right arrow keys
  useEffect(() => {
    if (!selectedVisit || deleteConfirm) return;

    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target?.isContentEditable
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        if (currentVisitIndex > 0) {
          e.preventDefault();
          const newIndex = currentVisitIndex - 1;
          setCurrentVisitIndex(newIndex);
          setSelectedVisit(filtredData[newIndex]);
          setEditedData(filtredData[newIndex]);
          setIsEditing(false);
        }
      } else if (e.key === "ArrowRight") {
        if (currentVisitIndex < filtredData.length - 1) {
          e.preventDefault();
          const newIndex = currentVisitIndex + 1;
          setCurrentVisitIndex(newIndex);
          setSelectedVisit(filtredData[newIndex]);
          setEditedData(filtredData[newIndex]);
          setIsEditing(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedVisit, deleteConfirm, currentVisitIndex, filtredData]);

  // 🔄 Fetch consultations
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/Consulter?patientId=${patientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement");
      setVisits(data);
      setfiltredData(data);
      return data;
    } catch (err) {
      console.error("❌ Erreur:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handlePrintElectron = async () => {
    try {
      if (
        !selectedVisit?.ordonnance?.items ||
        selectedVisit.ordonnance.items.length === 0
      ) {
        return;
      }
      const { nom, prenom } = splitName(selectedVisit?.patient?.nom);

      printOrdonnance({
        consultationId: selectedVisit.id,
        ordonnanceId: selectedVisit.ordonnance.id,
        nom,
        prenom,
        age: "",
        items: selectedVisit.ordonnance.items.map((it) => ({
          name: it.medicament?.nom || it.nom || "",
          dosage: it.dosage,
          duration: it.duree,
          frequency: it.frequence,
          quantity: it.quantite,
        })),
      });
    } catch (error) {
      console.error("Erreur lors de l'impression de l'ordonnance:", error);
    }
  };

  const handlePrintBilanElectron = async () => {
    try {
      if (
        !selectedVisit?.bilanRecip?.items ||
        selectedVisit.bilanRecip.items.length === 0
      ) {
        return;
      }
      const { nom, prenom } = splitName(selectedVisit?.patient?.nom);

      printBilan({
        bilanId: selectedVisit.bilanRecip.id,
        consultationId: selectedVisit.id,
        nom,
        prenom,
        age: "",
        items: selectedVisit.bilanRecip.items.map((exam) => ({
          id: exam.id,
          nom: exam.bilan?.nom || exam.nom || "",
        })),
      });
    } catch (error) {
      console.error("Erreur lors de l'impression du bilan:", error);
    }
  };

  const handlePrintJustifElectron = async () => {
    try {
      const justif =
        selectedVisit?.justificationRecord ||
        (typeof selectedVisit?.justification === "object"
          ? selectedVisit.justification
          : { texte: selectedVisit?.justification });
      if (!justif || !justif.texte) return;

      const { nom, prenom } = splitName(selectedVisit?.patient?.nom);

      printJustification({
        consultationId: selectedVisit.id,
        justificationId:
          selectedVisit.justificationRecord?.id || selectedVisit.id,
        nom,
        prenom,
        age: "",
        texte: justif.texte,
      });
    } catch (error) {
      console.error("Erreur impression justification:", error);
    }
  };

  useEffect(() => {
    if (!patientId) return;
    fetchConsultations();
  }, [patientId]);

  // 🗑️ Delete consultation
  async function handleDelete(id) {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/Consulter?id=${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Erreur lors de la suppression");

      setVisits((prev) => prev.filter((v) => v.id !== id));
      await fetchPatientById(patientId);

      setDeleteConfirm(false);
      setSelectedVisit(null);
    } catch (err) {
      console.error("❌ handleDelete error:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          err?.message || "Erreur lors de la suppression de la consultation.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // 💾 Save modifications
  async function handleSave() {
    setIsSaving(true);
    try {
      const formattedData = {
        ...editedData,
        createdAt: editedData.createdAt
          ? new Date(editedData.createdAt).toISOString()
          : selectedVisit.createdAt,
      };

      const res = await fetch("/api/Consulter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedVisit.id,
          ...formattedData,
          motifDeConsultation: editedData.motifDeConsultation || null,
          justification: editedData.justification || null,
          rendezVousDate: editedData.rendezVousDate || null,
          rendezVousDescription: editedData.rendezVousDescription || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur de mise à jour");

      const newdata = await fetchConsultations();
      setIsEditing(false);

      // Update the selected visit after save
      const updatedVisit =
        newdata.find((v) => v.id === selectedVisit.id) ||
        newdata[currentVisitIndex];
      await fetchPatientById(patientId);

      setSelectedVisit(updatedVisit);
      if (updatedVisit) {
        setEditedData(updatedVisit);
      }
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          err?.message || "Erreur lors de la mise à jour de la consultation.",
        confirmButtonColor: "#d33",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // 🔄 Handle form changes
  const handleChange = (field, value) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  // Navigate to specific, next, or previous visit
  const handleSelectVisitByIndex = (index) => {
    if (index >= 0 && index < filtredData.length) {
      setCurrentVisitIndex(index);
      setSelectedVisit(filtredData[index]);
      setEditedData(filtredData[index]);
      setIsEditing(false);
    }
  };

  const handleNextVisit = () => {
    handleSelectVisitByIndex(currentVisitIndex + 1);
  };

  const handlePrevVisit = () => {
    handleSelectVisitByIndex(currentVisitIndex - 1);
  };

  const handleCloseModal = () => {
    setSelectedVisit(null);
    setIsEditing(false);
  };

  // Get all medical fields (show all in edit mode, only filled in view mode)
  const getMedicalFields = (visit, showAll = false) => {
    const allFields = [
      {
        icon: Stethoscope,
        label: "Motif de consultation",
        value: visit.motifDeConsultation,
        field: "motifDeConsultation",
        type: "textarea",
      },
      {
        icon: ClipboardList,
        label: "Notes",
        value: visit.note,
        field: "note",
        type: "textarea",
      },
      {
        icon: ClipboardList,
        label: "Justification",
        value: visit.justification,
        field: "justification",
        type: "textarea",
      },
    ];

    if (showAll) return allFields;

    return allFields.filter(
      (field) =>
        field.value !== null && field.value !== undefined && field.value !== "",
    );
  };

  // ⚕️ Medical Info Grid
  const renderMedicalInfo = (visit) => {
    const fields = getMedicalFields(visit, isEditing);

    if (!isEditing && fields.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Aucune donnée médicale disponible pour cette consultation
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {fields
            .filter((f) => f.type === "textarea")
            .map((info, idx) => (
              <div
                key={idx}
                className="bg-white rounded-lg shadow-sm p-3.5 sm:p-4 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <info.icon className="text-[var(--color-500)]" size={18} />
                    <span className="text-gray-700 font-medium text-sm">
                      {info.label}
                    </span>
                  </div>
                  {isEditing ? (
                    <textarea
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg p-2.5 sm:p-3 text-sm bg-gray-50 focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)]"
                      value={editedData[info.field] ?? visit[info.field] ?? ""}
                      onChange={(e) => handleChange(info.field, e.target.value)}
                    />
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                      {info.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {fields
            .filter((f) => f.type === "number")
            .map((info, idx) => (
              <Card
                key={idx}
                className="flex items-center justify-between p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-row items-center min-w-0 pr-2">
                  <info.icon
                    className="text-[var(--color-500)] mr-2 flex-shrink-0"
                    size={18}
                  />
                  <span className="text-gray-600 text-xs sm:text-sm truncate">
                    {info.label}
                  </span>
                </div>
                <div className="text-right text-gray-800 flex-shrink-0">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      className="border border-gray-300 rounded px-2 py-1 w-20 text-sm focus:ring-2 focus:ring-[var(--color-500)]"
                      value={editedData[info.field] ?? visit[info.field] ?? ""}
                      onChange={(e) => handleChange(info.field, e.target.value)}
                    />
                  ) : (
                    <span className="font-semibold text-xs sm:text-sm">
                      {info.value} {info.unite}
                    </span>
                  )}
                </div>
              </Card>
            ))}
        </div>
      </div>
    );
  };

  // 📎 Helpers for header
  const toInputDate = (d) => {
    if (!d) return "";
    if (typeof d === "string" && d.length === 16) return d;
    const x = new Date(d);
    return isNaN(x.getTime()) ? "" : x.toISOString().slice(0, 16);
  };

  const scrollToSection = (id) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Ordered document navigation items
  const docChips = selectedVisit
    ? [
        {
          key: "soins",
          label: "Soins",
          icon: Activity,
          count: selectedVisit.consultationsTraitement?.length || 0,
          target: "section-soins",
        },
        {
          key: "ordonnance",
          label: "Ordonnance",
          icon: Pill,
          count: selectedVisit.ordonnance?.items?.length || 0,
          target: "section-ordonnance",
          onPrint: handlePrintElectron,
        },
        {
          key: "bilan",
          label: "Bilan / Analyses",
          icon: FlaskConical,
          count: selectedVisit.bilanRecip?.items?.length || 0,
          target: "section-bilan",
          onPrint: handlePrintBilanElectron,
        },
        {
          key: "justif",
          label: "Justification",
          icon: FileText,
          count:
            selectedVisit.justificationRecord || selectedVisit.justification
              ? 1
              : 0,
          target: "section-justif",
          onPrint: handlePrintJustifElectron,
        },
        {
          key: "rdv",
          label: "Rendez-vous",
          icon: Calendar,
          count: selectedVisit.rendezVous ? 1 : 0,
          target: "section-rdv",
        },
      ].filter((d) => d.count > 0)
    : [];

  // Compact windowed indices for dot pagination when there are many consultations
  const getVisibleDotIndices = (total, current) => {
    const maxVisible = 7;
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i);
    }
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(0, current - half);
    let end = start + maxVisible;
    if (end > total) {
      end = total;
      start = Math.max(0, end - maxVisible);
    }
    return Array.from({ length: end - start }, (_, i) => start + i);
  };

  const visibleDotIndices = getVisibleDotIndices(
    filtredData.length,
    currentVisitIndex,
  );

  return (
    <div className="p-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[var(--color-100)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r bg-[var(--color-600)] text-white">
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  #
                </th>
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  Heure
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`visite-skel-${idx}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-6 w-32 bg-[var(--color-200)]/60 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-28 bg-[var(--color-200)]/60 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 bg-[var(--color-200)]/60 rounded" />
                    </td>
                  </tr>
                ))
              ) : filtredData?.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Aucune consultation trouvée.
                  </td>
                </tr>
              ) : (
                filtredData?.map((visit, index) => (
                  <tr
                    key={visit.id}
                    onClick={() => {
                      setCurrentVisitIndex(index);
                      setSelectedVisit(visit);
                      setEditedData(visit);
                      setIsEditing(false);
                    }}
                    className={`cursor-pointer transition-colors hover:bg-[var(--color-50)] ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[var(--color-100)] text-[var(--color-800)]">
                        Consultation #{visit.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Calendar
                          size={16}
                          className="text-[var(--color-500)]"
                        />
                        {new Date(visit.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                        <Clock size={16} className="text-[var(--color-500)]" />
                        {new Date(visit.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================== */}
      {/* DETAILS DIALOG */}
      {/* ====================== */}
      <Dialog
        open={!!selectedVisit}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
      >
        <DialogContent className="[&>button]:hidden w-[96vw] max-w-[96vw] sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl max-h-[92vh] bg-white rounded-2xl p-0 gap-0 flex flex-col overflow-hidden shadow-2xl border border-[var(--color-100)]">
          {selectedVisit && (
            <>
              {/* ========= FIXED STICKY HEADER ========= */}
              <DialogHeader className="sticky top-0 shrink-0 z-20 bg-white border-b border-[var(--color-100)] shadow-sm text-left space-y-0">
                {/* ROW 1: Main Header (3 Sections) */}
                <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap lg:grid lg:grid-cols-[1fr_auto_1fr] items-center justify-between gap-3">
                  {/* Left: Consultation Information */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
                    <DialogTitle className="inline-flex items-center gap-2 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-100)] text-[var(--color-700)] shrink-0">
                        <ClipboardList size={18} />
                      </span>
                      <span>Consultation #{selectedVisit.id}</span>
                    </DialogTitle>

                    {isEditing ? (
                      <input
                        type="datetime-local"
                        aria-label="Date et heure de la consultation"
                        className="border border-[var(--color-200)] rounded-lg px-2.5 py-1 text-xs sm:text-sm font-medium text-slate-800 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] transition"
                        value={toInputDate(
                          editedData.createdAt ?? selectedVisit.createdAt,
                        )}
                        onChange={(e) =>
                          handleChange("createdAt", e.target.value)
                        }
                      />
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-50)] px-3 py-1 border border-[var(--color-200)]/80 text-xs font-medium text-[var(--color-800)]">
                        <Calendar className="w-3.5 h-3.5 text-[var(--color-600)] shrink-0" />
                        <span>
                          {selectedVisit.createdAt
                            ? new Date(
                                selectedVisit.createdAt,
                              ).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        <span className="text-[var(--color-300)]">•</span>
                        <Clock className="w-3.5 h-3.5 text-[var(--color-600)] shrink-0" />
                        <span>
                          {selectedVisit.createdAt
                            ? new Date(
                                selectedVisit.createdAt,
                              ).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Center: Dot-Based Consultation Pagination */}
                  {filtredData.length > 0 && (
                    <nav
                      aria-label="Navigation entre les consultations"
                      className="order-3 lg:order-2 w-full lg:w-auto flex items-center justify-center pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-100"
                    >
                      <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-slate-50/90 px-2.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
                        <button
                          type="button"
                          onClick={handlePrevVisit}
                          disabled={currentVisitIndex === 0}
                          aria-label="Consultation précédente"
                          title="Consultation précédente (←)"
                          className={`p-1 rounded-full transition-all duration-150 ${
                            currentVisitIndex === 0
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-600 hover:text-[var(--color-700)] hover:bg-white active:scale-95"
                          }`}
                        >
                          <ChevronLeft size={16} />
                        </button>

                        {/* Clickable Dots */}
                        <div className="flex items-center gap-1.5 px-1">
                          {visibleDotIndices[0] > 0 && (
                            <span
                              className="w-1 h-1 rounded-full bg-slate-300"
                              aria-hidden="true"
                            />
                          )}

                          {visibleDotIndices.map((dotIdx) => {
                            const dotVisit = filtredData[dotIdx];
                            const isActive = dotIdx === currentVisitIndex;
                            return (
                              <button
                                key={dotVisit?.id ?? dotIdx}
                                type="button"
                                onClick={() => handleSelectVisitByIndex(dotIdx)}
                                aria-label={`Aller à la consultation #${dotVisit?.id ?? dotIdx + 1}`}
                                aria-current={isActive ? "step" : undefined}
                                title={`Consultation #${dotVisit?.id ?? dotIdx + 1} (${dotIdx + 1}/${filtredData.length})`}
                                className={`rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:ring-offset-1 ${
                                  isActive
                                    ? "w-5 h-2 bg-[var(--color-600)] shadow-xs"
                                    : "w-2 h-2 bg-slate-300 hover:bg-[var(--color-400)] hover:scale-125"
                                }`}
                              />
                            );
                          })}

                          {visibleDotIndices[visibleDotIndices.length - 1] <
                            filtredData.length - 1 && (
                            <span
                              className="w-1 h-1 rounded-full bg-slate-300"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <span className="text-xs font-semibold text-slate-600 tabular-nums px-1 select-none">
                          {currentVisitIndex + 1} / {filtredData.length}
                        </span>

                        <button
                          type="button"
                          onClick={handleNextVisit}
                          disabled={
                            currentVisitIndex >= filtredData.length - 1
                          }
                          aria-label="Consultation suivante"
                          title="Consultation suivante (→)"
                          className={`p-1 rounded-full transition-all duration-150 ${
                            currentVisitIndex >= filtredData.length - 1
                              ? "text-slate-300 cursor-not-allowed"
                              : "text-slate-600 hover:text-[var(--color-700)] hover:bg-white active:scale-95"
                          }`}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </nav>
                  )}

                  {/* Right: Main Actions + Close Button */}
                  <div className="order-2 lg:order-3 flex items-center justify-end gap-1.5 sm:gap-2 ml-auto lg:ml-0">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedData(selectedVisit);
                          }}
                          disabled={isSaving}
                          title="Annuler les modifications"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-lg transition text-xs sm:text-sm font-medium text-slate-700 disabled:opacity-50"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isSaving}
                          title="Enregistrer les modifications"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-60"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Enregistrement...</span>
                            </>
                          ) : (
                            <>
                              <Save size={15} />
                              <span>Enregistrer</span>
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          title="Modifier la consultation"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-600)] hover:bg-[var(--color-700)] active:opacity-95 text-white rounded-lg transition text-xs sm:text-sm font-medium shadow-xs"
                        >
                          <Edit3 size={14} />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(true)}
                          aria-label="Supprimer la consultation"
                          title="Supprimer la consultation"
                          className="inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-red-200 bg-red-50/80 text-red-600 hover:bg-red-100 hover:border-red-300 active:bg-red-200 transition text-xs sm:text-sm font-medium"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}

                    <div
                      className="h-5 w-px bg-slate-200 mx-0.5"
                      aria-hidden="true"
                    />

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      aria-label="Fermer la fenêtre"
                      title="Fermer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-[var(--color-500)]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* ROW 2: Documents Navigation Bar  {docChips.length > 0 && (
                  <div className="px-4 sm:px-6 lg:px-8 py-2 bg-[var(--color-50)] border-t border-[var(--color-100)]/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 shrink-0 mr-1">
                      Documents
                    </span>
                    <div className="flex items-center gap-2">
                      {docChips.map((d) => {
                        const IconComponent = d.icon;
                        return (
                          <div
                            key={d.key}
                            className="inline-flex items-center shrink-0 rounded-full bg-white border border-[var(--color-200)]/80 text-slate-700 hover:border-[var(--color-400)] hover:shadow-xs transition-all duration-150"
                          >
                            <button
                              type="button"
                              onClick={() => scrollToSection(d.target)}
                              title={`Aller à ${d.label}`}
                              className={`inline-flex items-center gap-1.5 pl-3 py-1 text-xs font-medium text-slate-700 hover:text-[var(--color-700)] transition-colors ${
                                d.onPrint ? "pr-2" : "pr-3"
                              }`}
                            >
                              <IconComponent
                                size={14}
                                className="text-[var(--color-600)] shrink-0"
                              />
                              <span>{d.label}</span>
                              <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-[var(--color-100)] text-[var(--color-800)] font-semibold text-[11px] inline-flex items-center justify-center">
                                {d.count}
                              </span>
                            </button>
                            {d.onPrint && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  d.onPrint();
                                }}
                                aria-label={`Imprimer ${d.label}`}
                                title={`Imprimer ${d.label}`}
                                className="pr-2.5 pl-2 py-1 text-slate-500 hover:text-[var(--color-700)] hover:bg-[var(--color-50)] rounded-r-full border-l border-slate-200/80 transition-colors"
                              >
                                <Printer size={13} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )} */}
               
              </DialogHeader>

              {/* ========= SCROLLABLE BODY ========= */}
              <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8 scroll-smooth">
                {/* 🗓️ Rendez-vous */}
                {(selectedVisit.rendezVous || isEditing) && (
                  <div
                    id="section-rdv"
                    className="scroll-mt-4 bg-white p-3.5 rounded-xl shadow-xs border border-gray-100"
                  >
                    <h4 className="text-[var(--color-700)] font-semibold flex items-center gap-2 mb-2">
                      <Calendar size={18} /> Rendez-vous
                    </h4>
                    {isEditing ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block">
                            Date du rendez-vous
                          </label>
                          <input
                            type="datetime-local"
                            className="border rounded-md px-3 py-2 w-full text-sm"
                            value={
                              editedData.rendezVousDate ??
                              (selectedVisit.rendezVous?.date
                                ? new Date(selectedVisit.rendezVous.date)
                                    .toISOString()
                                    .slice(0, 16)
                                : "")
                            }
                            onChange={(e) =>
                              handleChange("rendezVousDate", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600 mb-1 block">
                            Description
                          </label>
                          <input
                            type="text"
                            className="border rounded-md px-3 py-2 w-full text-sm"
                            value={
                              editedData.rendezVousDescription ??
                              selectedVisit.rendezVous?.description ??
                              ""
                            }
                            onChange={(e) =>
                              handleChange(
                                "rendezVousDescription",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm">
                        <b>Date :</b>{" "}
                        {selectedVisit.rendezVous?.date
                          ? new Date(
                              selectedVisit.rendezVous.date,
                            ).toLocaleDateString("fr-FR")
                          : "—"}{" "}
                        | <b>Description :</b>{" "}
                        {selectedVisit.rendezVous?.description || "—"}
                      </p>
                    )}
                  </div>
                )}

                {/* 🧪 Infos médicales */}
                {renderMedicalInfo(selectedVisit)}

                {/* 🦷 TRAITEMENTS & ACTES RÉALISÉS */}
                {selectedVisit?.consultationsTraitement?.length > 0 && (
                  <div id="section-soins" className="mt-5 scroll-mt-4">
                    <h3 className="text-[var(--color-700)] font-semibold text-sm sm:text-base flex items-center gap-2 mb-2">
                      <Activity size={18} /> Soins dentaires & Actes réalisés
                      lors de cette séance
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b bg-teal-50/70 text-slate-700">
                              <th className="text-left p-3 font-semibold">
                                Traitement
                              </th>
                              <th className="text-left p-3 font-semibold">
                                Dent
                              </th>
                              <th className="text-left p-3 font-semibold">
                                Acte réalisé lors de cette séance
                              </th>
                              <th className="text-left p-3 font-semibold">
                                Statut
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedVisit.consultationsTraitement.map((ct) => (
                              <tr key={ct.id} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-800">
                                  {ct.traitement?.description || "—"}
                                </td>
                                <td className="p-3 text-slate-700">
                                  {ct.traitement?.dent ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                                      Dent {ct.traitement.dent}
                                    </span>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="p-3 text-slate-900 font-medium">
                                  {ct.acteRealise || "Soin / Contrôle"}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                      ct.traitement?.statut === "TERMINE"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : ct.traitement?.statut === "ANNULE"
                                          ? "bg-rose-100 text-rose-800"
                                          : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {ct.traitement?.statut === "TERMINE"
                                      ? "Terminé"
                                      : ct.traitement?.statut === "ANNULE"
                                        ? "Annulé"
                                        : "En cours"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔬 BILAN RECIP (Analyses) */}
                {selectedVisit?.bilanRecip?.items?.length > 0 && (
                  <div id="section-bilan" className="mt-5 scroll-mt-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-[var(--color-700)] font-semibold text-sm sm:text-base flex items-center gap-2">
                        <FlaskConical size={18} /> Bilans / Analyses #
                        {selectedVisit.bilanRecip.id}
                      </h3>
                      <Button
                        className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={handlePrintBilanElectron}
                        size="sm"
                      >
                        <Printer size={14} className="mr-1.5" /> Imprimer
                      </Button>
                    </div>
                    <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[500px]">
                          <thead>
                            <tr className="border-b bg-[var(--color-50)]">
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Bilan
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Résultat
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Remarque
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedVisit.bilanRecip.items.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-2.5 text-gray-900 font-medium">
                                  {item.bilan?.nom || "—"}
                                </td>
                                <td className="p-2.5 text-gray-700">
                                  {item.resultat || "—"}
                                </td>
                                <td className="p-2.5 text-gray-600">
                                  {item.remarque || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 💊 ORDONNANCE (Prescription) */}
                {selectedVisit?.ordonnance?.items?.length > 0 && (
                  <div id="section-ordonnance" className="mt-5 scroll-mt-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-[var(--color-700)] font-semibold text-sm sm:text-base flex items-center gap-2">
                        <Pill size={18} /> Ordonnance #
                        {selectedVisit.ordonnance.id}
                      </h3>
                      <Button
                        className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={handlePrintElectron}
                        size="sm"
                      >
                        <Printer size={14} className="mr-1.5" /> Imprimer
                      </Button>
                    </div>

                    <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse min-w-[600px]">
                          <thead>
                            <tr className="border-b bg-[var(--color-50)]">
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Médicament
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Dosage
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Fréquence
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Durée
                              </th>
                              <th className="text-left p-2.5 font-semibold text-gray-700">
                                Quantité
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedVisit.ordonnance.items.map((item) => (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="p-2.5 text-gray-900 font-semibold">
                                  {item.medicament?.nom || "—"}
                                </td>
                                <td className="p-2.5 text-gray-700">
                                  {item.dosage || "—"}
                                </td>
                                <td className="p-2.5 text-gray-700">
                                  {item.frequence || "—"}
                                </td>
                                <td className="p-2.5 text-gray-700">
                                  {item.duree || "—"}
                                </td>
                                <td className="p-2.5 text-gray-700">
                                  {item.quantite || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 📄 JUSTIFICATION MÉDICALE */}
                {(selectedVisit?.justificationRecord ||
                  selectedVisit?.justification) && (
                  <div id="section-justif" className="mt-5 scroll-mt-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-[var(--color-700)] font-semibold text-sm sm:text-base flex items-center gap-2">
                        <FileText size={18} /> Justification médicale
                        {selectedVisit.justificationRecord?.id
                          ? ` #${selectedVisit.justificationRecord.id}`
                          : ""}
                      </h3>
                      <Button
                        className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={handlePrintJustifElectron}
                        size="sm"
                      >
                        <Printer size={14} className="mr-1.5" /> Imprimer
                      </Button>
                    </div>

                    <div className="mt-2 bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                      <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedVisit.justificationRecord?.texte ||
                          selectedVisit.justification}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 🗑️ DELETE CONFIRM DIALOG */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <Trash2 size={24} />
              Supprimer la consultation ?
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600 mt-3">
              Cette action est <b className="text-red-600">irréversible</b>.
              Êtes-vous sûr de vouloir continuer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-6 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-semibold text-gray-700 shadow-sm disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={() => handleDelete(selectedVisit?.id)}
              disabled={isDeleting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-60"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}