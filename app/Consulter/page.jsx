"use client";
import Swal from "sweetalert2";

import {
  Plus,
  Search,
  Calendar,
  User,
  Phone,
  Home,
  Clock,
  ClipboardList,
  FileText,
  Stethoscope,
  Activity,
  Droplets,
  FilePlus,
  UserCircle,
  Mail,
  MapPin,
  Sparkles,
  Keyboard,
  Files,
  DollarSign,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  Receipt,
  Printer,
  Pill,
  FlaskConical,
  Loader2,
} from "lucide-react";
import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";

import {
  DialogDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import SuccessModal from "@/app/component/success/page";
import { Card, CardContent } from "@/components/ui/card";
import NewOrdanance from "@/app/component/NewOrdanance/page";
import AddVaccinationButton from "../component/NewVaccination/page";
import { useState, useMemo, useEffect, useRef } from "react";
import VaccinationsPage from "@/app/component/Vaccination/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AjouteModal from "@/app/component/NewPatient/page";
import NewConsultationPage from "../component/NewConsultation/page";
import Analyses from "../component/Analyses/page";
import PatientVisits from "../component/Visites/page";
import Ordonnances from "../component/Ordanance/page";
import LoadingScreen from "../component/LoadingScreen/page";
import { motion, AnimatePresence } from "framer-motion";
import ModernSearchBar from "../component/SearchBar/SearchBar";
import DatePickerFilter from "../component/DatePickerFilter/DatePickerFilter";
import VisitsInfoModal from "@/app/component/Infomedical";
import FinanceHistoryModal from "@/app/component/Finances/FinanceHistoryModal";
import TraitementsTab from "@/app/component/Traitements/TraitementsTab";
import FinancesPatientTab from "@/app/component/Finances/FinancesPatientTab";
import TraitementDetailModal from "@/app/component/Traitements/TraitementDetailModal";
import { tabs } from "@heroui/theme";
export default function PatientDashboard() {
  const searchRef = useRef();
  const [selectedPatient, setSelectedPatient] = useState();
  const [preselectedTraitement, setPreselectedTraitement] = useState(null);
  const [selectedTreatmentDetail, setSelectedTreatmentDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState([]);
  const [visitsinfo, setVisitsinfo] = useState(false);
  const [financeHistoryOpen, setFinanceHistoryOpen] = useState(false);
  const [refrech, setrefrech] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedtab, setselectedtab] = useState("Informations Patient");
  const [NewConsultation, setNewConsultation] = useState(false);
  const [patientsData, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ShowAddDialogNewAnalyse, setShowAddDialogNewAnalyse] = useState(false);
  const [showNewTraitement, setShowNewTraitement] = useState(false);
  const [showNewVersement, setShowNewVersement] = useState(false);
  const [NewConsultationData, setNewConsultationData] = useState(null);
  const [lastid, setlastid] = useState(null);
  const [openNewordanance, setnewordanance] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [load, setload] = useState(false);
  const [query, setquery] = useState({
    visites: "",
    ord: "",
    vaccination: "",
    traitements: "",
    finances: "",
  });
  const [dateFilter, setDateFilter] = useState({
    visites: "",
    analyses: "",
    ord: "",
    vaccination: "",
    traitements: "",
    finances: "",
  });
  const [successopen, setsuccessopen] = useState(false);
  const [DateTimeModal, setDataTimeModel] = useState(false);
  const [openAddElementModal, setOpenAddElementModal] = useState(false);
  const [viderForm, setViderForm] = useState(false);
  const [postSaveData, setPostSaveData] = useState(null);
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [printingDocs, setPrintingDocs] = useState({
    ord: false,
    bilan: false,
    justif: false,
  });
  const [Age, setAge] = useState();
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0], // "YYYY-MM-DD"
  );
  const [time, setTime] = useState(
    new Date().toTimeString().slice(0, 5), // "HH:MM"
  );
  const [config, setConfig] = useState({
    title: "Payment Successful!",
    description:
      "Your payment has been processed successfully. You'll receive a confirmation email shortly.",
    autoClose: true,
    loadingText: "Traitement en cours...",

    autoCloseDelay: 100,
  });
  function calculateAge(dateString) {
    if (!dateString) return "";

    const birthDate = new Date(dateString);
    const today = new Date();

    const diffMs = today - birthDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30.44); // approx. average month length
    const diffYears = Math.floor(diffMonths / 12);

    if (diffDays < 30) {
      // less than 1 month
      return `${diffDays} jour${diffDays > 1 ? "s" : ""}`;
    } else if (diffMonths < 24) {
      // less than 2 years
      return `${diffMonths} mois`;
    } else {
      // 2 years or older
      return `${diffYears} an${diffYears > 1 ? "s" : ""}`;
    }
  }
  useEffect(() => {
    if (!selectedPatient) return;

    const datenaissance = selectedPatient.dateDeNaissance;
    const age = calculateAge(datenaissance);
    setAge(age);
    // console.log("Age:", age);
  }, [selectedPatient]);

  const filteredPatients = patientsData.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()),
  );
  const handleChange = (value) => {
    let att = "ord";
    if (selectedtab === "Visites") att = "visites";
    else if (selectedtab === "Vaccinations") att = "vaccination";
    else if (selectedtab === "Traitements") att = "traitements";
    else if (selectedtab === "Finances & Crédits") att = "finances";
    setquery((prev) => ({ ...prev, [att]: value }));
  };

  const handleDateChange = (value) => {
    let key = "ord";
    if (selectedtab === "Visites") key = "visites";
    else if (selectedtab === "Analyses et Résultats") key = "analyses";
    else if (selectedtab === "Vaccinations") key = "vaccination";
    else if (selectedtab === "Traitements") key = "traitements";
    else if (selectedtab === "Finances & Crédits") key = "finances";
    setDateFilter((prev) => ({ ...prev, [key]: value }));
  };

  const handlesaveOrdanance = (data) => {
    setNewConsultationData({
      note: "",
      ordonnance: data.ordonnance,
      bilanRecip: data.bilanRecip,
    });
  };

  function handleFileAdd(e) {
    const file = e.target.files[0];
    if (file) {
      setFiles((prev) => [...prev, { file, type: "bilan" }]);
    }
  }

  function handleFileTypeChange(index, value) {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, type: value } : f)),
    );
  }

  function handleFileRemove(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function addConsultation(formData) {
    setlastid(selectedPatient?.id);
    console.log(formData);
    const dateTime = new Date(`${date}T${time}:00`);

    // ✅ Check if at least one field has data
    const hasData =
      formData.note?.trim() ||
      formData.motifDeConsultation?.trim() ||
      formData.rendezVousDate ||
      formData?.ordonnance?.items?.length > 0 ||
      formData?.bilanRecip?.items?.length > 0 ||
      formData?.justification ||
      formData?.radios?.length > 0 ||
      formData?.traitements?.length > 0;

    if (!hasData) {
      // ❌ Replace alert with SweetAlert
      Swal.fire({
        icon: "error",
        title: "Champs requis",
        text: "Veuillez remplir au moins un champ avant de créer la consultation.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    const hasPrintableDocs = Boolean(
      formData?.ordonnance?.items?.length > 0 ||
      formData?.bilanRecip?.items?.length > 0 ||
      formData?.justification,
    );

    if (!hasPrintableDocs) {
      setConfig({
        title: "Nouvelle consultation ajoutée !",
        description: "La consultation du patient a été ajoutée avec succès.",
      });
      setsuccessopen(true);
    }
    setload(true);

    try {
      const response = await fetch("/api/Consulter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          createdAt: dateTime.toISOString(),

          patientId: selectedPatient?.id,
          note: formData.note?.trim() || "",

          motifDeConsultation: formData.motifDeConsultation?.trim() || null,
          justification:
            typeof formData.justification === "string"
              ? formData.justification
              : formData.justification?.texte || null,
          justificationRecord:
            typeof formData.justification === "object"
              ? formData.justification
              : null,
          rendezVousDate: formData.rendezVousDate || null,
          rendezVousDescription: formData.rendezVousDescription?.trim() || null,

          // ✅ Radios
          radios: formData.radios || [],

          // ✅ Traitements & actes de séance
          traitements: formData.traitements || [],

          // ✅ Ordonnance
          ordonnance:
            formData?.ordonnance?.items?.length > 0
              ? {
                  items: formData.ordonnance.items.map((item) => ({
                    medicamentId: item.medicamentId,
                    dosage: item.dosage,
                    frequence: item.frequence,
                    duree: item.duree,
                    quantite: item.quantite,
                  })),
                }
              : undefined,

          // ✅ Bilan
          bilanRecip:
            formData?.bilanRecip?.items?.length > 0
              ? {
                  items: formData.bilanRecip.items.map((item) => ({
                    bilanId: item.id || item.bilanId,
                    resultat: null,
                    remarque: item.remarque || null,
                  })),
                }
              : undefined,
        }),
      });

      if (!response.ok) {
        setsuccessopen(false);
        const err = await response.json().catch(() => ({}));
        throw new Error(
          err.error || "Erreur lors de la création de la consultation",
        );
      }

      const consultation = await response.json();
      console.log("✅ Consultation créée:", consultation);
      setViderForm(true);
      // ✅ Refresh only the selected patient
      if (selectedPatient?.id) {
        await fetchPatientById(selectedPatient.id);
      }
      setnewordanance(false);
      return consultation;
    } catch (error) {
      console.error("❌ addConsultation error:", error);
      setsuccessopen(false);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          error?.message || "Erreur lors de la création de la consultation.",
        confirmButtonColor: "#d33",
      });
      throw error;
    } finally {
      setload(false);
    }
  }

  // 🖨️ Impression Ordonnance depuis l'étape post-sauvegarde
  const handlePrintOrdonnance = async () => {
    try {
      setPrintingDocs((prev) => ({ ...prev, ord: true }));
      const ord =
        postSaveData?.consultation?.ordonnance ||
        postSaveData?.formData?.ordonnance;
      const items =
        postSaveData?.ordItems ||
        ord?.items ||
        postSaveData?.formData?.ordonnance?.items ||
        [];
      if (!items || items.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Aucun médicament",
          text: "Aucun médicament à imprimer pour cette ordonnance.",
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

      const age = Age || calculateAge(selectedPatient?.dateDeNaissance);

      printOrdonnance({
        consultationId: postSaveData?.consultation?.id,
        ordonnanceId:
          ord?.id ||
          postSaveData?.consultation?.id ||
          postSaveData?.consultation?.ordonnanceId,
        nom,
        prenom,
        age,
        items: items.map((it) => ({
          name: it.medicament?.nom || it.nom || it.name,
          dosage: it.dosage,
          duration: it.duree || it.duration,
          frequency: it.frequence || it.frequency,
          quantity: it.quantite || it.quantity,
        })),
      });
    } catch (err) {
      console.error("❌ Erreur impression ordonnance:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur d'impression",
        text: "Impossible d'imprimer l'ordonnance.",
      });
    } finally {
      setPrintingDocs((prev) => ({ ...prev, ord: false }));
    }
  };

  // 🖨️ Impression Bilan depuis l'étape post-sauvegarde
  const handlePrintBilan = async () => {
    try {
      setPrintingDocs((prev) => ({ ...prev, bilan: true }));
      const bilan =
        postSaveData?.consultation?.bilanRecip ||
        postSaveData?.formData?.bilanRecip;
      const items =
        postSaveData?.bilanItems ||
        bilan?.items ||
        postSaveData?.formData?.bilanRecip?.items ||
        [];
      if (!items || items.length === 0) {
        Swal.fire({
          icon: "info",
          title: "Aucun examen",
          text: "Aucun examen à imprimer pour ce bilan.",
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

      const age = Age || calculateAge(selectedPatient?.dateDeNaissance);

      printBilan({
        consultationId: postSaveData?.consultation?.id,
        bilanId:
          bilan?.id ||
          postSaveData?.consultation?.id ||
          postSaveData?.consultation?.bilanRecipId,
        nom,
        prenom,
        age,
        items: items.map((it) => ({
          id: it.id || it.bilanId,
          nom: it.bilan?.nom || it.nom || it.name,
        })),
      });
    } catch (err) {
      console.error("❌ Erreur impression bilan:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur d'impression",
        text: "Impossible d'imprimer le bilan.",
      });
    } finally {
      setPrintingDocs((prev) => ({ ...prev, bilan: false }));
    }
  };

  // 🖨️ Impression Justification depuis l'étape post-sauvegarde
  const handlePrintJustification = async () => {
    try {
      setPrintingDocs((prev) => ({ ...prev, justif: true }));
      const justif =
        postSaveData?.justifData ||
        postSaveData?.consultation?.justificationRecord ||
        postSaveData?.consultation?.justification ||
        postSaveData?.formData?.justification;
      if (!justif) {
        Swal.fire({
          icon: "info",
          title: "Aucune justification",
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

      const age = Age || calculateAge(selectedPatient?.dateDeNaissance);

      const texte = typeof justif === "string" ? justif : justif.texte || "";

      printJustification({
        consultationId: postSaveData?.consultation?.id,
        justificationId:
          postSaveData?.consultation?.justificationRecord?.id ||
          postSaveData?.consultation?.id,
        nom,
        prenom,
        age,
        texte,
      });
    } catch (err) {
      console.error("❌ Erreur impression justification:", err);
      Swal.fire({
        icon: "error",
        title: "Erreur d'impression",
        text: "Impossible d'imprimer la justification.",
      });
    } finally {
      setPrintingDocs((prev) => ({ ...prev, justif: false }));
    }
  };

  // 💾 Enregistrer la consultation depuis la modal (Step 1 -> Step 2)
  const handleConfirmSaveConsultation = async () => {
    if (!date || !time) return;
    setSavingConsultation(true);
    try {
      const consultation = await addConsultation(NewConsultationData);
      if (!consultation) {
        setDataTimeModel(false);
        return;
      }

      // Détecter si la consultation créée contient une ordonnance, un bilan ou une justification
      const ordItems =
        consultation?.ordonnance?.items ||
        NewConsultationData?.ordonnance?.items ||
        [];
      const hasOrd = Array.isArray(ordItems) && ordItems.length > 0;

      const bilanItems =
        consultation?.bilanRecip?.items ||
        NewConsultationData?.bilanRecip?.items ||
        [];
      const hasBilan = Array.isArray(bilanItems) && bilanItems.length > 0;

      const justifData =
        consultation?.justificationRecord ||
        consultation?.justification ||
        NewConsultationData?.justificationRecord ||
        NewConsultationData?.justification;
      const hasJustif = Boolean(
        (typeof justifData === "string" && justifData.trim()) ||
        (typeof justifData === "object" && justifData?.texte?.trim()),
      );

      if (hasOrd || hasBilan || hasJustif) {
        // Étape post-sauvegarde : on reste dans la modal pour proposer l'impression
        setPostSaveData({
          consultation,
          formData: NewConsultationData,
          hasOrd,
          ordItems,
          hasBilan,
          bilanItems,
          hasJustif,
          justifData,
        });
      } else {
        // Aucun document : fermer la modal normalement comme implémenté
        setDataTimeModel(false);
        setNewConsultationData(null);
        setPostSaveData(null);
      }
    } catch (err) {
      console.error("❌ Erreur validation consultation:", err);
    } finally {
      setSavingConsultation(false);
    }
  };

  // Fermer la modal de consultation
  const handleCloseConsultationModal = () => {
    setDataTimeModel(false);
    setPostSaveData(null);
    setNewConsultationData(null);
    setSavingConsultation(false);
  };

  const handleSaveConsultation = () => {};
  async function addconsultationfunction(data) {
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toTimeString().slice(0, 5));
    setPostSaveData(null);
    setSavingConsultation(false);
    setDataTimeModel(true);

    //await addConsultation(data);
  }

  useEffect(() => {
    if (!NewConsultationData) return;
    console.log("New consultation data:" + JSON.stringify(NewConsultationData));
    addconsultationfunction(NewConsultationData);
  }, [NewConsultationData]);
  async function fetchPatients(selectPatientId = null) {
    try {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Failed to fetch patients");
      const data = await res.json();
      setPatients(data);

      if (selectPatientId) {
        await fetchPatientById(selectPatientId);
      } else if (!selectedPatient && data.length > 0) {
        await fetchPatientById(data[0].id);
      }
    } catch (error) {
      console.error("❌ Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPatientById(id) {
    try {
      setLoading(true);
      const res = await fetch(`/api/patients?id=${id}`); // use the updated GET API
      setLoading(false);
      if (!res.ok) throw new Error("Failed to fetch patient");
      const data = await res.json();
      setSelectedPatient(data);
    } catch (error) {
      console.error("❌ Error fetching patient:", error);
    }
  }
  useEffect(() => {
    fetchPatients();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+A: Focus search bar
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        searchRef.current?.focus();
      }

      // Ctrl+N: New patient
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setIsAddOpen(true);
      }

      // Ctrl+K: New consultation
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        setNewConsultation(true);
        setselectedtab("+ Nouvelle Consultation");
      }

      // Ctrl+P: New prescription/bilan
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        setnewordanance(true);
      }

      // Ctrl+I: Patient info tab
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        setselectedtab("Informations Patient");
      }

      // Ctrl+/: Show shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setShowShortcuts(true);
      }

      // ESC: Close shortcuts help
      if (e.key === "Escape" && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedPatient, showShortcuts]);
  const generalInfo = (selectedPatient) => {
    const fields = [
      {
        icon: Calendar,
        label: "Date de naissance",
        value: selectedPatient?.dateDeNaissance
          ? new Date(selectedPatient.dateDeNaissance).toLocaleDateString(
              "fr-FR",
            )
          : "—",
      },

      {
        icon: Droplets,
        label: "Groupe sanguin",
        value: selectedPatient?.groupeSanguin || "—",
      },
      {
        icon: ClipboardList,
        label: "Antécédents",
        value: selectedPatient?.antecedents || "—",
        type: "textarea",
      },
    ];
    return fields
      .filter(
        (f) => f && f.value !== null && f.value !== undefined && f.value !== "",
      )
      .map((f) => {
        if (f?.type === "textarea") {
          return {
            ...f,
            value: (
              <textarea
                readOnly
                className="w-full min-h-[100px] resize-none overflow-hidden border rounded-md p-3 text-sm text-gray-800 break-after-all"
                value={f.value}
              />
            ),
          };
        }
        return f;
      });
  };

  const contactInfo = (selectedPatient) => [
    {
      icon: MapPin,
      label: "Adresse",
      value: selectedPatient?.adresse || "—",
    },
    {
      icon: Phone,
      label: "Téléphone",
      value: selectedPatient?.telephone || "—",
    },
  ];

  // Traitements en cours for Informations Patient
  const enCoursTraitements = useMemo(() => {
    if (!selectedPatient?.traitements) return [];
    return selectedPatient.traitements
      .filter((t) => t.statut === "EN_COURS")
      .map((t) => {
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
        const sessionsCount =
          t.consultationsTraitement?.length || (t.consultationId ? 1 : 0);
        const versementsCount = t.versements?.length || 0;
        const progressPercent =
          t.prixTotal > 0
            ? Math.min(100, Math.round(((paid || 0) / t.prixTotal) * 100))
            : 100;
        return {
          ...t,
          calculatedPaid: paid,
          calculatedReste: reste,
          sessionsCount,
          versementsCount,
          progressPercent,
        };
      });
  }, [selectedPatient]);

  // Financial summary for Informations Patient
  const financialSummary = useMemo(() => {
    if (!selectedPatient) return null;
    const trs = selectedPatient.traitements || [];
    const allPaiements = [
      ...(selectedPatient.paiements || []),
      ...trs.flatMap((t) => t.versements || []),
    ].filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);
    allPaiements.sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt),
    );
    const lastP = allPaiements[0];

    const totalDu =
      selectedPatient.totalDu !== undefined
        ? Number(selectedPatient.totalDu)
        : trs
            .filter((t) => t.statut !== "ANNULE")
            .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

    const totalPaye =
      selectedPatient.totalPaye !== undefined
        ? Number(selectedPatient.totalPaye)
        : allPaiements.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);

    const detteRestante =
      selectedPatient.detteRestante !== undefined
        ? Number(selectedPatient.detteRestante)
        : Math.max(0, totalDu - totalPaye);

    return {
      totalDu,
      totalPaye,
      detteRestante,
      paiementsCount: allPaiements.length,
      lastPaiement: lastP,
    };
  }, [selectedPatient]);

  async function handleAddPatient(data) {
    if (!data.nom || !data.nom.trim()) {
      setConfig({
        type: "warning",
        title: "Champ requis",
        description: "Le nom du patient est obligatoire.",
        autoClose: true,
      });
      setsuccessopen(true);
      return { success: false, error: "Nom requis" };
    }

    setload(true);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          resData.error || "Erreur lors de la création du patient.",
        );
      }

      setIsAddOpen(false);
      setSearch("");

      await fetchPatients(resData.id);

      setConfig({
        type: "success",
        title: "Succès !",
        description: `Le patient "${resData.nom}" a été ajouté avec succès.`,
        autoClose: true,
      });
      setsuccessopen(true);

      return { success: true, data: resData };
    } catch (err) {
      console.error(err);

      setConfig({
        type: "error",
        title: "Erreur d'ajout",
        description: err.message || "Impossible d’ajouter le patient.",
        autoClose: false,
      });
      setsuccessopen(true);

      return { success: false, error: err.message };
    } finally {
      setload(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[var(--color-50)] via-white to-[var(--color-100)]">
      {visitsinfo && (
        <VisitsInfoModal
          patientId={selectedPatient?.id}
          open={visitsinfo}
          setopen={setVisitsinfo}
          fetchPatientById={fetchPatientById}
        />
      )}
      {financeHistoryOpen && (
        <FinanceHistoryModal
          patientId={selectedPatient?.id}
          selectedPatient={selectedPatient}
          open={financeHistoryOpen}
          setopen={setFinanceHistoryOpen}
          fetchPatientById={fetchPatientById}
        />
      )}
      {selectedTreatmentDetail && (
        <TraitementDetailModal
          open={Boolean(selectedTreatmentDetail)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedTreatmentDetail(null);
          }}
          traitement={selectedTreatmentDetail}
          onContinue={(traitement) => {
            setSelectedTreatmentDetail(null);
            setPreselectedTraitement(traitement);
            setselectedtab("+ Nouvelle Consultation");
          }}
          onUpdated={async () => {
            if (selectedPatient?.id) {
              await fetchPatientById(selectedPatient.id);
            }
          }}
        />
      )}
      {loading && <LoadingScreen />}

      <SuccessModal
        config={config}
        dialogOpen={successopen}
        setDialogOpen={setsuccessopen}
        loading={load}
      />

      {/* Keyboard Shortcuts Help Dialog */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-[var(--color-800)] flex items-center gap-2">
                  <Keyboard size={24} />
                  Raccourcis clavier
                </h2>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { key: "Ctrl + S", desc: "Rechercher un patient" },
                  { key: "Ctrl + A", desc: "Nouveau patient" },
                  { key: "Ctrl + C", desc: "Nouvelle consultation" },
                  { key: "Ctrl + P", desc: "Nouvelle prescription/bilan" },
                  { key: "Ctrl + I", desc: "Onglet Informations" },
                  { key: "Ctrl + /", desc: "Afficher les raccourcis" },
                  { key: "ESC", desc: "Fermer les dialogues" },
                ].map((shortcut, i) => (
                  <motion.div
                    key={shortcut.key}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex justify-between items-center p-3 bg-[var(--color-50)] rounded-lg"
                  >
                    <span className="text-gray-700">{shortcut.desc}</span>
                    <kbd className="px-3 py-1 bg-white border border-[var(--color-300)] rounded-md text-sm font-semibold text-[var(--color-700)] shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <NewOrdanance
        open={openNewordanance}
        onOpenChange={setnewordanance}
        onsave={handlesaveOrdanance}
        selectedPatient={selectedPatient}
      />
      <AjouteModal
        onAdd={handleAddPatient}
        open={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
        }}
      />
      {/* Sidebar with Animation */}
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-60 h-screen bg-[var(--color-50)] rounded-tr-4xl p-6 pl-2 pr-2  pr-0flex flex-col border-r  border-[var(--color-200)] fixed "
      >
        <div className="flex justify-between items-center mb-6">
          <motion.h2
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-[var(--color-800)]"
          >
            Patients
          </motion.h2>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Button
              onClick={() => setIsAddOpen(true)}
              className="rounded-full p-2 bg-[var(--color-600)] hover:bg-[var(--color-700)]"
            >
              <Plus size={16} />
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative mb-4"
        >
          <Input
            ref={searchRef}
            type="text"
            placeholder="Rechercher (Ctrl+S)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
          <Search
            className="absolute right-3 top-2.5 text-gray-400"
            size={16}
          />
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="overflow-y-auto  p-1 flex-1 h-[calc(100vh-120px)]"
        >
          <AnimatePresence>
            {filteredPatients.map((patient, index) => (
              <motion.li
                key={patient.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => fetchPatientById(patient.id)} // fetch full details
                className={`p-3 mb-2 rounded-lg cursor-pointer flex flex-col transition-all duration-200 ${
                  selectedPatient?.id === patient.id
                    ? "bg-[var(--color-600)] text-white shadow-lg"
                    : "bg-white text-gray-800 hover:bg-[var(--color-100)]"
                }`}
              >
                <p className="font-medium flex items-center gap-2">
                  <UserCircle size={16} /> {patient.nom}
                </p>
                <p className="text-sm flex items-center gap-2">
                  <User size={14} /> {patient.sexe}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </motion.div>
      {/* Main Content */}
      <div className="flex-1 ml-65 p-6 px-0 pr-2 overflow-auto">
        {/* Keyboard shortcut hint button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowShortcuts(true)}
          className="fixed bottom-6 right-6 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-full p-4 shadow-lg z-40"
          title="Raccourcis clavier (Ctrl+/)"
        >
          <Keyboard size={24} />
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-3"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <motion.h1
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 250, damping: 15 }}
                className="text-3xl font-bold text-[var(--color-800)]"
              >
                {selectedPatient?.nom}
              </motion.h1>

              <span className="px-3 py-1 text-sm rounded-full bg-[var(--color-100)] text-[var(--color-800)] font-semibold">
                {Age}
              </span>
            </div>

            <p className="text-gray-500 text-sm flex items-center gap-2">
              <ClipboardList size={16} className="text-[var(--color-600)]" />
              {!NewConsultation ? "Dernier diagnostic" : "Nouveau diagnostic"}
            </p>
          </div>

          <div className="flex flex-row items-center gap-6">
            {selectedtab === "Prescriptions et Bilans" && (
              <ModernSearchBar
                onChange={handleChange}
                value={query.ord}
                placeholder="Rechercher par ID ou mot-clé..."
              />
            )}
            {selectedtab === "Visites" && (
              <ModernSearchBar
                onChange={handleChange}
                value={query.visites}
                placeholder="Rechercher une visite..."
              />
            )}
            {selectedtab === "Vaccinations" && (
              <ModernSearchBar
                onChange={handleChange}
                value={query.vaccination}
                placeholder="Rechercher un vaccin..."
              />
            )}
            {selectedtab === "Traitements" && (
              <ModernSearchBar
                onChange={handleChange}
                value={query.traitements}
                placeholder="Rechercher un traitement, dent, acte..."
              />
            )}
            {selectedtab === "Finances & Crédits" && (
              <ModernSearchBar
                onChange={handleChange}
                value={query.finances}
                placeholder="Rechercher un versement, note, montant..."
              />
            )}

            {(selectedtab === "Visites" ||
              selectedtab === "Analyses et Résultats" ||
              selectedtab === "Prescriptions et Bilans" ||
              selectedtab === "Vaccinations" ||
              selectedtab === "Traitements" ||
              selectedtab === "Finances & Crédits") && (
              <DatePickerFilter
                value={
                  selectedtab === "Visites"
                    ? dateFilter.visites
                    : selectedtab === "Analyses et Résultats"
                      ? dateFilter.analyses
                      : selectedtab === "Prescriptions et Bilans"
                        ? dateFilter.ord
                        : selectedtab === "Vaccinations"
                          ? dateFilter.vaccination
                          : selectedtab === "Traitements"
                            ? dateFilter.traitements
                            : dateFilter.finances
                }
                onChange={handleDateChange}
              />
            )}
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {selectedtab === "Vaccinations" ? (
              <AddVaccinationButton
                patientId={selectedPatient?.id}
                setrefrech={setrefrech}
              />
            ) : selectedtab === "Analyses et Résultats" ? (
              <Button
                onClick={() => setShowAddDialogNewAnalyse(true)}
                className="flex items-center gap-2 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium px-5 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="mr-2 h-4 w-4" /> Nouvelle analyse
              </Button>
            ) : selectedtab === "Prescriptions et Bilans" ? (
              <Button
                onClick={() => setnewordanance(true)}
                className="flex items-center gap-2 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium px-5 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="mr-2 h-4 w-4" /> Nouvelle Prescription / Bilan
                / Justification
              </Button>
            ) : selectedtab === "Traitements" ? (
              <Button
                onClick={() => setShowNewTraitement(true)}
                className="flex items-center gap-2 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium px-5 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="mr-2 h-4 w-4" /> Nouveau traitement
              </Button>
            ) : selectedtab === "Finances & Crédits" ? (
              <Button
                onClick={() => setShowNewVersement(true)}
                className="flex items-center gap-2 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white font-medium px-5 py-2 rounded-xl shadow-md transition"
              >
                <Plus className="mr-2 h-4 w-4" /> Nouveau versement
              </Button>
            ) : selectedtab === "Visites" ||
              selectedtab === "Informations Patient" ? (
              <Button
                onClick={() => {
                  setNewConsultation(true);
                  setselectedtab("+ Nouvelle Consultation");
                }}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              >
                <Plus size={18} />
                Nouvelle Consultation
              </Button>
            ) : selectedtab === "+ Nouvelle Consultation" ? (
              <Button
                onClick={() => setOpenAddElementModal(true)}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-md transition-all duration-200"
              >
                <Plus size={18} />
                Ajouter
              </Button>
            ) : null}
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap sm:flex-nowrap border-b border-[var(--color-200)] mb-6 overflow-x-auto scrollbar-hide"
        >
          {[
            "Informations Patient",
            "Analyses et Résultats",
            "Finances & Crédits",
            "Traitements",

            "Visites",
            "Prescriptions et Bilans",
            "+ Nouvelle Consultation",
          ].map((tab, index) => (
            <motion.button
              key={tab}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setselectedtab(tab);
              }}
              className={`px-2 sm:px-2 py-2 text-sm sm:text-base font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                tab === selectedtab
                  ? "text-[var(--color-600)] border-[var(--color-600)]"
                  : "text-gray-600 border-transparent hover:text-[var(--color-600)] hover:border-[var(--color-300)]"
              }`}
            >
              {tab}
            </motion.button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {!selectedPatient ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-gray-500 text-center mt-10"
            >
              Aucune Patient.
            </motion.p>
          ) : (
            <motion.div
              key={selectedtab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {selectedtab === "Informations Patient" && (
                <>
                  {/* 1. Informations Générales */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-[var(--color-700)] flex items-center gap-2">
                        <User size={20} /> Informations Générales
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generalInfo(selectedPatient)?.map((info, infoIndex) => {
                        const isEmpty = !info.value || info.value === "—";
                        return (
                          <motion.div
                            key={info.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: infoIndex * 0.05 }}
                            whileHover={{ scale: 1.01, y: -2 }}
                          >
                            <Card
                              className={`flex items-center gap-3 p-3 shadow-sm transition-shadow w-full ${
                                isEmpty
                                  ? "bg-gray-100 cursor-not-allowed opacity-60"
                                  : "bg-white hover:shadow-md"
                              }`}
                            >
                              {info.label === "Antécédents" ? (
                                <div className="flex flex-col w-full gap-2 min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <info.icon
                                      className={`shrink-0 ${
                                        isEmpty
                                          ? "text-gray-400"
                                          : "text-[var(--color-500)]"
                                      }`}
                                      size={20}
                                    />
                                    <span
                                      className={`font-medium ${
                                        isEmpty
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {info.label}
                                    </span>
                                  </div>
                                  <div
                                    className={`w-full min-w-0 h-auto min-h-[80px] rounded-md px-0 py-0 ${
                                      isEmpty
                                        ? "bg-gray-50 text-gray-400"
                                        : "bg-gray-50 text-gray-800"
                                    }`}
                                  >
                                    <span className="block w-full h-auto min-h-[60px] font-medium leading-6 whitespace-pre-wrap break-words">
                                      {info.value || "—"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-row justify-between items-start w-full gap-3">
                                  <div className="flex flex-row items-center shrink-0">
                                    <info.icon
                                      className={`shrink-0 text-[var(--color-500)] ${
                                        isEmpty ? "text-gray-400" : ""
                                      }`}
                                      size={20}
                                    />
                                    <span
                                      className={`ml-2 ${
                                        isEmpty
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {info.label}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0 text-right">
                                    <span
                                      className={`font-medium min-w-0 text-right break-words ${
                                        isEmpty
                                          ? "text-gray-400"
                                          : "text-gray-800"
                                      }`}
                                    >
                                      {info.value || "—"}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* 2. Informations Médicales : Traitements en cours uniquement */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-[var(--color-700)] flex items-center gap-2">
                          <Stethoscope size={20} /> Informations Médicales
                        </h3>
                        {enCoursTraitements.length > 0 && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            {enCoursTraitements.length} en cours
                          </span>
                        )}
                      </div>

                      {/* Button to view treatments history */}
                      <button
                        type="button"
                        onClick={() => setselectedtab("Traitements")}
                        disabled={!selectedPatient?.id}
                        className="p-2 rounded-xl bg-[var(--color-500)] text-white shadow-sm hover:bg-[var(--color-700)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        title="Historique des traitements"
                      >
                        <Activity size={18} />
                      </button>
                    </div>

                    {/* Content: ONLY ongoing treatments with same UI as TraitementsTab */}
                    {enCoursTraitements.length === 0 ? (
                      <Card className="p-6 bg-white border border-dashed border-slate-200 rounded-2xl text-center text-slate-500">
                        <Stethoscope className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700 text-sm">
                          Aucun traitement en cours
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Tous les soins de ce patient sont terminés ou aucun
                          traitement n'est actuellement actif.
                        </p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {enCoursTraitements.map((t) => (
                          <Card
                            key={t.id}
                            onClick={() => setSelectedTreatmentDetail(t)}
                            className="overflow-hidden border border-slate-200 hover:border-[var(--color-400)] transition-all shadow-sm hover:shadow-md rounded-2xl bg-white cursor-pointer group"
                            title="Cliquer pour afficher les détails et les séances de ce traitement"
                          >
                            <div className="p-4 sm:p-5">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {/* Badge Dent */}
                                  <div className="p-2.5 rounded-xl bg-[var(--color-100)] text-[var(--color-700)] flex flex-col items-center justify-center min-w-[56px] text-center shrink-0 group-hover:bg-[var(--color-200)] transition-colors">
                                    <span className="text-[10px] font-semibold uppercase text-slate-500">
                                      Dent
                                    </span>
                                    <span className="text-sm font-bold text-[var(--color-800)]">
                                      {t.dent || "—"}
                                    </span>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-[var(--color-700)] transition-colors">
                                        {t.description}
                                      </h4>
                                    </div>

                                    <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                      <span>
                                        Créé le{" "}
                                        {new Date(
                                          t.createdAt,
                                        ).toLocaleDateString("fr-FR")}
                                      </span>
                                      <span>•</span>
                                      <span>{t.sessionsCount} séance(s)</span>
                                      <span>•</span>
                                      <span>
                                        {t.versementsCount} versement(s)
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {/* Actions directes: Continuer */}
                                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreselectedTraitement(t);
                                      setselectedtab("+ Nouvelle Consultation");
                                    }}
                                    className=" bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
                                    title="Ouvrir une nouvelle consultation et continuer ce traitement"
                                  >
                                    <ArrowRight size={14} />
                                    Continuer
                                  </Button>
                                </div>
                              </div>

                              {/* Barre financière */}
                              <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 mb-1.5">
                                  <span>
                                    Prix total :{" "}
                                    <strong className="text-slate-900 font-semibold">
                                      {(t.prixTotal || 0).toLocaleString(
                                        "fr-FR",
                                      )}{" "}
                                      DZD
                                    </strong>
                                  </span>
                                  <span>
                                    Payé :{" "}
                                    <strong className="text-emerald-700 font-semibold">
                                      {(t.calculatedPaid || 0).toLocaleString(
                                        "fr-FR",
                                      )}{" "}
                                      DZD
                                    </strong>
                                  </span>
                                  <span>
                                    Reste :{" "}
                                    <strong
                                      className={`font-bold ${
                                        t.calculatedReste > 0
                                          ? "text-amber-700"
                                          : "text-emerald-700"
                                      }`}
                                    >
                                      {(t.calculatedReste || 0).toLocaleString(
                                        "fr-FR",
                                      )}{" "}
                                      DZD
                                    </strong>
                                  </span>
                                </div>

                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      t.calculatedReste === 0
                                        ? "bg-emerald-500"
                                        : "bg-[var(--color-600)]"
                                    }`}
                                    style={{ width: `${t.progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* 3. Informations Financières */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-[var(--color-700)] flex items-center gap-2">
                        <CreditCard size={20} /> Informations Financières
                      </h3>

                      {/* Button to view financial history - switches to Finances & Crédits tab */}
                      <button
                        type="button"
                        onClick={() => setselectedtab("Finances & Crédits")}
                        disabled={!selectedPatient?.id}
                        className="p-2 rounded-xl bg-[var(--color-500)] text-white shadow-sm hover:bg-[var(--color-700)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        title="Historique des versements (Finances & Crédits)"
                      >
                        <Receipt size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Total des soins */}
                      <Card
                        onClick={() => setselectedtab("Finances & Crédits")}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Total des soins
                            </p>
                            <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900">
                              {(financialSummary?.totalDu || 0).toLocaleString(
                                "fr-FR",
                              )}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                DZD
                              </span>
                            </p>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <DollarSign className="h-[18px] w-[18px]" />
                          </div>
                        </div>
                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          {(selectedPatient?.traitements || []).length} soin(s)
                          au total
                        </p>
                      </Card>

                      {/* Total réglé */}
                      <Card
                        onClick={() => setselectedtab("Finances & Crédits")}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Total réglé
                            </p>
                            <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900">
                              {(
                                financialSummary?.totalPaye || 0
                              ).toLocaleString("fr-FR")}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                DZD
                              </span>
                            </p>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <CheckCircle2 className="h-[18px] w-[18px]" />
                          </div>
                        </div>
                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          {financialSummary?.paiementsCount || 0} versement(s)
                          reçu(s)
                        </p>
                      </Card>

                      {/* Solde restant (seul accent de statut) */}
                      <Card
                        onClick={() => setselectedtab("Finances & Crédits")}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Solde restant (Crédit)
                            </p>
                            <p
                              className={`mt-1.5 truncate text-2xl font-semibold tracking-tight ${
                                (financialSummary?.detteRestante || 0) > 0
                                  ? "text-amber-700"
                                  : "text-slate-900"
                              }`}
                            >
                              {(
                                financialSummary?.detteRestante || 0
                              ).toLocaleString("fr-FR")}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                DZD
                              </span>
                            </p>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <CreditCard className="h-[18px] w-[18px]" />
                          </div>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-500">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              (financialSummary?.detteRestante || 0) > 0
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          {(financialSummary?.detteRestante || 0) > 0
                            ? "Paiement en attente"
                            : "Compte à jour"}
                        </p>
                      </Card>

                      {/* Dernier versement */}
                      <Card
                        onClick={() => setselectedtab("Finances & Crédits")}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Dernier versement
                            </p>
                            <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-slate-900">
                              {financialSummary?.lastPaiement
                                ? `+${Number(financialSummary.lastPaiement.montant).toLocaleString("fr-FR")}`
                                : "0"}
                              <span className="ml-1 text-sm font-medium text-slate-400">
                                DZD
                              </span>
                            </p>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Receipt className="h-[18px] w-[18px]" />
                          </div>
                        </div>
                        <p className="mt-3 truncate border-t border-slate-100 pt-3 text-xs text-slate-500">
                          {financialSummary?.lastPaiement?.date
                            ? `Le ${new Date(financialSummary.lastPaiement.date).toLocaleDateString("fr-FR")}`
                            : financialSummary?.lastPaiement
                              ? "Enregistré"
                              : "Aucun versement"}
                        </p>
                      </Card>
                    </div>
                  </motion.div>

                  {/* 4. Informations de Contact */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-[var(--color-700)] flex items-center gap-2">
                        <Phone size={20} /> Informations de Contact
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {contactInfo(selectedPatient)?.map((info, infoIndex) => {
                        const isEmpty = !info.value || info.value === "—";
                        return (
                          <motion.div
                            key={info.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: infoIndex * 0.05 }}
                            whileHover={{ scale: 1.01, y: -2 }}
                          >
                            <Card
                              className={`flex items-center gap-3 p-3 shadow-sm transition-shadow w-full ${
                                isEmpty
                                  ? "bg-gray-100 cursor-not-allowed opacity-60"
                                  : "bg-white hover:shadow-md"
                              }`}
                            >
                              <div className="flex flex-row justify-between items-start w-full gap-3">
                                <div className="flex flex-row items-center shrink-0">
                                  <info.icon
                                    className={`shrink-0 text-[var(--color-500)] ${
                                      isEmpty ? "text-gray-400" : ""
                                    }`}
                                    size={20}
                                  />
                                  <span
                                    className={`ml-2 ${
                                      isEmpty
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {info.label}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 text-right">
                                  <span
                                    className={`font-medium min-w-0 text-right break-words ${
                                      isEmpty
                                        ? "text-gray-400"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {info.value || "—"}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
              {selectedtab === "Traitements" && (
                <TraitementsTab
                  selectedPatient={selectedPatient}
                  patient={selectedPatient}
                  patientId={selectedPatient?.id}
                  query={query.traitements}
                  dateFilter={dateFilter.traitements}
                  showNewTraitementModal={showNewTraitement}
                  setShowNewTraitementModal={setShowNewTraitement}
                  onContinueTraitement={(traitement) => {
                    setPreselectedTraitement(traitement);
                    setselectedtab("+ Nouvelle Consultation");
                  }}
                  onRefresh={() => fetchPatientById(selectedPatient?.id)}
                />
              )}
              {selectedtab === "Finances & Crédits" && (
                <FinancesPatientTab
                  selectedPatient={selectedPatient}
                  patient={selectedPatient}
                  patientId={selectedPatient?.id}
                  query={query.finances}
                  dateFilter={dateFilter.finances}
                  showNewVersementModal={showNewVersement}
                  setShowNewVersementModal={setShowNewVersement}
                  onRefresh={() => fetchPatientById(selectedPatient?.id)}
                />
              )}
              {selectedtab === "+ Nouvelle Consultation" && (
                <NewConsultationPage
                  onSave={setNewConsultationData}
                  selectedPatient={selectedPatient}
                  setViderForm={setViderForm}
                  viderForm={viderForm}
                  openAddModal={openAddElementModal}
                  setOpenAddModal={setOpenAddElementModal}
                  preselectedTraitement={preselectedTraitement}
                  onClearPreselectedTraitement={() =>
                    setPreselectedTraitement(null)
                  }
                />
              )}
              {selectedtab === "Analyses et Résultats" && (
                <Analyses
                  patientID={selectedPatient?.id}
                  ShowAddDialogNewAnalyse={ShowAddDialogNewAnalyse}
                  setShowAddDialogNewAnalyse={setShowAddDialogNewAnalyse}
                  dateFilter={dateFilter.analyses}
                />
              )}
              {selectedtab === "Vaccinations" && (
                <VaccinationsPage
                  refrech={refrech}
                  setrefrech={setrefrech}
                  patientId={selectedPatient?.id}
                  query={query.vaccination}
                  dateFilter={dateFilter.vaccination}
                />
              )}
              {selectedtab === "Visites" && (
                <PatientVisits
                  patientId={selectedPatient?.id}
                  query={query.visites}
                  dateFilter={dateFilter.visites}
                  fetchPatientById={fetchPatientById}
                />
              )}
              {selectedtab === "Prescriptions et Bilans" && (
                <Ordonnances
                  patientId={selectedPatient?.id}
                  query={query.ord}
                  dateFilter={dateFilter.ord}
                  selectedPatient={selectedPatient}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Dialog
        open={DateTimeModal}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseConsultationModal();
          } else {
            setDataTimeModel(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl w-full rounded-2xl">
          {!postSaveData ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-semibold text-slate-900">
                  Programmer une consultation
                </DialogTitle>
                <DialogDescription className="text-base text-slate-500">
                  Choisissez la date et l&rsquo;heure de cette consultation
                  avant de l&rsquo;enregistrer.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* Date */}
                  <label className="flex flex-col gap-1.5 text-base">
                    <span className="font-medium text-slate-700">Date</span>
                    <input
                      type="date"
                      disabled={savingConsultation}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] transition-all disabled:opacity-60"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>

                  {/* Time */}
                  <label className="flex flex-col gap-1.5 text-base">
                    <span className="font-medium text-slate-700">Heure</span>
                    <input
                      type="time"
                      disabled={savingConsultation}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] transition-all disabled:opacity-60"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </label>
                </div>

                <p className="text-sm text-slate-500">
                  Assurez-vous que la date et l&rsquo;heure sont correctes. Vous
                  pourrez modifier cette consultation plus tard si nécessaire.
                </p>
              </div>

              <DialogFooter className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseConsultationModal}
                  disabled={savingConsultation}
                  className="px-5 py-2.5 text-base rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSaveConsultation}
                  disabled={!date || !time || savingConsultation}
                  className="px-5 py-2.5 text-base rounded-xl bg-[var(--color-600)] text-white font-medium shadow-sm hover:bg-[var(--color-700)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {savingConsultation ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Enregistrement en cours...
                    </>
                  ) : (
                    "Enregistrer la consultation"
                  )}
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* Étape Post-Sauvegarde : Confirmation & Impression */}
              <DialogHeader>
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                      Consultation enregistrée avec succès !
                    </DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 mt-1">
                      Des documents médicaux ont été générés pour{" "}
                      <strong className="text-slate-800">
                        {selectedPatient?.nom}
                      </strong>
                      . Vous pouvez les imprimer ci-dessous :
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-5 space-y-3">
                {/* 🖨️ Ordonnance */}
                {postSaveData.hasOrd && (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 transition-colors shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="p-3 rounded-xl bg-white text-emerald-700 shadow-2xs shrink-0">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          Ordonnance médicale
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {postSaveData.ordItems.length} médicament(s)
                          prescrit(s)
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handlePrintOrdonnance}
                      disabled={printingDocs.ord}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-sm shrink-0"
                    >
                      {printingDocs.ord ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      Imprimer ordonnance
                    </Button>
                  </div>
                )}

                {/* 🖨️ Bilan */}
                {postSaveData.hasBilan && (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 transition-colors shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="p-3 rounded-xl bg-white text-blue-700 shadow-2xs shrink-0">
                        <FlaskConical className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          Bilan médical & Analyses
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {postSaveData.bilanItems.length} analyse(s)
                          demandée(s)
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handlePrintBilan}
                      disabled={printingDocs.bilan}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-sm shrink-0"
                    >
                      {printingDocs.bilan ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      Imprimer bilan
                    </Button>
                  </div>
                )}

                {/* 🖨️ Justification */}
                {postSaveData.hasJustif && (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-purple-200 bg-purple-50/60 hover:bg-purple-50 transition-colors shadow-2xs">
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div className="p-3 rounded-xl bg-white text-purple-700 shadow-2xs shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900">
                          Justification médicale
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          Certificat / arrêt de travail
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handlePrintJustification}
                      disabled={printingDocs.justif}
                      className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold px-4 py-2.5 flex items-center gap-2 shadow-sm shrink-0"
                    >
                      {printingDocs.justif ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Printer className="w-4 h-4" />
                      )}
                      Imprimer justification
                    </Button>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 flex items-center justify-end">
                <Button
                  type="button"
                  onClick={handleCloseConsultationModal}
                  className="px-6 py-2.5 text-sm rounded-xl bg-[var(--color-600)] text-white font-medium shadow-sm hover:bg-[var(--color-700)] transition-colors"
                >
                  Terminer et fermer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
