"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  User,
  Activity,
  Heart,
  Pill,
  FlaskConical,
  FileText,
  Edit3,
  Save,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Stethoscope,
  ClipboardList,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";
import param from "@/param.json";
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

  // 🔄 Fetch consultations
  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/Consulter?patientId=${patientId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de chargement");
      setVisits(data);
      setfiltredData(data);
    } catch (err) {
      console.error("❌ Erreur:", err);
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
      const fullname = selectedVisit?.patient?.nom || "";
      let prenom = "";
      let nom = "";

      if (fullname.trim()) {
        const parts = fullname.trim().split(" ");
        if (parts.length === 1) {
          nom = parts[0];
        } else {
          prenom = parts.slice(0, -1).join(" ");
          nom = parts[parts.length - 1];
        }
      }

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

      const fullname = selectedVisit?.patient?.nom || "";
      let prenom = "";
      let nom = "";

      if (fullname.trim()) {
        const parts = fullname.trim().split(" ");
        if (parts.length === 1) nom = parts[0];
        else {
          prenom = parts.slice(0, -1).join(" ");
          nom = parts[parts.length - 1];
        }
      }

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

      const fullname = selectedVisit?.patient?.nom || "";
      let prenom = "";
      let nom = "";

      if (fullname.trim()) {
        const parts = fullname.trim().split(" ");
        if (parts.length === 1) nom = parts[0];
        else {
          prenom = parts.slice(0, -1).join(" ");
          nom = parts[parts.length - 1];
        }
      }

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
        text: err?.message || "Erreur lors de la suppression de la consultation.",
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

      await fetchConsultations();
      setIsEditing(false);

      // Update the selected visit after save
      const updatedVisit = filtredData[currentVisitIndex];
      await fetchPatientById(patientId);

      setSelectedVisit(updatedVisit);
    } catch (err) {
      console.error("❌ Erreur lors de la mise à jour:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: err?.message || "Erreur lors de la mise à jour de la consultation.",
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

  // Navigate to next/previous visit
  const handleNextVisit = () => {
    if (currentVisitIndex < filtredData.length - 1) {
      const newIndex = currentVisitIndex + 1;
      setCurrentVisitIndex(newIndex);
      setSelectedVisit(filtredData[newIndex]);
      setEditedData(filtredData[newIndex]);
      setIsEditing(false);
    }
  };

  const handlePrevVisit = () => {
    if (currentVisitIndex > 0) {
      const newIndex = currentVisitIndex - 1;
      setCurrentVisitIndex(newIndex);
      setSelectedVisit(filtredData[newIndex]);
      setEditedData(filtredData[newIndex]);
      setIsEditing(false);
    }
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

    // In edit mode, show all fields. In view mode, only show filled fields
    if (showAll) {
      return allFields;
    }

    return allFields.filter(
      (field) =>
        field.value !== null && field.value !== undefined && field.value !== "",
    );
  };

  // ⚕️ Medical Info Grid (show all fields in edit mode, only filled in view mode)
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
        {/* Textarea fields in responsive grid */}
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

        {/* Number fields in responsive grid */}
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
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
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
        onOpenChange={() => {
          setSelectedVisit(null);
          setIsEditing(false);
        }}
      >
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl max-h-[92vh] bg-gradient-to-br from-[var(--color-50)] to-white rounded-2xl p-4 sm:p-6 lg:p-8 overflow-y-auto shadow-2xl">
          {selectedVisit && (
            <>
              <DialogHeader>
                <div className="flex flex-col gap-3 sm:gap-4">
                  {/* Title and Navigation Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pr-8 sm:pr-10">
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-[var(--color-700)]">
                      Consultation #{selectedVisit.id}
                    </DialogTitle>

                    {/* Center: Pagination Navigation */}
                    {filtredData.length > 1 && (
                      <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-md border border-gray-100">
                        <button
                          onClick={handlePrevVisit}
                          disabled={currentVisitIndex === 0}
                          className={`p-2 sm:p-2.5 rounded-lg transition-all font-semibold ${
                            currentVisitIndex === 0
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-[var(--color-500)] text-white hover:bg-[var(--color-600)] shadow-md hover:shadow-lg"
                          }`}
                          title="Précédente"
                        >
                          <ChevronLeft size={18} />
                        </button>

                        <span className="text-xs sm:text-sm font-semibold text-gray-700 min-w-[85px] sm:min-w-[100px] text-center">
                          Visite {currentVisitIndex + 1} / {filtredData.length}
                        </span>

                        <button
                          onClick={handleNextVisit}
                          disabled={
                            currentVisitIndex === filtredData.length - 1
                          }
                          className={`p-2 sm:p-2.5 rounded-lg transition-all font-semibold ${
                            currentVisitIndex === filtredData.length - 1
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-[var(--color-500)] text-white hover:bg-[var(--color-600)] shadow-md hover:shadow-lg"
                          }`}
                          title="Suivante"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    )}

                    {/* Right: Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditedData(selectedVisit);
                            }}
                            disabled={isSaving}
                            className="px-3.5 sm:px-5 py-2 sm:py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-semibold text-gray-700 text-sm sm:text-base shadow-sm disabled:opacity-50"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base disabled:opacity-60"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                <Save size={18} /> Enregistrer
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-3.5 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base"
                        >
                          <Edit3 size={18} /> Modifier
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition font-semibold shadow-md hover:shadow-lg flex items-center gap-2"
                        title="Supprimer la consultation"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Date/Time Row */}
                  <div className="flex flex-wrap justify-end items-center gap-2">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        className="border-2 border-[var(--color-200)] rounded-xl px-3 sm:px-4 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] w-full sm:w-auto"
                        value={
                          editedData.createdAt
                            ? typeof editedData.createdAt === "string" &&
                              editedData.createdAt.length === 16
                              ? editedData.createdAt
                              : new Date(editedData.createdAt)
                                  .toISOString()
                                  .slice(0, 16)
                            : selectedVisit.createdAt
                              ? new Date(selectedVisit.createdAt)
                                  .toISOString()
                                  .slice(0, 16)
                              : ""
                        }
                        onChange={(e) => {
                          handleChange("createdAt", e.target.value);
                        }}
                      />
                    ) : (
                      <div className="inline-flex items-center gap-2 sm:gap-3 rounded-xl bg-white px-3.5 sm:px-5 py-2 sm:py-2.5 border-2 border-[var(--color-100)] shadow-md text-xs sm:text-sm">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-600)]" />
                        <span className="text-xs uppercase tracking-wider text-[var(--color-600)] font-semibold">
                          Date & heure
                        </span>
                        <span className="font-bold text-[var(--color-900)] text-sm sm:text-base">
                          {selectedVisit.createdAt
                            ? new Date(selectedVisit.createdAt).toLocaleString(
                                "fr-FR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* 🗓️ Rendez-vous */}
              {(selectedVisit.rendezVous || isEditing) && (
                <div className="mt-4 bg-white p-3 rounded-lg shadow-sm">
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

              {/* ====================== */}
              {/* 🦷 TRAITEMENTS & ACTES RÉALISÉS */}
              {/* ====================== */}
              {selectedVisit?.consultationsTraitement?.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-[var(--color-700)] font-semibold text-sm sm:text-base flex items-center gap-2 mb-2">
                    <Activity size={18} /> Soins dentaires & Actes réalisés lors de cette séance
                  </h3>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b bg-teal-50/70 text-slate-700">
                            <th className="text-left p-3 font-semibold">Traitement</th>
                            <th className="text-left p-3 font-semibold">Dent</th>
                            <th className="text-left p-3 font-semibold">Acte réalisé lors de cette séance</th>
                            <th className="text-left p-3 font-semibold">Statut</th>
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

              {/* ====================== */}
              {/* 🔬 BILAN RECIP (Analyses) */}
              {/* ====================== */}
              {selectedVisit?.bilanRecip?.items?.length > 0 && (
                <div className="mt-5">
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
                      🖨️ Imprimer
                    </Button>
                  </div>
                  <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b bg-[var(--color-50)]">
                            <th className="text-left p-2.5 font-semibold text-gray-700">Bilan</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Résultat</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Remarque</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedVisit.bilanRecip.items.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="p-2.5 text-gray-900 font-medium">{item.bilan?.nom || "—"}</td>
                              <td className="p-2.5 text-gray-700">{item.resultat || "—"}</td>
                              <td className="p-2.5 text-gray-600">{item.remarque || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ====================== */}
              {/* 💊 ORDONNANCE (Prescription) */}
              {/* ====================== */}
              {selectedVisit?.ordonnance?.items?.length > 0 && (
                <div className="mt-5">
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
                      🖨️ Imprimer
                    </Button>
                  </div>

                  <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse min-w-[600px]">
                        <thead>
                          <tr className="border-b bg-[var(--color-50)]">
                            <th className="text-left p-2.5 font-semibold text-gray-700">Médicament</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Dosage</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Fréquence</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Durée</th>
                            <th className="text-left p-2.5 font-semibold text-gray-700">Quantité</th>
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
                              <td className="p-2.5 text-gray-700">{item.dosage || "—"}</td>
                              <td className="p-2.5 text-gray-700">{item.frequence || "—"}</td>
                              <td className="p-2.5 text-gray-700">{item.duree || "—"}</td>
                              <td className="p-2.5 text-gray-700">{item.quantite || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ====================== */}
              {/* 📄 JUSTIFICATION MÉDICALE */}
              {/* ====================== */}
              {(selectedVisit?.justificationRecord ||
                selectedVisit?.justification) && (
                <div className="mt-5">
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
                      🖨️ Imprimer
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

              <DialogFooter className="mt-8 flex justify-center"></DialogFooter>
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
