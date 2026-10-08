"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  AlertCircle,
  FileText,
  Plus,
  FlaskConical,
  Calendar,
  Pill,
  Trash2,
  Loader2,
  Sparkles,
  Edit3,
  ImageIcon,
  Activity,
  DollarSign,
  CheckCircle2,
  X,
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
import NewOrdanance from "@/app/component/NewOrdanance/page";

export default function NewConsultationPage({
  selectedPatient = {},
  onSave,
  viderForm,
  setViderForm,
  openAddModal = false,
  setOpenAddModal,
  preselectedTraitement = null,
  onClearPreselectedTraitement,
}) {
  const [form, setForm] = useState({
    note: "",
    motifDeConsultation: "",
    ordonnance: {},
    bilanRecip: {},
    justification: null,
    radios: [],
    rendezVousDate: "",
    rendezVousDescription: "",
    traitements: [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Modal states
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [showNewOrdonnance, setShowNewOrdonnance] = useState(false);
  const [ordonnanceDefaultTab, setOrdonnanceDefaultTab] =
    useState("ordonnance");

  // Traitement section states (Tabs & Selector)
  const [activeTreatmentIndex, setActiveTreatmentIndex] = useState(0);
  const [showAddTreatmentDialog, setShowAddTreatmentDialog] = useState(false);
  const [addTreatmentMode, setAddTreatmentMode] = useState("existing"); // "existing" | "new"
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [newTreatmentFields, setNewTreatmentFields] = useState({
    description: "",
    dent: "",
    prixTotal: "",
  });
  const [patientTraitements, setPatientTraitements] = useState([]);
  const [loadingTraitements, setLoadingTraitements] = useState(false);

  // Radio Modal state
  const [showRadioModal, setShowRadioModal] = useState(false);
  const [editingRadioIndex, setEditingRadioIndex] = useState(null);
  const [radioForm, setRadioForm] = useState({ description: "", fichier: "" });
  const [uploadingRadio, setUploadingRadio] = useState(false);

  // RendezVous Modal state
  const [showRendezVousModal, setShowRendezVousModal] = useState(false);
  const [rendezVousForm, setRendezVousForm] = useState({
    date: "",
    description: "",
  });

  // Delete Confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    type: "",
    index: null,
    title: "",
    message: "",
  });

  // Sync external openAddModal trigger from header
  useEffect(() => {
    if (openAddModal) {
      setSelectorModalOpen(true);
      setOpenAddModal?.(false);
    }
  }, [openAddModal, setOpenAddModal]);

  const setordananceData = (data) => {
    setForm((prev) => ({
      ...prev,
      ordonnance:
        data?.ordonnance?.items && data.ordonnance.items.length > 0
          ? data.ordonnance
          : prev.ordonnance,
      bilanRecip:
        data?.bilanRecip?.items && data.bilanRecip.items.length > 0
          ? data.bilanRecip
          : prev.bilanRecip,
      justification:
        data?.justification !== undefined
          ? data.justification
          : prev.justification,
    }));
    setShowNewOrdonnance(false);
  };

  useEffect(() => {
    if (selectedPatient && Object.keys(selectedPatient).length > 0) {
      setForm((prev) => ({
        ...prev,
        note: selectedPatient.note ?? "",
        motifDeConsultation: selectedPatient.motifDeConsultation ?? "",
        ordonnance: selectedPatient.ordonnance ?? {},
        bilanRecip: selectedPatient.bilanRecip ?? {},
        justification:
          selectedPatient.justificationRecord ||
          (typeof selectedPatient.justification === "object"
            ? selectedPatient.justification
            : selectedPatient.justification
              ? {
                  titre: "Justification médicale",
                  texte: selectedPatient.justification,
                }
              : null),
        radios: Array.isArray(selectedPatient.radios)
          ? selectedPatient.radios
          : [],
        rendezVousDate: selectedPatient?.rendezVous?.date
          ? new Date(selectedPatient.rendezVous.date).toISOString().slice(0, 16)
          : "",
        rendezVousDescription: selectedPatient?.rendezVous?.description ?? "",
      }));
    }
  }, [selectedPatient]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  // Fetch patient ongoing treatments
  const fetchPatientTraitements = async () => {
    if (!selectedPatient?.id) return;
    setLoadingTraitements(true);
    try {
      const res = await fetch(
        `/api/traitements?patientId=${selectedPatient.id}&statut=EN_COURS`,
      );
      if (res.ok) {
        const data = await res.json();
        setPatientTraitements(data);
      }
    } catch (err) {
      console.error("Erreur chargement traitements patient:", err);
    } finally {
      setLoadingTraitements(false);
    }
  };

  // Sync preselected treatment if continued from Treatments tab
  useEffect(() => {
    if (preselectedTraitement && selectedPatient?.id) {
      const existingIdx = form.traitements.findIndex(
        (t) => t.traitementId === preselectedTraitement.id,
      );
      if (existingIdx !== -1) {
        setActiveTreatmentIndex(existingIdx);
      } else {
        const newEntry = {
          traitementId: preselectedTraitement.id,
          nouveauTraitement: null,
          description: preselectedTraitement.description || "",
          dent: preselectedTraitement.dent || "",
          prixTotal: preselectedTraitement.prixTotal || 0,
          totalPaye: preselectedTraitement.totalPaye || 0,
          resteAPayer: preselectedTraitement.resteAPayer || 0,
          acteRealise: "",
          hasVersement: false,
          versementMontant: "",
          versementNote: "",
          hasRendezVous: false,
          rendezVousDate: "",
          rendezVousDescription: "",
        };
        setForm((prev) => {
          const next = [...prev.traitements, newEntry];
          setActiveTreatmentIndex(next.length - 1);
          return { ...prev, traitements: next };
        });
      }
      onClearPreselectedTraitement?.();
    }
  }, [preselectedTraitement, selectedPatient?.id]);

  useEffect(() => {
    if (viderForm) {
      setForm({
        note: "",
        motifDeConsultation: "",
        ordonnance: {},
        bilanRecip: {},
        justification: null,
        radios: [],
        rendezVousDate: "",
        rendezVousDescription: "",
        traitements: [],
      });
      setActiveTreatmentIndex(0);
      setViderForm(false);
    }
  }, [viderForm, setViderForm]);

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      // Validate treatments session acts and payments
      for (let i = 0; i < form.traitements.length; i++) {
        const tr = form.traitements[i];
        if (!tr.acteRealise || !tr.acteRealise.trim()) {
          setActiveTreatmentIndex(i);
          throw new Error(
            `Veuillez renseigner l'acte réalisé pour le soin "${tr.description}".`,
          );
        }
        if (tr.hasVersement && parseFloat(tr.versementMontant) > 0) {
          const m = parseFloat(tr.versementMontant);
          if (tr.traitementId && m > tr.resteAPayer) {
            setActiveTreatmentIndex(i);
            throw new Error(
              `Le versement (${m.toLocaleString("fr-FR")} DZD) pour "${tr.description}" ne peut pas dépasser le reste à payer (${tr.resteAPayer.toLocaleString("fr-FR")} DZD).`,
            );
          }
        }
      }

      // Format treatments payload for API
      const formattedTraitements = form.traitements.map((tr) => {
        const montantNum = parseFloat(tr.versementMontant);
        return {
          traitementId: tr.traitementId || null,
          nouveauTraitement: tr.nouveauTraitement
            ? {
                description: tr.description.trim(),
                dent: tr.dent?.trim() || null,
                prixTotal: parseFloat(tr.prixTotal) || 0,
                statut: "EN_COURS",
              }
            : null,
          acteRealise: tr.acteRealise.trim(),
          versement:
            tr.hasVersement && montantNum > 0
              ? {
                  montant: montantNum,
                  note: tr.versementNote?.trim() || "Versement de séance",
                }
              : null,
          rendezVous:
            tr.hasRendezVous && tr.rendezVousDate
              ? {
                  date: tr.rendezVousDate,
                  description:
                    tr.rendezVousDescription?.trim() ||
                    `Suite séance ${tr.description}`,
                }
              : null,
        };
      });

      await Promise.resolve(
        onSave?.({
          ...form,
          traitements: formattedTraitements,
        }),
      );
    } catch (e) {
      setError(e?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  // Edit actions for header items
  const handleEdit = (type, index = null) => {
    if (type === "ordonnance") {
      setOrdonnanceDefaultTab("ordonnance");
      setShowNewOrdonnance(true);
    } else if (type === "bilan") {
      setOrdonnanceDefaultTab("labs");
      setShowNewOrdonnance(true);
    } else if (type === "justification") {
      setOrdonnanceDefaultTab("justif");
      setShowNewOrdonnance(true);
    } else if (type === "radio") {
      setEditingRadioIndex(index);
      setRadioForm({
        description: form.radios[index]?.description || "",
        fichier: form.radios[index]?.fichier || "",
      });
      setShowRadioModal(true);
    } else if (type === "rendezVous") {
      setRendezVousForm({
        date: form.rendezVousDate || "",
        description: form.rendezVousDescription || "",
      });
      setShowRendezVousModal(true);
    }
  };

  // Delete prompt & confirm
  const handlePromptDelete = (type, index = null, title, message) => {
    setDeleteConfirm({
      open: true,
      type,
      index,
      title,
      message,
    });
  };

  const handleConfirmDelete = () => {
    const { type, index } = deleteConfirm;
    if (type === "ordonnance") {
      setForm((prev) => ({ ...prev, ordonnance: {} }));
    } else if (type === "bilan") {
      setForm((prev) => ({ ...prev, bilanRecip: {} }));
    } else if (type === "justification") {
      setForm((prev) => ({ ...prev, justification: null }));
    } else if (type === "radio") {
      setForm((prev) => ({
        ...prev,
        radios: prev.radios.filter((_, i) => i !== index),
      }));
    } else if (type === "rendezVous") {
      setForm((prev) => ({
        ...prev,
        rendezVousDate: "",
        rendezVousDescription: "",
      }));
    } else if (type === "traitementTab") {
      setForm((prev) => ({
        ...prev,
        traitements: prev.traitements.filter((_, i) => i !== index),
      }));
      setActiveTreatmentIndex((prev) => Math.max(0, prev - 1));
    }
    setDeleteConfirm({
      open: false,
      type: "",
      index: null,
      title: "",
      message: "",
    });
  };

  // Treatment management helpers
  const handleAddExistingTreatment = () => {
    if (!selectedExistingId) {
      setError("Veuillez sélectionner un traitement dans la liste.");
      return;
    }
    const selected = patientTraitements.find(
      (t) => t.id === Number(selectedExistingId),
    );
    if (!selected) return;

    const alreadyIdx = form.traitements.findIndex(
      (t) => t.traitementId === selected.id,
    );
    if (alreadyIdx !== -1) {
      setActiveTreatmentIndex(alreadyIdx);
      setShowAddTreatmentDialog(false);
      setSelectedExistingId("");
      return;
    }

    const newEntry = {
      traitementId: selected.id,
      nouveauTraitement: null,
      description: selected.description,
      dent: selected.dent || null,
      prixTotal: selected.prixTotal || 0,
      totalPaye: selected.totalPaye || 0,
      resteAPayer: selected.resteAPayer || 0,
      acteRealise: "",
      hasVersement: false,
      versementMontant: "",
      versementNote: "",
      hasRendezVous: false,
      rendezVousDate: "",
      rendezVousDescription: "",
    };

    setForm((prev) => {
      const next = [...prev.traitements, newEntry];
      setActiveTreatmentIndex(next.length - 1);
      return { ...prev, traitements: next };
    });
    setSelectedExistingId("");
    setShowAddTreatmentDialog(false);
  };

  const handleAddNewTreatment = () => {
    if (!newTreatmentFields.description.trim()) {
      setError("Veuillez renseigner la description du soin.");
      return;
    }
    const prix = parseFloat(newTreatmentFields.prixTotal) || 0;
    const newEntry = {
      traitementId: null,
      nouveauTraitement: {
        description: newTreatmentFields.description.trim(),
        dent: newTreatmentFields.dent?.trim() || null,
        prixTotal: prix,
        statut: "EN_COURS",
      },
      description: newTreatmentFields.description.trim(),
      dent: newTreatmentFields.dent?.trim() || null,
      prixTotal: prix,
      totalPaye: 0,
      resteAPayer: prix,
      acteRealise: "",
      hasVersement: false,
      versementMontant: "",
      versementNote: "",
      hasRendezVous: false,
      rendezVousDate: "",
      rendezVousDescription: "",
    };

    setForm((prev) => {
      const next = [...prev.traitements, newEntry];
      setActiveTreatmentIndex(next.length - 1);
      return { ...prev, traitements: next };
    });
    setNewTreatmentFields({ description: "", dent: "", prixTotal: "" });
    setShowAddTreatmentDialog(false);
  };

  const updateActiveTreatment = (patch) => {
    setForm((prev) => {
      if (!prev.traitements[activeTreatmentIndex]) return prev;
      const updated = [...prev.traitements];
      updated[activeTreatmentIndex] = {
        ...updated[activeTreatmentIndex],
        ...patch,
      };
      return { ...prev, traitements: updated };
    });
  };

  // Radio file upload
  const handleRadioFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRadio(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Erreur de téléversement");
      const data = await res.json();
      setRadioForm((prev) => ({
        ...prev,
        fichier: file.name,
        description: prev.description || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } catch (err) {
      console.error(err);
      setError("Échec du téléversement du fichier.");
    } finally {
      setUploadingRadio(false);
    }
  };

  const handleSaveRadio = (e) => {
    e.preventDefault();
    if (editingRadioIndex !== null) {
      setForm((prev) => ({
        ...prev,
        radios: prev.radios.map((r, i) =>
          i === editingRadioIndex ? { ...r, ...radioForm } : r,
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        radios: [...(prev.radios || []), { ...radioForm, id: Date.now() }],
      }));
    }
    setShowRadioModal(false);
    setEditingRadioIndex(null);
    setRadioForm({ description: "", fichier: "" });
  };

  const handleSaveRendezVous = (e) => {
    e.preventDefault();
    setForm((prev) => ({
      ...prev,
      rendezVousDate: rendezVousForm.date,
      rendezVousDescription: rendezVousForm.description,
    }));
    setShowRendezVousModal(false);
  };

  // Element counters
  const hasOrdonnance = Boolean(
    form.ordonnance?.items && form.ordonnance.items.length > 0,
  );
  const hasBilan = Boolean(
    form.bilanRecip?.items && form.bilanRecip.items.length > 0,
  );
  const hasJustification = Boolean(
    form.justification &&
    (form.justification.texte || typeof form.justification === "string"),
  );
  const hasRadios = Boolean(form.radios && form.radios.length > 0);
  const hasRendezVous = Boolean(form.rendezVousDate);

  const totalAttached =
    (hasOrdonnance ? 1 : 0) +
    (hasBilan ? 1 : 0) +
    (hasJustification ? 1 : 0) +
    (form.radios?.length || 0) +
    (hasRendezVous ? 1 : 0);

  return (
    <div className="min-h-screen w-full dark:bg-gray-900 p-0">
      <div className="max-w-full mx-auto dark:bg-gray-800 rounded-2xl p-6 md:p-6">
        {error && (
          <div className="flex items-center gap-2 mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ======================================================== */}
        {/* 🌟 SECTION DU HAUT : ÉLÉMENTS ATTACHÉS À LA CONSULTATION */}
        {/* ======================================================== */}
        <div className="mb-6">
          {totalAttached === 0 ? (
            <div className="p-4 bg-gradient-to-r from-[var(--color-50)]/60 to-slate-50 border border-dashed border-[var(--color-300)] rounded-2xl flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Aucun élément attaché pour le moment. Cliquez sur « Ajouter »
                pour joindre une ordonnance, un bilan, une radio ou un prochain
                rendez-vous.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectorModalOpen(true)}
                className="border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-100)] rounded-xl"
              >
                + Ajouter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 💊 Ordonnance Card */}
              {hasOrdonnance && (
                <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-row align-middle  items-center">
                          {" "}
                          <div className="flex flex-row p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            <Pill size={18} />
                          </div>
                          <span className="p-1 font-semibold text-sm text-blue-900">
                            Ordonnance
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-200/80 text-blue-800">
                          {form.ordonnance.items.length} médicament(s)
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5  pt-2">
                        <button
                          type="button"
                          onClick={() => handleEdit("ordonnance")}
                          className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                          title="Modifier l'ordonnance"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePromptDelete(
                              "ordonnance",
                              null,
                              "Supprimer l'ordonnance",
                              "Êtes-vous sûr de vouloir retirer cette ordonnance de la consultation ?",
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                          title="Supprimer l'ordonnance"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🔬 Bilan / Analyses Card */}
              {hasBilan && (
                <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-row align-middle items-center">
                          <div className="flex flex-row p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                            <FlaskConical size={18} />
                          </div>
                          <span className="p-1 font-semibold text-sm text-emerald-900">
                            Bilan
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-200/80 text-emerald-800">
                          {form.bilanRecip.items.length} analyse(s)
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleEdit("bilan")}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                          title="Modifier le bilan"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePromptDelete(
                              "bilan",
                              null,
                              "Supprimer le bilan",
                              "Êtes-vous sûr de vouloir retirer ce bilan de la consultation ?",
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                          title="Supprimer le bilan"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 📄 Justification Card */}
              {hasJustification && (
                <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-row align-middle items-center">
                          <div className="flex flex-row p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                            <FileText size={18} />
                          </div>
                          <span className="p-1 font-semibold text-sm text-purple-900">
                            Justification
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-200/80 text-purple-800">
                          {form.justification?.titre || "Certificat"}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleEdit("justification")}
                          className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition"
                          title="Modifier la justification"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePromptDelete(
                              "justification",
                              null,
                              "Supprimer la justification",
                              "Êtes-vous sûr de vouloir retirer cette justification de la consultation ?",
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                          title="Supprimer la justification"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 🩻 Radio Cards */}
              {hasRadios &&
                form.radios.map((radio, idx) => (
                  <div
                    key={`radio-${idx}`}
                    className="bg-indigo-50/80 border border-indigo-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-row align-middle items-center">
                            <div className="flex flex-row p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                              <ImageIcon size={18} />
                            </div>
                            <span className="p-1 font-semibold text-sm text-indigo-900">
                              Radio
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-200/80 text-indigo-800">
                            {radio.description || radio.fichier || `Radio #${idx + 1}`}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-2">
                          <button
                            type="button"
                            onClick={() => handleEdit("radio", idx)}
                            className="p-1.5 text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                            title="Modifier la radio"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handlePromptDelete(
                                "radio",
                                idx,
                                "Supprimer la radio",
                                "Êtes-vous sûr de vouloir supprimer cette radiographie de la consultation ?",
                              )
                            }
                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                            title="Supprimer la radio"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

              {/* 📅 Prochain Rendez-vous Card */}
              {hasRendezVous && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-row align-middle items-center">
                          <div className="flex flex-row p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Calendar size={18} />
                          </div>
                          <span className="p-1 font-semibold text-sm text-amber-900">
                            Rendez-vous
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200/80 text-amber-800">
                          {new Date(form.rendezVousDate).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-2">
                        <button
                          type="button"
                          onClick={() => handleEdit("rendezVous")}
                          className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition"
                          title="Modifier le rendez-vous"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handlePromptDelete(
                              "rendezVous",
                              null,
                              "Supprimer le rendez-vous",
                              "Êtes-vous sûr de vouloir retirer ce rendez-vous de la consultation ?",
                            )
                          }
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                          title="Supprimer le rendez-vous"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ====================== */}
        {/* 🩺 MOTIF DE CONSULTATION */}
        {/* ====================== */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Motif de consultation
          </label>
          <textarea
            name="motifDeConsultation"
            value={form.motifDeConsultation}
            onChange={handleChange}
            rows={2}
            placeholder="Ex: Douleur dentaire, détartrage, contrôle, extraction..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-300)]"
          />
        </div>

        {/* ====================== */}
        {/* 📝 NOTES CLINIQUES */}
        {/* ====================== */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Notes & Observations
          </label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={5}
            placeholder="Examen clinique, diagnostic, remarques sur les soins..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-300)]"
          />
        </div>

        {/* ======================================================== */}
        {/* 🦷 SECTION SOINS & TRAITEMENTS DENTAIRES (PAR ONGLETS) */}
        {/* ======================================================== */}
        <div className="mb-6 rounded-2xl border border-teal-200/90 bg-white shadow-sm overflow-hidden">
          {/* Header de la section soins */}
          <div className="bg-gradient-to-r from-teal-50 via-teal-50/40 to-white px-5 py-3.5 border-b border-teal-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-600 text-white rounded-xl shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  Soins & Traitements dentaires
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                    {form.traitements.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Associez un ou plusieurs soins réalisés lors de cette consultation
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                fetchPatientTraitements();
                setShowAddTreatmentDialog(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition"
            >
              <Plus size={15} />
              <span>Ajouter un soin</span>
            </Button>
          </div>

          {/* Corps de la section : Vide OU Onglets */}
          {form.traitements.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50">
              <div className="max-w-md mx-auto">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">
                  Aucun soin dentaire associé à cette consultation
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Sélectionnez un traitement en cours du patient ou créez un nouveau soin pour renseigner l'acte réalisé, le versement éventuel et le prochain rendez-vous.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchPatientTraitements();
                      setAddTreatmentMode("existing");
                      setShowAddTreatmentDialog(true);
                    }}
                    className="rounded-xl text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
                  >
                    Sélectionner un soin en cours
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      fetchPatientTraitements();
                      setAddTreatmentMode("new");
                      setShowAddTreatmentDialog(true);
                    }}
                    className="rounded-xl text-xs bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <Plus size={14} className="mr-1" />
                    Nouveau traitement
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* BARRE D'ONGLETS */}
              <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
                {form.traitements.map((tr, idx) => {
                  const isActive = idx === activeTreatmentIndex;
                  return (
                    <div
                      key={`tab-tr-${idx}`}
                      className={`group flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-medium cursor-pointer transition-all border-t border-x -mb-[1px] select-none ${
                        isActive
                          ? "bg-white border-slate-200 border-b-white text-teal-800 font-semibold shadow-sm"
                          : "bg-slate-100/80 border-transparent text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                      }`}
                      onClick={() => setActiveTreatmentIndex(idx)}
                    >
                      <Activity
                        size={14}
                        className={isActive ? "text-teal-600" : "text-slate-400"}
                      />
                      <span className="truncate max-w-[130px]">
                        {tr.description || `Soin #${idx + 1}`}
                      </span>
                      {tr.dent && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-100 text-teal-800 font-semibold">
                          D{tr.dent}
                        </span>
                      )}
                      {tr.traitementId ? (
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                          (En cours)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 font-medium">
                          (Nouveau)
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePromptDelete(
                            "traitementTab",
                            idx,
                            "Retirer ce soin",
                            `Êtes-vous sûr de vouloir retirer le soin "${tr.description}" de cette consultation ?`,
                          );
                        }}
                        className="ml-1 p-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Retirer ce soin"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}

                {/* Bouton '+' pour ajouter un autre soin */}
                <button
                  type="button"
                  onClick={() => {
                    fetchPatientTraitements();
                    setShowAddTreatmentDialog(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100/80 rounded-lg transition ml-2 mb-1"
                  title="Ajouter un autre soin à cette consultation"
                >
                  <Plus size={14} />
                  <span>Ajouter un soin</span>
                </button>
              </div>

              {/* CONTENU DE L'ONGLET ACTIF */}
              {form.traitements[activeTreatmentIndex] && (() => {
                const tr = form.traitements[activeTreatmentIndex];
                return (
                  <div className="p-5 space-y-4">
                    {/* Bannière d'info du soin */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900 text-sm">
                          {tr.description}
                        </span>
                        {tr.dent && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-semibold">
                            Dent {tr.dent}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            tr.traitementId
                              ? "bg-slate-200 text-slate-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {tr.traitementId ? "Traitement suivi" : "Nouveau plan de traitement"}
                        </span>
                      </div>

                      {tr.traitementId ? (
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Prix total : </span>
                            <span className="font-semibold text-slate-800">
                              {Number(tr.prixTotal).toLocaleString("fr-FR")} DZD
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Déjà réglé : </span>
                            <span className="font-semibold text-emerald-700">
                              {Number(tr.totalPaye).toLocaleString("fr-FR")} DZD
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Reste : </span>
                            <span className="font-bold text-amber-700">
                              {Number(tr.resteAPayer).toLocaleString("fr-FR")} DZD
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Prix estimé : </span>
                            <span className="font-bold text-slate-800">
                              {Number(tr.prixTotal).toLocaleString("fr-FR")} DZD
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Champ Requis : Acte réalisé lors de la séance */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                        Acte réalisé lors de cette séance <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={tr.acteRealise || ""}
                        onChange={(e) =>
                          updateActiveTreatment({ acteRealise: e.target.value })
                        }
                        placeholder="Ex: Alésage canalaire et irrigation, mise en place d'un pansement provisoire..."
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white shadow-sm"
                      />
                    </div>

                    {/* Champs Optionnels : Versement & Prochain rendez-vous */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* --- OPTIONNEL 1: VERSEMENT / PAIEMENT DE SÉANCE --- */}
                      <div
                        className={`rounded-xl border transition-all p-3.5 ${
                          tr.hasVersement || tr.versementMontant
                            ? "bg-emerald-50/60 border-emerald-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(tr.hasVersement || tr.versementMontant)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                updateActiveTreatment({
                                  hasVersement: checked,
                                  versementMontant: checked ? tr.versementMontant || "" : "",
                                  versementNote: checked ? tr.versementNote || "" : "",
                                });
                              }}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                            />
                            <span
                              className={`text-xs font-semibold flex items-center gap-1.5 ${
                                tr.hasVersement || tr.versementMontant ? "text-emerald-900" : "text-slate-600"
                              }`}
                            >
                              <DollarSign size={14} className={tr.hasVersement || tr.versementMontant ? "text-emerald-700" : "text-slate-400"} />
                              Versement de séance (Optionnel)
                            </span>
                          </label>
                          {!(tr.hasVersement || tr.versementMontant) ? (
                            <button
                              type="button"
                              onClick={() => updateActiveTreatment({ hasVersement: true })}
                              className="text-[10px] font-medium text-slate-500 hover:text-emerald-700 bg-slate-200/70 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition"
                            >
                              + Activer
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Activé
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Montant versé (DZD)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              disabled={!(tr.hasVersement || tr.versementMontant)}
                              value={tr.versementMontant || ""}
                              onChange={(e) => {
                                updateActiveTreatment({
                                  hasVersement: true,
                                  versementMontant: e.target.value,
                                });
                              }}
                              placeholder="0"
                              className={`h-9 text-xs rounded-lg transition ${
                                tr.hasVersement || tr.versementMontant
                                  ? "bg-white border-emerald-300 focus:ring-emerald-400"
                                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Note / Mode de règlement
                            </label>
                            <Input
                              type="text"
                              disabled={!(tr.hasVersement || tr.versementMontant)}
                              value={tr.versementNote || ""}
                              onChange={(e) => {
                                updateActiveTreatment({
                                  hasVersement: true,
                                  versementNote: e.target.value,
                                });
                              }}
                              placeholder="Ex: Espèces, Acompte séance..."
                              className={`h-9 text-xs rounded-lg transition ${
                                tr.hasVersement || tr.versementMontant
                                  ? "bg-white border-emerald-300 focus:ring-emerald-400"
                                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* --- OPTIONNEL 2: PROCHAIN RENDEZ-VOUS POUR CE SOIN --- */}
                      <div
                        className={`rounded-xl border transition-all p-3.5 ${
                          tr.hasRendezVous || tr.rendezVousDate
                            ? "bg-amber-50/60 border-amber-300 shadow-sm"
                            : "bg-slate-50/60 border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(tr.hasRendezVous || tr.rendezVousDate)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                updateActiveTreatment({
                                  hasRendezVous: checked,
                                  rendezVousDate: checked ? tr.rendezVousDate || "" : "",
                                  rendezVousDescription: checked ? tr.rendezVousDescription || "" : "",
                                });
                              }}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                            />
                            <span
                              className={`text-xs font-semibold flex items-center gap-1.5 ${
                                tr.hasRendezVous || tr.rendezVousDate ? "text-amber-900" : "text-slate-600"
                              }`}
                            >
                              <Calendar size={14} className={tr.hasRendezVous || tr.rendezVousDate ? "text-amber-700" : "text-slate-400"} />
                              Prochain rendez-vous pour ce soin (Optionnel)
                            </span>
                          </label>
                          {!(tr.hasRendezVous || tr.rendezVousDate) ? (
                            <button
                              type="button"
                              onClick={() => updateActiveTreatment({ hasRendezVous: true })}
                              className="text-[10px] font-medium text-slate-500 hover:text-amber-700 bg-slate-200/70 hover:bg-amber-100 px-2 py-0.5 rounded-full transition"
                            >
                              + Activer
                            </button>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Activé
                            </span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Date et heure
                            </label>
                            <Input
                              type="datetime-local"
                              disabled={!(tr.hasRendezVous || tr.rendezVousDate)}
                              value={tr.rendezVousDate || ""}
                              onChange={(e) => {
                                updateActiveTreatment({
                                  hasRendezVous: true,
                                  rendezVousDate: e.target.value,
                                });
                              }}
                              className={`h-9 text-xs rounded-lg transition ${
                                tr.hasRendezVous || tr.rendezVousDate
                                  ? "bg-white border-amber-300 focus:ring-amber-400"
                                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Description / Objet de la prochaine séance
                            </label>
                            <Input
                              type="text"
                              disabled={!(tr.hasRendezVous || tr.rendezVousDate)}
                              value={tr.rendezVousDescription || ""}
                              onChange={(e) => {
                                updateActiveTreatment({
                                  hasRendezVous: true,
                                  rendezVousDescription: e.target.value,
                                });
                              }}
                              placeholder="Ex: Obturation définitive composite..."
                              className={`h-9 text-xs rounded-lg transition ${
                                tr.hasRendezVous || tr.rendezVousDate
                                  ? "bg-white border-amber-300 focus:ring-amber-400"
                                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ====================== */}
        {/* 💾 BOUTON ENREGISTRER */}
        {/* ====================== */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-600)] text-white hover:bg-[var(--color-700)] disabled:opacity-60 shadow-md hover:shadow-lg transition-all font-medium text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enregistrement en cours...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer la consultation
              </>
            )}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🎯 MODAL SÉLECTEUR : AJOUTER À LA CONSULTATION */}
      {/* ======================================================== */}
      <Dialog open={selectorModalOpen} onOpenChange={setSelectorModalOpen}>
        <DialogContent className="sm:max-w-lg p-6 rounded-2xl">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-xl font-bold text-[var(--color-800)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-600)]" />
              Ajouter à la consultation
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Sélectionnez l'élément que vous souhaitez attacher à cette
              consultation :
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3">
            {/* Option 1: Ordonnance / Bilan / Justification */}
            <button
              type="button"
              onClick={() => {
                setSelectorModalOpen(false);
                setOrdonnanceDefaultTab("ordonnance");
                setShowNewOrdonnance(true);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-[var(--color-500)] hover:bg-[var(--color-50)]/50 transition-all text-left group shadow-sm hover:shadow"
            >
              <div className="p-3 rounded-xl bg-[var(--color-100)] text-[var(--color-700)] group-hover:scale-105 transition-transform">
                <Pill className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 group-hover:text-[var(--color-700)]">
                  Ordonnance / Bilan / Justification
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prescription de médicaments, demandes d'analyses ou certificat
                  médical
                </p>
              </div>
            </button>

            {/* Option 2: Radio */}
            <button
              type="button"
              onClick={() => {
                setSelectorModalOpen(false);
                setEditingRadioIndex(null);
                setRadioForm({ description: "", fichier: "" });
                setShowRadioModal(true);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group shadow-sm hover:shadow"
            >
              <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 group-hover:scale-105 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 group-hover:text-indigo-700">
                  Radio / Imagerie
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Joindre un cliché radiologique ou une image médicale
                </p>
              </div>
            </button>

            {/* Option 3: Prochain rendez-vous */}
            <button
              type="button"
              onClick={() => {
                setSelectorModalOpen(false);
                setRendezVousForm({
                  date: form.rendezVousDate || "",
                  description: form.rendezVousDescription || "",
                });
                setShowRendezVousModal(true);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 transition-all text-left group shadow-sm hover:shadow"
            >
              <div className="p-3 rounded-xl bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-800 group-hover:text-amber-700">
                  Prochain rendez-vous
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Planifier la date et l'objet de la prochaine visite
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 💊 MODAL ORDONNANCE / BILAN / JUSTIFICATION (RÉUTILISATION) */}
      {/* ======================================================== */}
      {showNewOrdonnance && (
        <NewOrdanance
          open={true}
          onOpenChange={setShowNewOrdonnance}
          onsave={setordananceData}
          selectedPatient={selectedPatient}
          initialData={form}
          defaultTab={ordonnanceDefaultTab}
        />
      )}

      {/* ======================================================== */}
      {/* 🩻 MODAL RADIO */}
      {/* ======================================================== */}
      <Dialog open={showRadioModal} onOpenChange={setShowRadioModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-800)] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              {editingRadioIndex !== null
                ? "Modifier la radio"
                : "Ajouter une radio"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Renseignez la description et téléversez le cliché radiologique.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRadio} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description / Titre *
              </label>
              <Input
                type="text"
                required
                value={radioForm.description}
                onChange={(e) =>
                  setRadioForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Ex: Radio panoramique, rétro-alvéolaire 14..."
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Fichier (image ou document)
              </label>
              {radioForm.fichier && (
                <div className="mb-2 text-xs text-slate-600 flex items-center justify-between bg-slate-100 p-2 rounded-lg">
                  <span className="truncate max-w-[280px]">
                    Fichier : {radioForm.fichier}
                  </span>
                </div>
              )}
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleRadioFileChange}
                className="h-11 rounded-xl file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-50)] file:text-[var(--color-700)] hover:file:bg-[var(--color-100)]"
              />
              {uploadingRadio && (
                <p className="text-xs text-[var(--color-600)] flex items-center gap-1 mt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Téléversement
                  en cours...
                </p>
              )}
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRadioModal(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={uploadingRadio || !radioForm.description.trim()}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl"
              >
                {editingRadioIndex !== null
                  ? "Enregistrer"
                  : "Ajouter la radio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 📅 MODAL PROCHAIN RENDEZ-VOUS */}
      {/* ======================================================== */}
      <Dialog open={showRendezVousModal} onOpenChange={setShowRendezVousModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[var(--color-800)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              {form.rendezVousDate
                ? "Modifier le rendez-vous"
                : "Planifier le prochain rendez-vous"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Définissez la date et l'objet de la prochaine séance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRendezVous} className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date et heure du rendez-vous *
              </label>
              <Input
                type="datetime-local"
                required
                value={rendezVousForm.date}
                onChange={(e) =>
                  setRendezVousForm((prev) => ({
                    ...prev,
                    date: e.target.value,
                  }))
                }
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Objet / Description
              </label>
              <Input
                type="text"
                value={rendezVousForm.description}
                onChange={(e) =>
                  setRendezVousForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Ex: Séance de soin, détartrage, contrôle..."
                className="h-11 rounded-xl"
              />
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRendezVousModal(false)}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!rendezVousForm.date}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl"
              >
                Enregistrer le rendez-vous
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 🦷 MODAL : AJOUTER UN SOIN (EXISTANT OU NOUVEAU) */}
      {/* ======================================================== */}
      <Dialog
        open={showAddTreatmentDialog}
        onOpenChange={(open) => setShowAddTreatmentDialog(open)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader className="text-left mb-2">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-600" />
              Ajouter un soin dentaire
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Choisissez un soin en cours de ce patient ou initialisez un nouveau traitement dentaire.
            </DialogDescription>
          </DialogHeader>

          {/* Sélecteur de mode : Existant vs Nouveau */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAddTreatmentMode("existing")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                addTreatmentMode === "existing"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Traitement en cours ({patientTraitements.length})
            </button>
            <button
              type="button"
              onClick={() => setAddTreatmentMode("new")}
              className={`flex-1 py-2 rounded-lg transition-all ${
                addTreatmentMode === "new"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              + Nouveau traitement
            </button>
          </div>

          {addTreatmentMode === "existing" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sélectionner un traitement en cours *
                </label>
                {loadingTraitements ? (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    Chargement des traitements...
                  </div>
                ) : patientTraitements.length === 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                    <span>
                      Aucun traitement en cours pour ce patient.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setAddTreatmentMode("new")}
                      className="text-xs bg-white text-amber-900"
                    >
                      + Nouveau
                    </Button>
                  </div>
                ) : (
                  <select
                    value={selectedExistingId}
                    onChange={(e) => setSelectedExistingId(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                  >
                    <option value="">
                      -- Choisissez un traitement ({patientTraitements.length}) --
                    </option>
                    {patientTraitements.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.description} {t.dent ? `(Dent ${t.dent})` : ""} - Reste:{" "}
                        {Number(t.resteAPayer).toLocaleString("fr-FR")} DZD
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Aperçu du traitement sélectionné */}
              {selectedExistingId && (() => {
                const sel = patientTraitements.find(
                  (t) => t.id === Number(selectedExistingId),
                );
                if (!sel) return null;
                return (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-slate-500 block">Prix Total</span>
                      <span className="font-bold text-slate-800">
                        {Number(sel.prixTotal).toLocaleString("fr-FR")} DZD
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Déjà payé</span>
                      <span className="font-bold text-emerald-600">
                        {Number(sel.totalPaye).toLocaleString("fr-FR")} DZD
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Reste</span>
                      <span className="font-bold text-amber-700">
                        {Number(sel.resteAPayer).toLocaleString("fr-FR")} DZD
                      </span>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddTreatmentDialog(false)}
                  className="rounded-xl text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={!selectedExistingId}
                  onClick={handleAddExistingTreatment}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs"
                >
                  Ajouter cet onglet de soin
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description du soin *
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Ex: Soin carie, Dévitalisation, Pose couronne..."
                    value={newTreatmentFields.description}
                    onChange={(e) =>
                      setNewTreatmentFields((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Dent
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: 16, 24, 36..."
                    value={newTreatmentFields.dent}
                    onChange={(e) =>
                      setNewTreatmentFields((prev) => ({
                        ...prev,
                        dent: e.target.value,
                      }))
                    }
                    className="h-10 rounded-xl bg-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prix Total Estimé (DZD) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Ex: 15000"
                  value={newTreatmentFields.prixTotal}
                  onChange={(e) =>
                    setNewTreatmentFields((prev) => ({
                      ...prev,
                      prixTotal: e.target.value,
                    }))
                  }
                  className="h-10 rounded-xl bg-white text-xs"
                />
              </div>

              <DialogFooter className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddTreatmentDialog(false)}
                  className="rounded-xl text-xs"
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={!newTreatmentFields.description.trim()}
                  onClick={handleAddNewTreatment}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs"
                >
                  Créer et ajouter cet onglet
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* ⚠️ MODAL DE CONFIRMATION DE SUPPRESSION */}
      {/* ======================================================== */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {deleteConfirm.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 mt-2">{deleteConfirm.message}</p>
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDeleteConfirm({
                  open: false,
                  type: "",
                  index: null,
                  title: "",
                  message: "",
                })
              }
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
