"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Trash2,
  FileText,
  Clock,
  Edit3,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";
import Swal from "sweetalert2";
import NewOrdanance from "@/app/component/NewOrdanance/page";
// ✅ Pediatric Age Calculation
function calculateAge(dateString) {
  if (!dateString) return "";

  const birthDate = new Date(dateString);
  const today = new Date();

  const diffMs = today - birthDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30.44);
  const diffYears = Math.floor(diffMonths / 12);

  if (diffDays < 30) return `${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  if (diffMonths < 24) return `${diffMonths} mois`;

  const remainingMonths = diffMonths % 12;
  if (remainingMonths === 0)
    return `${diffYears} an${diffYears > 1 ? "s" : ""}`;
  return `${diffYears} an${
    diffYears > 1 ? "s" : ""
  } et ${remainingMonths} mois`;
}

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

export default function OrdBilanPage({
  patientId,
  query,
  dateFilter,
  selectedPatient,
}) {
  const [tab, setTab] = useState("ord");
  const [ordonnances, setOrdonnances] = useState([]);
  const [bilans, setBilans] = useState([]);
  const [justifications, setJustifications] = useState([]);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null);
  const [selectedBilan, setSelectedBilan] = useState(null);
  const [selectedJustification, setSelectedJustification] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtredOrd, setFiltredOrd] = useState([]);
  const [filtredBilan, setFiltredBilan] = useState([]);
  const [filtredJustif, setFiltredJustif] = useState([]);

  // ✏️ Edit Modal state
  const [editModal, setEditModal] = useState({
    open: false,
    type: null, // "ord" | "bilan" | "justif"
    id: null,
    item: null,
    initialData: null,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // 🧾 Fetch ordonnances
  const fetchOrdonnances = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/Ordonnance?patientId=${patientId}`);
      const data = await res.json();
      setOrdonnances(Array.isArray(data) ? data : []);
      setFiltredOrd(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetching ordonnances:", err);
    }
  };

  // 🧪 Fetch bilans reçus
  const fetchBilans = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/BilanRecip?patientId=${patientId}`);
      const data = await res.json();
      setBilans(Array.isArray(data) ? data : []);
      setFiltredBilan(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetching bilans:", err);
    }
  };

  // 📄 Fetch justifications
  const fetchJustifications = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/Justifications?patientId=${patientId}`);
      const data = await res.json();
      setJustifications(Array.isArray(data) ? data : []);
      setFiltredJustif(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetching justifications:", err);
    }
  };

  useEffect(() => {
    fetchOrdonnances();
    fetchBilans();
    fetchJustifications();
  }, [patientId, selectedPatient]);

  useEffect(() => {
    const q = query ? query.trim().toLowerCase() : "";

    const filtredO =
      ordonnances?.filter((v) => {
        const matchesQuery = !q || v.id.toString().includes(q);
        const matchesDate = isSameDate(v.createdAt, dateFilter);
        return matchesQuery && matchesDate;
      }) || [];
    setFiltredOrd(filtredO);

    const filtredB =
      bilans?.filter((v) => {
        const matchesQuery = !q || v.id.toString().includes(q);
        const matchesDate = isSameDate(v.createdAt, dateFilter);
        return matchesQuery && matchesDate;
      }) || [];
    setFiltredBilan(filtredB);

    const filtredJ =
      justifications?.filter((v) => {
        const matchesQuery =
          !q ||
          v.id.toString().includes(q) ||
          (v.texte && v.texte.toLowerCase().includes(q));
        const matchesDate = isSameDate(v.createdAt, dateFilter);
        return matchesQuery && matchesDate;
      }) || [];
    setFiltredJustif(filtredJ);
  }, [query, dateFilter, tab, ordonnances, bilans, justifications]);

  // 🗑 Delete Handling
  const confirmDelete = (type, item) => {
    setDeleteType(type);
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete || !deleteType) return;
    setLoading(true);
    try {
      const endpoint =
        deleteType === "ord"
          ? `/api/Ordonnance?id=${itemToDelete.id}`
          : deleteType === "bilan"
            ? `/api/BilanRecip?id=${itemToDelete.id}`
            : `/api/Justifications?id=${itemToDelete.id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      setDeleteDialogOpen(false);
      setItemToDelete(null);
      if (deleteType === "ord") fetchOrdonnances();
      else if (deleteType === "bilan") fetchBilans();
      else fetchJustifications();
    } catch (err) {
      console.error("❌ Error deleting:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✏️ Open Edit Modal for a single document
  const handleOpenEdit = (type, item) => {
    if (!item) return;
    if (type === "ord") {
      setEditModal({
        open: true,
        type: "ord",
        id: item.id,
        item,
        initialData: {
          ordonnance: {
            items: (item.items || []).map((it) => ({
              medicamentId: it.medicamentId || it.medicament?.id || it.id,
              nom: it.medicament?.nom || it.nom || "",
              form: it.medicament?.form || it.form || "",
              dosage: it.dosage || "",
              frequence: it.frequence || "",
              duree: it.duree || "",
              quantite: Number(it.quantite) > 0 ? Number(it.quantite) : 1,
            })),
          },
        },
      });
    } else if (type === "bilan") {
      setEditModal({
        open: true,
        type: "bilan",
        id: item.id,
        item,
        initialData: {
          bilanRecip: {
            items: (item.items || []).map((it) => ({
              id: it.bilan?.id || it.bilanId || it.id,
              nom: it.bilan?.nom || it.nom || "",
              bilanId: it.bilanId || it.bilan?.id || it.id,
              resultat: it.resultat || null,
              remarque: it.remarque || null,
            })),
          },
        },
      });
    } else if (type === "justif") {
      setEditModal({
        open: true,
        type: "justif",
        id: item.id,
        item,
        initialData: {
          justification: {
            id: item.id,
            texte: item.texte || "",
          },
        },
      });
    }
  };

  // 💾 Save Edited Document
  const handleSaveEdit = async (data) => {
    setSavingEdit(true);
    try {
      if (editModal.type === "ord") {
        if (!data.prescriptionItems || data.prescriptionItems.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "Attention",
            text: "L'ordonnance doit contenir au moins un médicament.",
          });
          return;
        }

        const res = await fetch("/api/Ordonnance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editModal.id,
            items: data.prescriptionItems.map((it) => ({
              medicamentId: it.medicamentId,
              dosage: it.dosage || "",
              frequence: it.frequence || "",
              duree: it.duree || "",
              quantite: Number(it.quantite) > 0 ? Number(it.quantite) : 1,
            })),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || "Erreur lors de la mise à jour de l'ordonnance",
          );
        }

        await fetchOrdonnances();
        setEditModal({
          open: false,
          type: null,
          id: null,
          item: null,
          initialData: null,
        });
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Ordonnance modifiée avec succès !",
          timer: 1800,
          showConfirmButton: false,
        });
      } else if (editModal.type === "bilan") {
        if (!data.labItems || data.labItems.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "Attention",
            text: "Le bilan doit contenir au moins un examen.",
          });
          return;
        }

        const res = await fetch("/api/BilanRecip", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editModal.id,
            items: data.labItems.map((it) => ({
              bilanId: it.bilanId || it.id,
              resultat: it.resultat || null,
              remarque: it.remarque || null,
            })),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || "Erreur lors de la mise à jour du bilan",
          );
        }

        await fetchBilans();
        setEditModal({
          open: false,
          type: null,
          id: null,
          item: null,
          initialData: null,
        });
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Bilan modifié avec succès !",
          timer: 1800,
          showConfirmButton: false,
        });
      } else if (editModal.type === "justif") {
        if (!data.justifText || !data.justifText.trim()) {
          Swal.fire({
            icon: "warning",
            title: "Attention",
            text: "Le texte de la justification ne peut pas être vide.",
          });
          return;
        }

        const res = await fetch("/api/Justifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editModal.id,
            texte: data.justifText.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              "Erreur lors de la mise à jour de la justification",
          );
        }

        await fetchJustifications();
        setEditModal({
          open: false,
          type: null,
          id: null,
          item: null,
          initialData: null,
        });
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: "Justification modifiée avec succès !",
          timer: 1800,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("❌ Erreur lors de la modification:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          err.message || "Une erreur est survenue lors de l'enregistrement.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // 🖨️ Print Ordonnance
  const handlePrintOrdonnanceElectron = async (ord) => {
    try {
      if (!ord.items || ord.items.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Information",
          text: "Aucune donnée à imprimer.",
        });
        return;
      }
      // console.log(JSON.stringify(ord));
      const fullname = selectedPatient?.nom || "";
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

      const datenaissance = selectedPatient?.dateDeNaissance;
      const age = calculateAge(datenaissance);

      // const res = await fetch("/api/last-records");
      // const data = await res.json();

      const nextConsultationId = ord.consultationId;
      const nextOrdonnanceId = ord.id;
      console.log(
        "nextConsultationId" +
          nextConsultationId +
          "/nextOrdonnanceId" +
          nextOrdonnanceId,
      );
      printOrdonnance({
        consultationId: nextConsultationId,
        ordonnanceId: nextOrdonnanceId,
        nom,
        prenom,
        age,
        items: ord.items.map((it) => ({
          name: it.medicament?.nom,
          dosage: it.dosage,
          duration: it.duree,
          frequency: it.frequence,
          quantity: it.quantite,
        })),
      });
    } catch (err) {
      console.error("Erreur lors de l'impression de l'ordonnance:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de l'impression de l'ordonnance.",
      });
    }
  };

  // 🖨️ Print Bilan
  const handlePrintBilanElectron = async (bilan) => {
    try {
      if (!bilan.items || bilan.items.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Information",
          text: "Aucun examen à imprimer.",
        });
        return;
      }
      // console.log(JSON.stringify(bilan));
      const fullname = selectedPatient?.nom || "";
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

      const datenaissance = selectedPatient?.dateDeNaissance;
      const age = calculateAge(datenaissance);

      // const res = await fetch("/api/last-records");
      // const data = await res.json();

      const nextBilanId = bilan.id || 0;
      const nextConsultationId = bilan.consultationId || 0;

      printBilan({
        bilanId: nextBilanId,
        consultationId: nextConsultationId,
        nom,
        prenom,
        age,
        items: bilan.items.map((exam) => ({
          id: exam.id,
          nom: exam.bilan?.nom,
        })),
      });
    } catch (err) {
      console.error("Erreur lors de l'impression du bilan:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de l'impression du bilan.",
      });
    }
  };

  // 💾 Save updated bilan items (each has resultat & remarque)
  const handleSaveBilan = async (bilan) => {
    try {
      const res = await fetch(`/api/BilanRecip`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bilan.id, // ✅ now included in body, as your API expects
          items: bilan?.items?.map((it) => ({
            bilanId: it.bilanId, // ✅ backend expects this to recreate items
            resultat: it.resultat || null,
            remarque: it.remarque || null,
          })),
        }),
      });

      if (!res.ok) throw new Error("Erreur lors de la sauvegarde du bilan");
      const updated = await res.json();

      //   setBilans((prev) => prev.map((b) => (b.id === bilan.id ? updated : b)));
      fetchBilans();
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Bilan mis à jour avec succès !",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("❌ Erreur lors de la sauvegarde du bilan:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de la sauvegarde du bilan.",
      });
    }
  };
  // 🧠 Handle input change for Bilan item (résultat / remarque)
  const handleChangeBilanItem = (bilanId, itemIndex, field, value) => {
    // نصنع نسخة جديدة من قائمة bilans
    const updatedBilans = bilans.map((b) => {
      if (b.id !== bilanId) return b;

      // نصنع نسخة جديدة من items
      const updatedItems = b.items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item,
      );

      return { ...b, items: updatedItems };
    });

    setBilans(updatedBilans);

    // تحديث bilan المفتوح في الحوار (Dialog)
    setSelectedBilan((prev) =>
      prev?.id === bilanId
        ? {
            ...prev,
            items: prev.items.map((item, index) =>
              index === itemIndex ? { ...item, [field]: value } : item,
            ),
          }
        : prev,
    );
  };

  // 📄 Print Justification
  const handlePrintJustificationElectron = async (justif) => {
    try {
      if (!justif.texte || !justif.texte.trim()) {
        Swal.fire({
          icon: "info",
          title: "Information",
          text: "Aucun texte de justification à imprimer.",
        });
        return;
      }
      const fullname = selectedPatient?.nom || "";
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

      const datenaissance = selectedPatient?.dateDeNaissance;
      const age = calculateAge(datenaissance);

      printJustification({
        justificationId: justif.id,
        consultationId: justif.consultationId,
        nom,
        prenom,
        age,
        texte: justif.texte,
      });
    } catch (err) {
      console.error("Erreur lors de l'impression de la justification:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de l'impression de la justification.",
      });
    }
  };

  // 💾 Save updated justification
  const handleSaveJustification = async (justif) => {
    try {
      const res = await fetch(`/api/Justifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: justif.id,
          texte: justif.texte,
        }),
      });

      if (!res.ok)
        throw new Error("Erreur lors de la sauvegarde de la justification");
      fetchJustifications();
      Swal.fire({
        icon: "success",
        title: "Succès",
        text: "Justification mise à jour avec succès !",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error(
        "❌ Erreur lors de la sauvegarde de la justification:",
        err,
      );
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Erreur lors de la sauvegarde de la justification.",
      });
    }
  };

  // 🧠 Handle input change for Justification
  const handleChangeJustification = (id, field, value) => {
    const updated = justifications.map((j) =>
      j.id === id ? { ...j, [field]: value } : j,
    );
    setJustifications(updated);

    setSelectedJustification((prev) =>
      prev?.id === id ? { ...prev, [field]: value } : prev,
    );
  };

  if (!patientId)
    return <p className="text-gray-500 text-center mt-10">Aucun patient.</p>;
  return (
    <div className="p-0 max-w-6xl mx-auto">
      <Tabs
        defaultValue="ord"
        value={tab}
        onValueChange={setTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-[var(--color-100)] p-1 rounded-lg">
          <TabsTrigger
            value="ord"
            className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[var(--color-700)]"
          >
            Ordonnances ({ordonnances.length})
          </TabsTrigger>
          <TabsTrigger
            value="bilan"
            className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[var(--color-700)]"
          >
            Bilans reçus ({bilans.length})
          </TabsTrigger>
          <TabsTrigger
            value="justif"
            className="rounded-md data-[state=active]:bg-white data-[state=active]:text-[var(--color-700)]"
          >
            Justifications ({justifications.length})
          </TabsTrigger>
        </TabsList>

        {/* 🧾 Ordonnances */}
        <TabsContent value="ord" className="mt-6">
          {filtredOrd?.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              Aucune ordonnance trouvée.
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[var(--color-100)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r bg-[var(--color-400)] text-white">
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtredOrd.map((ord, index) => (
                      <Dialog
                        key={ord.id}
                        open={selectedOrdonnance?.id === ord.id}
                        onOpenChange={(open) =>
                          !open && setSelectedOrdonnance(null)
                        }
                      >
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-[var(--color-50)] ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          onClick={() => setSelectedOrdonnance(ord)}
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[var(--color-100)] text-[var(--color-800)]">
                              Ordonnance #{ord.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                              <Calendar
                                size={16}
                                className="text-[var(--color-500)]"
                              />
                              {new Date(ord.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-[var(--color-100)] text-[var(--color-700)] transition-colors"
                                title="Modifier l'ordonnance"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit("ord", ord);
                                }}
                              >
                                <Edit3 size={17} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                title="Supprimer l'ordonnance"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete("ord", ord);
                                }}
                              >
                                <Trash2 size={17} />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        <DialogContent className="sm:min-w-4xl w-full bg-white rounded-xl p-6 shadow-lg">
                          <DialogHeader>
                            <DialogTitle className="text-[var(--color-700)] text-lg font-semibold">
                              Détails de l'Ordonnance #{ord.id}
                            </DialogTitle>
                          </DialogHeader>

                          {ord.items?.length > 0 ? (
                            <>
                              <div className="mt-4 border border-[var(--color-100)] rounded-xl overflow-hidden">
                                <table className="w-full border-collapse text-sm">
                                  <thead className="bg-[var(--color-100)] text-[var(--color-700)]">
                                    <tr>
                                      <th className="text-left py-3 px-4 font-semibold">
                                        Médicament
                                      </th>
                                      <th className="text-left py-3 px-4 font-semibold">
                                        Dosage
                                      </th>
                                      <th className="text-left py-3 px-4 font-semibold">
                                        Fréquence
                                      </th>
                                      <th className="text-left py-3 px-4 font-semibold">
                                        Durée
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ord.items.map((item, i) => (
                                      <tr
                                        key={i}
                                        className="border-b border-[var(--color-100)] hover:bg-[var(--color-50)] transition-colors"
                                      >
                                        <td className="py-3 px-4 font-medium text-gray-800">
                                          {item.medicament?.nom || "—"}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                          {item.dosage || "—"}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                          {item.frequence || "—"}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                          {item.duree || "—"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex justify-end gap-2 mt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrdonnance(null);
                                    handleOpenEdit("ord", ord);
                                  }}
                                  className="border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)]"
                                >
                                  <Edit3 size={16} className="mr-1.5" />
                                  Modifier
                                </Button>
                                <Button
                                  onClick={() =>
                                    handlePrintOrdonnanceElectron(ord)
                                  }
                                  className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white"
                                >
                                  🖨️ Imprimer l'Ordonnance
                                </Button>
                              </div>
                            </>
                          ) : (
                            <p className="text-gray-500 text-center py-4">
                              Aucun médicament dans cette ordonnance.
                            </p>
                          )}
                        </DialogContent>
                      </Dialog>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 🧪 Bilans reçus */}
        <TabsContent value="bilan" className="mt-6">
          {filtredBilan?.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              Aucun bilan reçu trouvé.
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-blue-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[var(--color-400)] text-white">
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtredBilan.map((bilan, index) => (
                      <Dialog
                        key={bilan.id}
                        open={selectedBilan?.id === bilan.id}
                        onOpenChange={(open) => !open && setSelectedBilan(null)}
                      >
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          onClick={() => setSelectedBilan(bilan)}
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[var(--color-100)] text-[var(--color-800)]">
                              Bilan reçu #{bilan.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                              <Calendar
                                size={16}
                                className="text-[var(--color-500)]"
                              />
                              {new Date(bilan.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors"
                                title="Modifier le bilan"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit("bilan", bilan);
                                }}
                              >
                                <Edit3 size={17} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                title="Supprimer le bilan"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete("bilan", bilan);
                                }}
                              >
                                <Trash2 size={17} />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {selectedBilan?.id === bilan.id && (
                          <DialogContent className="sm:min-w-4xl w-full bg-white rounded-xl p-6 shadow-lg">
                            <DialogHeader>
                              <DialogTitle className="text-green-700 text-lg font-semibold">
                                Détails du Bilan #{selectedBilan.id}
                              </DialogTitle>
                            </DialogHeader>

                            {selectedBilan.items?.length > 0 ? (
                              <>
                                <div className="mt-4 border border-green-100 rounded-xl overflow-hidden">
                                  <table className="w-full border-collapse text-sm">
                                    <thead className="bg-green-100 text-green-700">
                                      <tr>
                                        <th className="text-left py-3 px-4 font-semibold">
                                          Nom du Bilan
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold">
                                          Résultat
                                        </th>
                                        <th className="text-left py-3 px-4 font-semibold">
                                          Remarque
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedBilan.items.map((item, i) => (
                                        <tr
                                          key={i}
                                          className="border-b border-green-100 hover:bg-green-50 transition-colors"
                                        >
                                          <td className="py-3 px-4 font-medium text-gray-800">
                                            {item.bilan?.nom || "—"}
                                          </td>
                                          <td className="py-3 px-4">
                                            <input
                                              type="text"
                                              placeholder="Résultat..."
                                              value={item.resultat || ""}
                                              onChange={(e) =>
                                                handleChangeBilanItem(
                                                  selectedBilan.id,
                                                  i,
                                                  "resultat",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full border rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500"
                                            />
                                          </td>
                                          <td className="py-3 px-4">
                                            <textarea
                                              placeholder="Remarques..."
                                              value={item.remarque || ""}
                                              onChange={(e) =>
                                                handleChangeBilanItem(
                                                  selectedBilan.id,
                                                  i,
                                                  "remarque",
                                                  e.target.value,
                                                )
                                              }
                                              className="w-full border rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500"
                                              rows={1}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBilan(null);
                                      handleOpenEdit("bilan", selectedBilan);
                                    }}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit3 size={16} className="mr-1.5" />
                                    Modifier
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handlePrintBilanElectron(selectedBilan)
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    🖨️ Imprimer le Bilan
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      handleSaveBilan(selectedBilan)
                                    }
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    💾 Enregistrer
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-500 text-center py-4">
                                Aucun élément dans ce bilan.
                              </p>
                            )}
                          </DialogContent>
                        )}
                      </Dialog>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 📄 Justifications Médicales */}
        <TabsContent value="justif" className="mt-6">
          {filtredJustif?.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">
              Aucune justification médicale trouvée.
            </p>
          ) : (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-purple-100">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Objet / Titre
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtredJustif.map((justif, index) => (
                      <Dialog
                        key={justif.id}
                        open={selectedJustification?.id === justif.id}
                        onOpenChange={(open) =>
                          !open && setSelectedJustification(null)
                        }
                      >
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-purple-50/50 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          onClick={() =>
                            setSelectedJustification({ ...justif })
                          }
                        >
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                              Justification #{justif.id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-800 line-clamp-2">
                              {justif.texte || "Justification médicale"}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                              <Calendar size={16} className="text-purple-600" />
                              {new Date(justif.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-colors"
                                title="Modifier la justification"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit("justif", justif);
                                }}
                              >
                                <Edit3 size={17} />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors"
                                title="Supprimer la justification"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete("justif", justif);
                                }}
                              >
                                <Trash2 size={17} />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {selectedJustification?.id === justif.id && (
                          <DialogContent className="sm:max-w-2xl w-full bg-white rounded-xl p-6 shadow-xl">
                            <DialogHeader>
                              <DialogTitle className="text-purple-700 text-lg font-semibold flex items-center gap-2">
                                <FileText size={20} />
                                Détails de la Justification Médicale #
                                {selectedJustification.id}
                              </DialogTitle>
                            </DialogHeader>

                            <div className="mt-4 space-y-4">
                              {/* Texte médical */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Description / Texte de la justification
                                </label>
                                <textarea
                                  rows={6}
                                  value={selectedJustification.texte || ""}
                                  onChange={(e) =>
                                    handleChangeJustification(
                                      selectedJustification.id,
                                      "texte",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Saisissez la justification médicale..."
                                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedJustification(null);
                                  handleOpenEdit(
                                    "justif",
                                    selectedJustification,
                                  );
                                }}
                                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                              >
                                <Edit3 size={16} className="mr-1.5" />
                                Modifier
                              </Button>
                              <Button
                                onClick={() =>
                                  handlePrintJustificationElectron(
                                    selectedJustification,
                                  )
                                }
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                🖨️ Imprimer la Justification
                              </Button>
                              <Button
                                onClick={() =>
                                  handleSaveJustification(selectedJustification)
                                }
                                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white"
                              >
                                💾 Enregistrer
                              </Button>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 🗑 Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Confirmation de suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✏️ Edit Document Modal */}
      {editModal.open && (
        <NewOrdanance
          open={editModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setEditModal({
                open: false,
                type: null,
                id: null,
                item: null,
                initialData: null,
              });
            }
          }}
          selectedPatient={
            selectedPatient ||
            (editModal.item?.patient ? editModal.item.patient : null) || {
              id: patientId,
            }
          }
          initialData={editModal.initialData}
          initialTab={
            editModal.type === "ord"
              ? "ordonnance"
              : editModal.type === "bilan"
                ? "labs"
                : "justif"
          }
          editMode={true}
          editDocType={
            editModal.type === "ord"
              ? "ordonnance"
              : editModal.type === "bilan"
                ? "bilan"
                : "justif"
          }
          editDocId={editModal.id}
          onSaveEdit={handleSaveEdit}
          isSavingEdit={savingEdit}
        />
      )}
    </div>
  );
}
