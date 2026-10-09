"use client";

import React, { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Plus,
  Search,
  Pill,
  FileText,
  FlaskConical,
  Loader2,
} from "lucide-react";
import DialogPage from "@/app/component/DialogPage/page";
import DialogAlert from "@/app/component/DialgoAlert/page";
import AddMedicamentModal from "../NewMedicament/page";
import AddBilanModal from "../NewBilan/page";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { printOrdonnance, printBilan, printJustification } from "@/lib/printer";
import param from "@/param.json";

export default function PrescriptionModal({
  open = true,
  onOpenChange,
  onsave,
  selectedPatient,
  initialData = null,
  initialTab = "ordonnance",
  editMode = false,
  editDocType = null,
  editDocId = null,
  onSaveEdit = null,
  isSavingEdit = false,
}) {
  const [activeTab, setActiveTab] = useState(
    initialTab === "bilan" ? "labs" : initialTab || "ordonnance"
  );
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMed, setSelectedMed] = useState(null);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [type, setType] = useState();
  const [openMedDialog, setOpenMedDialog] = useState(false);
  const [medicaments, setMedicaments] = useState([]);
  const [bilans, setBilans] = useState([]);
  const [ordTypes, setOrdTypes] = useState([]);
  const [SelectedbilanType, setSelectedBilanType] = useState();
  const [customDose, setCustomDose] = useState("");
  const [customFreq, setCustomFreq] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [NewMedicament, setNewMedicament] = useState(false);
  const [NewBilan, setNewBilan] = useState();

  const [bilanTypes, setBilanTypes] = useState([]);
  const [justifTypes, setJustifTypes] = useState([]);
  const [tmpfreq, setTmpfreq] = useState("");
  const [tmpDose, setTmpDose] = useState("");
  const [tmpDuration, setTmpDuration] = useState("");
  const [tmpQuantite, setTmpQuantite] = useState(1);
  const [loading, setLoading] = useState(false);
  const [printingOrd, setPrintingOrd] = useState(false);
  const [printingBilan, setPrintingBilan] = useState(false);
  const [printingJustif, setPrintingJustif] = useState(false);
  const [labQuery, setLabQuery] = useState("");
  const [labSuggestions, setLabSuggestions] = useState([]);
  const [labItems, setLabItems] = useState([]);
  const [labType, setLabType] = useState("");
  const [existDialog, setExistDialog] = useState(false);

  const [justifText, setJustifText] = useState("");

  const [highlightedMedIdx, setHighlightedMedIdx] = useState(-1);
  const [highlightedLabIdx, setHighlightedLabIdx] = useState(-1);

  const printRef = useRef();
  const [bilanType, setBilanType] = useState();
  const [justifType, setJustifType] = useState();

  const bilanPrintRef = useRef();
  const justifPrintRef = useRef();

  // Refs for auto-focus
  const medSearchRef = useRef(null);
  const labSearchRef = useRef(null);
  const quantiteInputRef = useRef(null);

  async function fetchBilanTypes() {
    try {
      const response = await fetch("/api/BilansType", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          err.error || "Erreur lors du chargement des bilans types",
        );
      }

      const data = await response.json();
      setBilanTypes(data);
    } catch (err) {
      console.error("❌ fetchBilanTypes error:", err);
    }
  }

  async function fetchJustifTypes() {
    try {
      const response = await fetch("/api/JustificationsType", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(
          err.error || "Erreur lors du chargement des justifications types",
        );
      }

      const data = await response.json();
      setJustifTypes(data);
    } catch (err) {
      console.error("❌ fetchJustifTypes error:", err);
    }
  }

  async function fetchRecettes() {
    try {
      const response = await fetch("/api/OrdanaceType", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        let message = "Erreur lors du chargement des recettes types";
        try {
          const error = await response.json();
          message = error.error || message;
        } catch {
          // fallback if no JSON
        }
        throw new Error(message);
      }

      return await response.json();
    } catch (err) {
      console.error("❌ fetchRecettes error:", err);
      throw err;
    }
  }

  const loadRecettes = async () => {
    try {
      const data = await fetchRecettes();
      setOrdTypes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function fetchMedicaments() {
      try {
        const res = await fetch("/api/medicaments");
        const data = await res.json();
        if (isMounted && Array.isArray(data)) setMedicaments(data);
      } catch (err) {
        console.error("Erreur de chargement des médicaments", err);
      }
    }
    async function fetchBilans() {
      try {
        const res = await fetch("/api/bilans");
        const data = await res.json();
        if (isMounted && Array.isArray(data)) setBilans(data);
      } catch (err) {
        console.error("Erreur de chargement des bilans", err);
      }
    }

    async function loadAll() {
      setLoading(true);
      try {
        await Promise.allSettled([
          loadRecettes(),
          fetchMedicaments(),
          fetchBilans(),
          fetchBilanTypes(),
          fetchJustifTypes(),
        ]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAll();

    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-focus on medication search when dialog opens or ordonnance tab is selected
  useEffect(() => {
    if (open && activeTab === "ordonnance") {
      const timer = setTimeout(() => {
        medSearchRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab]);

  // Auto-focus and select text in quantity field when medication modal opens
  useEffect(() => {
    if (openMedDialog) {
      const timer = setTimeout(() => {
        if (quantiteInputRef.current) {
          quantiteInputRef.current.focus();
          quantiteInputRef.current.select();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [openMedDialog]);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setHighlightedMedIdx(-1);
      return;
    }
    const q = query.trim().toLowerCase();
    const filtered = medicaments.filter((m) => m.nom.toLowerCase().includes(q));
    setSuggestions(filtered);
    setHighlightedMedIdx(filtered.length > 0 ? 0 : -1);
  }, [query, medicaments]);

  useEffect(() => {
    if (!labQuery.trim()) {
      setLabSuggestions([]);
      setHighlightedLabIdx(-1);
      return;
    }
    const q = labQuery.trim().toLowerCase();
    const filtered = bilans.filter(
      (e) =>
        e.nom.toLowerCase().includes(q) &&
        !labItems.some((l) => (l.id && e.id ? l.id === e.id : l === e)),
    );
    setLabSuggestions(filtered);
    setHighlightedLabIdx(filtered.length > 0 ? 0 : -1);
  }, [labQuery, labItems, bilans]);

  function handleMedKeyDown(e) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedMedIdx((idx) =>
        idx + 1 < suggestions.length ? idx + 1 : idx,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedMedIdx((idx) => (idx - 1 >= 0 ? idx - 1 : 0));
    } else if (e.key === "Enter" && highlightedMedIdx >= 0) {
      e.preventDefault();
      const s = suggestions[highlightedMedIdx];
      if (s) {
        setSelectedMed(s);
        setOpenMedDialog(true);
      }
    }
  }

  function handleLabKeyDown(e) {
    if (!labSuggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedLabIdx((idx) =>
        idx + 1 < labSuggestions.length ? idx + 1 : idx,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedLabIdx((idx) => (idx - 1 >= 0 ? idx - 1 : idx));
    } else if (e.key === "Enter" && highlightedLabIdx >= 0) {
      e.preventDefault();
      addLab(labSuggestions[highlightedLabIdx]);
    }
  }

  function addMedication() {
    if (!selectedMed) return;
    const exists = prescriptionItems.some(
      (it) => it.nom.toLowerCase() === selectedMed.nom.toLowerCase(),
    );

    if (exists) {
      setExistDialog(true);
      return;
    }
    const finalDosage = (
      tmpDose === "autre" ? customDose : tmpDose || ""
    ).trim();
    const finalFrequence = (
      tmpfreq === "autre" ? customFreq : tmpfreq || ""
    ).trim();
    const finalDuree = (
      tmpDuration === "autre" ? customDuration : tmpDuration || ""
    ).trim();
    const finalQuantite = Number(tmpQuantite) > 0 ? Number(tmpQuantite) : 1;

    const item = {
      medicamentId: selectedMed.id,
      nom: selectedMed.nom,
      form: selectedMed.form,
      dosage: finalDosage,
      frequence: finalFrequence,
      duree: finalDuree,
      quantite: finalQuantite,
    };
    setPrescriptionItems([...prescriptionItems, item]);

    // Reset all fields
    setSelectedMed(null);
    setQuery("");
    setOpenMedDialog(false);
    setTmpQuantite(1);
    setTmpDose("");
    setTmpfreq("");
    setTmpDuration("");
    setCustomDose("");
    setCustomFreq("");
    setCustomDuration("");

    // Return focus to search field
    setTimeout(() => {
      medSearchRef.current?.focus();
    }, 100);
  }

  function removeItem(id) {
    setPrescriptionItems(
      prescriptionItems.filter((i) => i.medicamentId !== id),
    );
  }

  function addLab(exam) {
    if (!labItems.some((i) => (i.id && exam.id ? i.id === exam.id : i === exam))) {
      setLabItems([...labItems, exam]);
    }
    setLabQuery("");

    // Return focus to lab search
    setTimeout(() => {
      labSearchRef.current?.focus();
    }, 100);
  }

  function removeLab(exam) {
    setLabItems(
      labItems.filter((i) => (i.id && exam.id ? i.id !== exam.id : i !== exam)),
    );
  }

  async function handleSave() {
    if (editMode && onSaveEdit) {
      await onSaveEdit({
        editDocType,
        editDocId,
        prescriptionItems,
        labItems,
        justifText,
      });
      return;
    }

    const ordonnance = {
      items: prescriptionItems,
    };
    const bilanRecip = {
      items: labItems,
    };
    const payload = {
      ordonnance: ordonnance,
      bilanRecip: bilanRecip,
      justification: justifText.trim()
        ? {
            texte: justifText.trim(),
          }
        : null,
    };
    onsave?.(payload);
    console.log("✅ Saved:", payload);
  }

  const totalMeds = prescriptionItems.length;

  useEffect(() => {
    if (!type) return;
    if (type !== "autre") {
      const selectedtyoe = ordTypes.filter((o) => o.id === type);
      const meds =
        selectedtyoe[0]?.items.map((med) => ({
          medicamentId: med.id,
          nom: med.nom,
          dosage: med.dosage || "",
          frequence: med.frequence || "",
          duree: med.duree || "",
          quantite: med.quantite || 1,
        })) || [];

      setPrescriptionItems(meds);
    } else {
      setPrescriptionItems([]);
    }
  }, [type, ordTypes]);
  const scrollRef2 = useRef(null);

  // ✅ Scroll to bottom whenever a new lab exam is added
  useEffect(() => {
    if (scrollRef2.current) {
      scrollRef2.current.scrollTop = scrollRef2.current.scrollHeight;
    }
  }, [labItems]);
  useEffect(() => {
    if (!SelectedbilanType) return;
    if (SelectedbilanType !== "autre") {
      const selectedtyoe = bilanTypes.filter((o) => o.id === SelectedbilanType);
      const labs =
        selectedtyoe[0]?.items.map((lab) => ({
          id: lab.id,
          nom: lab.nom,
        })) || [];

      setLabItems(labs);
    } else {
      setLabItems([]);
    }
  }, [SelectedbilanType, bilanTypes]);

  // Synchronize initial data and tab when dialog opens
  useEffect(() => {
    if (open) {
      if (initialTab) {
        setActiveTab(initialTab === "bilan" ? "labs" : initialTab);
      }
      if (initialData) {
        if (Array.isArray(initialData.ordonnance?.items)) {
          setPrescriptionItems(
            initialData.ordonnance.items.map((it) => ({
              medicamentId: it.medicamentId || it.medicament?.id || it.id,
              nom: it.medicament?.nom || it.nom || it.name || "",
              form: it.form || it.medicament?.form || "",
              dosage: it.dosage || "",
              frequence: it.frequence || it.frequency || "",
              duree: it.duree || it.duration || "",
              quantite:
                Number(it.quantite || it.quantity) > 0
                  ? Number(it.quantite || it.quantity)
                  : 1,
            }))
          );
        } else if (!editMode) {
          setPrescriptionItems([]);
        }

        if (Array.isArray(initialData.bilanRecip?.items)) {
          setLabItems(
            initialData.bilanRecip.items.map((it) => ({
              id: it.bilan?.id || it.bilanId || it.id,
              nom: it.bilan?.nom || it.nom || it.name || "",
              bilanId: it.bilanId || it.bilan?.id || it.id,
              resultat: it.resultat || null,
              remarque: it.remarque || null,
            }))
          );
        } else if (!editMode) {
          setLabItems([]);
        }

        if (initialData.justification) {
          const j = initialData.justification;
          const txt = typeof j === "string" ? j : j.texte || "";
          setJustifText(txt);
        } else if (!editMode) {
          setJustifText("");
        }
      }
    }
  }, [open, initialData, initialTab, editMode]);

  useEffect(() => {
    if (justifType && justifType !== "autre") {
      const selected = justifTypes.find(
        (t) => t.id === justifType || t.id === Number(justifType),
      );
      if (selected) {
        setJustifText(selected.texte || "");
      }
    }
  }, [justifType, justifTypes]);
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

  const handlePrintElectron = async () => {
    console.log(selectedPatient);
    setPrintingOrd(true);
    try {
      if (!prescriptionItems || prescriptionItems.length === 0) {
        //alert("Aucune donnée à imprimer");
        return;
      }
      const fullname = selectedPatient.nom;
      let prenom = "";
      let nom = "";

      if (fullname.trim()) {
        const parts = fullname.trim().split(" ");
        if (parts.length === 1) {
          // only one word provided
          nom = parts[0];
        } else {
          // assume last word is family name (Dib Amel → prenom: Amel, nom: Dib)
          prenom = parts.slice(0, -1).join(" ");
          nom = parts[parts.length - 1];
        }
      }
      const datenaissance = selectedPatient.dateDeNaissance;
      const age = calculateAge(datenaissance);
      // 1️⃣ Fetch last consultation + ordonnance IDs from your API
      const res = await fetch("/api/last-records");
      if (!res.ok)
        throw new Error("Erreur lors de la récupération des identifiants");
      const data = await res.json();

      // 2️⃣ Compute next IDs (safe even if null)
      const nextConsultationId = (data.lastConsultationId || 0) + 1;
      const nextOrdonnanceId = (data.lastOrdonnanceId || 0) + 1;

      console.log("🩺 Next Consultation ID:", nextConsultationId);
      console.log("💊 Next Ordonnance ID:", nextOrdonnanceId);
      console.log(nom + "-" + prenom + "-" + age);
      // 3️⃣ Send to printer (Electron or Web)
      printOrdonnance({
        consultationId: nextConsultationId,
        ordonnanceId: nextOrdonnanceId,
        nom: nom,
        prenom: prenom,
        age: age,
        items: prescriptionItems.map((it) => ({
          name: it.nom,
          dosage: it.dosage,
          duration: it.duree,
          frequency: it.frequence,
          quantity: it.quantite,
        })),
      });
    } catch (error) {
      console.error("Erreur lors de l'impression de l'ordonnance:", error);
      //  alert("Erreur lors de l'impression de l'ordonnance.");
    } finally {
      setPrintingOrd(false);
    }
  };
  const handlePrintBilanElectron = async () => {
    setPrintingBilan(true);
    try {
      if (!labItems || labItems.length === 0) {
        //  alert("Aucun examen à imprimer");
        return;
      }

      // 🧒 Split patient name into nom / prenom
      const fullname = selectedPatient.nom || "";
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

      // 🍼 Compute age (pediatric format)
      const datenaissance = selectedPatient.dateDeNaissance;
      const age = calculateAge(datenaissance);

      // 🧾 Fetch last IDs
      const res = await fetch("/api/last-records");
      if (!res.ok)
        throw new Error("Erreur lors de la récupération des identifiants");
      const data = await res.json();

      const nextBilanId = (data.lastBilanId || 0) + 1;
      const nextConsultationId = (data.lastConsultationId || 0) + 1;

      console.log("🧪 Next Bilan ID:", nextBilanId);
      console.log("🩺 Next Consultation ID:", nextConsultationId);
      console.log(`👶 ${nom} - ${prenom} - ${age}`);

      // 🖨️ Send to printer (Electron or Web)
      printBilan({
        bilanId: nextBilanId,
        consultationId: nextConsultationId,
        nom,
        prenom,
        age,
        items: labItems.map((exam) => ({
          id: exam.id,
          nom: exam.nom,
        })),
      });
    } catch (error) {
      console.error("Erreur lors de l'impression du bilan:", error);
      // alert("Erreur lors de l'impression du bilan.");
    } finally {
      setPrintingBilan(false);
    }
  };

  const handlePrintJustifElectron = async () => {
    setPrintingJustif(true);
    try {
      if (!justifText.trim()) {
        return;
      }

      // 🧒 Split patient name
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

      // 🍼 Compute age
      const datenaissance = selectedPatient?.dateDeNaissance;
      const age = calculateAge(datenaissance);

      // 🧾 Fetch last IDs
      const res = await fetch("/api/last-records");
      const data = res.ok ? await res.json() : {};

      const nextConsultationId = (data.lastConsultationId || 0) + 1;
      const nextJustificationId = (data.lastJustificationId || 0) + 1;
      // 🖨️ Send to printer
      printJustification({
        consultationId: nextConsultationId,
        justificationId: nextJustificationId,
        nom,
        prenom,
        age,
        texte: justifText.trim(),
      });
    } catch (error) {
      console.error("Erreur lors de l'impression de la justification:", error);
    } finally {
      setPrintingJustif(false);
    }
  };

  useEffect(() => {
    function handleShortcut(e) {
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        // e.preventDefault();
        //handlePrintElectron();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        //  e.preventDefault();
        // handleSave();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [prescriptionItems, labItems, justifText]);

  // Enhanced animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  async function handleAddBilan(form) {
    if (!form?.nom?.trim())
      return showAlert("Champ requis", "Le nom du bilan est obligatoire.");
    setLoading(true);
    try {
      const res = await fetch("/api/bilans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: form.nom.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'ajout du bilan.");
      }

      const created = await res.json();
      setBilans((prev) => [created, ...prev]);
      setNewBilan(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout du bilan:", err);
      showAlert("Erreur", err.message || "Impossible d'ajouter le bilan.");
    } finally {
      setLoading(false);
    }
  }
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.3 },
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: { duration: 0.2 },
    },
  };
  const scrollRef = useRef(null);

  // ✅ Always scroll to bottom when list changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [prescriptionItems]);
  const [alertData, setAlertData] = useState({
    open: false,
    title: "",
    message: "",
  });

  const showAlert = (title, message) =>
    setAlertData({ open: true, title, message });
  async function handleAddMedicament(nom) {
    if (!nom || !nom.trim()) {
      showAlert("Erreur", "Le nom du médicament est requis");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/medicaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nom.trim()),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'ajout du médicament.");
      }
      const created = await res.json();
      setMedicaments((prev) => [created, ...prev]);
      setNewMedicament(false);
    } catch (err) {
      console.error("Erreur lors de l'ajout du médicament:", err);
      showAlert("Erreur", err.message || "Impossible d'ajouter le médicament.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl min-w-4xl p-0 max-h-[97vh] overflow-hidden"
        onOpenAutoFocus={(e) => {
          if (activeTab === "ordonnance") {
            e.preventDefault();
            setTimeout(() => {
              medSearchRef.current?.focus();
            }, 50);
          }
        }}
      >
        <motion.div
          className="p-4 "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className={`grid ${
                editMode ? "grid-cols-1" : "grid-cols-3"
              } bg-gradient-to-r from-[var(--color-100)] to-[var(--color-50)] text-[var(--color-700)] rounded-xl p-1 shadow-sm`}
            >
              {(!editMode || editDocType === "ordonnance" || editDocType === "ord") && (
                <TabsTrigger
                  value="ordonnance"
                  disabled={editMode && editDocType !== "ordonnance" && editDocType !== "ord"}
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <Pill className="w-4 h-4 mr-2" />
                  {editMode
                    ? `Modifier l'Ordonnance #${editDocId || ""}`
                    : "Ordonnance"}
                </TabsTrigger>
              )}
              {(!editMode || editDocType === "bilan" || editDocType === "labs") && (
                <TabsTrigger
                  value="labs"
                  disabled={editMode && editDocType !== "bilan" && editDocType !== "labs"}
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <FlaskConical className="w-4 h-4 mr-2" />
                  {editMode
                    ? `Modifier le Bilan #${editDocId || ""}`
                    : "Bilans & Analyses"}
                </TabsTrigger>
              )}
              {(!editMode || editDocType === "justif" || editDocType === "justification") && (
                <TabsTrigger
                  value="justif"
                  disabled={editMode && editDocType !== "justif" && editDocType !== "justification"}
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {editMode
                    ? `Modifier la Justification #${editDocId || ""}`
                    : "Justification"}
                </TabsTrigger>
              )}
            </TabsList>

            {/* Ordonnance */}
            <TabsContent value="ordonnance">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="mt-3 border-[var(--color-300)] shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                    <CardTitle className="text-[var(--color-700)] flex items-center gap-2">
                      <Plus size={20} className="text-[var(--color-500)]" />{" "}
                      Rédiger une ordonnance
                    </CardTitle>
                    <Button
                      disabled={printingOrd}
                      className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
                      onClick={handlePrintElectron}
                      size="sm"
                    >
                      {printingOrd ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Impression...
                        </>
                      ) : (
                        "🖨️ Imprimer"
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2 relative">
                        <Label
                          htmlFor="med-search"
                          className="text-[var(--color-700)] font-medium"
                        >
                          Médicament
                        </Label>
                        <div className="relative">
                          <Input
                            ref={medSearchRef}
                            id="med-search"
                            placeholder="Tapez le nom du médicament..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleMedKeyDown}
                            className="focus:ring-2 focus:ring-[var(--color-400)] border-[var(--color-200)] transition-all duration-200"
                            autoComplete="off"
                          />
                          <motion.div
                            className="absolute right-3 top-3 pointer-events-none text-[var(--color-500)]"
                            animate={{ scale: query ? 1.1 : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Search size={16} />
                          </motion.div>
                        </div>

                        <AnimatePresence>
                          {query && (
                            <motion.ul
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-[var(--color-200)] rounded-xl shadow-2xl max-h-56 overflow-auto"
                            >
                              {suggestions.length > 0 ? (
                                suggestions.map((s, idx) => (
                                  <motion.li
                                    key={s.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-all duration-150 ${
                                      idx === highlightedMedIdx
                                        ? "bg-[var(--color-100)] border-l-4 border-[var(--color-500)]"
                                        : "hover:bg-[var(--color-50)]"
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedMedIdx(idx)
                                    }
                                    onClick={() => {
                                      setSelectedMed(s);
                                      setOpenMedDialog(true);
                                    }}
                                    ref={(el) => {
                                      if (idx === highlightedMedIdx && el)
                                        el.scrollIntoView({ block: "nearest" });
                                    }}
                                  >
                                    <div>
                                      <div className="font-semibold text-[var(--color-700)]">
                                        {s.nom}
                                      </div>
                                    </div>
                                    <div className="text-xs text-[var(--color-500)] font-medium bg-[var(--color-50)] px-2 py-1 rounded">
                                      sélectionner
                                    </div>
                                  </motion.li>
                                ))
                              ) : (
                                <div className="flex flex-col items-center justify-center py-4">
                                  <li className="text-sm text-gray-500 italic mb-2">
                                    Aucun médicament trouvé
                                  </li>
                                  <button
                                    onClick={() => setNewMedicament(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium 
               text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-lg 
               transition-all duration-150 shadow-sm"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Ajouter un médicament
                                  </button>
                                </div>
                              )}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                      {NewMedicament && (
                        <AddMedicamentModal
                          open={NewMedicament}
                          value={query}
                          onAdd={handleAddMedicament}
                          onClose={() => setNewMedicament(false)}
                        />
                      )}

                      <div>
                        <Label className="text-[var(--color-700)] font-medium">
                          Type d'ordonnance
                        </Label>
                        <Select
                          onValueChange={(v) => setType(v)}
                          defaultValue={type}
                        >
                          <SelectTrigger className="w-full border-[var(--color-300)] focus:ring-2 focus:ring-[var(--color-400)]">
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            {ordTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nom}
                              </SelectItem>
                            ))}
                            <SelectItem value="autre">Autre type</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Modal Médicament */}
              <Dialog open={openMedDialog} onOpenChange={setOpenMedDialog}>
                <DialogContent
                  className="sm:max-w-2xl"
                  onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    setTimeout(() => {
                      quantiteInputRef.current?.focus();
                      quantiteInputRef.current?.select();
                    }, 50);
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-[var(--color-700)] text-xl">
                      {selectedMed?.nom}{" "}
                      {selectedMed && `(${selectedMed.form})`}
                    </DialogTitle>
                    <p className="text-sm text-gray-500">
                      Choisissez la concentration, la posologie, la durée et la
                      quantité.
                    </p>
                  </DialogHeader>

                  {selectedMed && (
                    <div className="grid gap-4">
                      {/* === QUANTITE === */}
                      <div>
                        <Label
                          htmlFor="quantite-input"
                          className="text-[var(--color-700)] font-medium"
                        >
                          Quantité (boîtes)
                        </Label>
                        <Input
                          id="quantite-input"
                          ref={quantiteInputRef}
                          type="number"
                          min={1}
                          step={1}
                          placeholder="1"
                          value={tmpQuantite}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setTmpQuantite("");
                            } else {
                              const parsed = parseInt(val, 10);
                              setTmpQuantite(isNaN(parsed) ? "" : parsed);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              e.stopPropagation();
                              addMedication();
                            }
                          }}
                          className="mt-1 w-full rounded-lg border border-[var(--color-200)] px-3 py-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                        />
                      </div>
                      {/* === DOSAGE === */}
                      <div>
                        <Label className="text-[var(--color-700)] font-medium">
                          Dosage
                        </Label>
                        <select
                          value={tmpDose}
                          onChange={(e) => setTmpDose(e.target.value)}
                          className="border border-[var(--color-200)] rounded-lg p-2 w-full focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                        >
                          <option value="">-- Sélectionner --</option>

                          <option value="5 mg">5 mg</option>
                          <option value="10 mg">10 mg</option>
                          <option value="20 mg">20 mg</option>
                          <option value="50 mg">50 mg</option>
                          <option value="100 mg">100 mg</option>
                          <option value="500 mg">500 mg</option>
                          <option value="1 g">1 g</option>
                          <option value="1 ml">1 ml</option>
                          <option value="2 ml">2 ml</option>
                          <option value="5 ml">5 ml</option>
                          <option value="10 ml">10 ml</option>
                          <option value="20 ml">20 ml</option>
                          <option value="50 ml">50 ml</option>

                          <option value="autre">Autre...</option>
                        </select>

                        {tmpDose === "autre" && (
                          <input
                            type="text"
                            placeholder="Entrer un dosage personnalisé (ex: 12.5 mg)"
                            className="mt-2 w-full rounded-lg border border-[var(--color-200)] p-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                            value={customDose}
                            onChange={(e) => setCustomDose(e.target.value)}
                          />
                        )}
                      </div>

                      {/* === POSOLOGIE === */}
                      <div>
                        <Label className="text-[var(--color-700)] font-medium">
                          Posologie (rythme de prise)
                        </Label>
                        <select
                          className="w-full rounded-lg border border-[var(--color-200)] px-3 py-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                          value={tmpfreq}
                          onChange={(e) => setTmpfreq(e.target.value)}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="1 fois / jour">1 fois / jour</option>
                          <option value="2 fois / jour">2 fois / jour</option>
                          <option value="3 fois / jour">3 fois / jour</option>
                          <option value="Toutes les 8 heures">
                            Toutes les 8 heures
                          </option>
                          <option value="Selon besoin">Selon besoin</option>
                          <option value="autre">Autre...</option>
                        </select>

                        {tmpfreq === "autre" && (
                          <input
                            type="text"
                            placeholder="Entrer une posologie personnalisée"
                            className="mt-2 w-full rounded-lg border border-[var(--color-200)] p-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                            value={customFreq}
                            onChange={(e) => setCustomFreq(e.target.value)}
                          />
                        )}
                      </div>

                      {/* === DURÉE === */}
                      <div>
                        <Label className="text-[var(--color-700)] font-medium">
                          Durée
                        </Label>
                        <select
                          className="w-full rounded-lg border border-[var(--color-200)] px-3 py-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                          value={tmpDuration}
                          onChange={(e) => setTmpDuration(e.target.value)}
                        >
                          <option value="">-- Sélectionner --</option>
                          <option value="3 jours">3 jours</option>
                          <option value="5 jours">5 jours</option>
                          <option value="7 jours">7 jours</option>
                          <option value="10 jours">10 jours</option>
                          <option value="14 jours">14 jours</option>
                          <option value="20 jours">20 jours</option>

                          <option value="1 mois">1 mois</option>
                          <option value="2 mois">2 mois</option>
                          <option value="3 mois">3 mois</option>

                          <option value="autre">Autre...</option>
                        </select>

                        {tmpDuration === "autre" && (
                          <input
                            type="text"
                            placeholder="Entrer une durée personnalisée (ex: 21 jours)"
                            className="mt-2 w-full rounded-lg border border-[var(--color-200)] p-2 focus:ring-2 focus:ring-[var(--color-400)] transition-all"
                            value={customDuration}
                            onChange={(e) => setCustomDuration(e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setOpenMedDialog(false)}
                      className="border-[var(--color-300)] text-[var(--color-700)] hover:bg-[var(--color-50)]"
                    >
                      Annuler
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-[var(--color-600)] to-[var(--color-700)] hover:from-[var(--color-700)] hover:to-[var(--color-800)] shadow-md"
                      onClick={addMedication}
                    >
                      <Plus size={16} className="mr-2" /> Ajouter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Card className="mt-1 border-[var(--color-200)] h-[390px] flex flex-col shadow-md rounded-xl">
                <CardHeader className="py-1 bg-gradient-to-r from-[var(--color-50)] to-white">
                  <CardTitle className="text-[var(--color-700)] flex items-center justify-between text-sm sm:text-base">
                    <span>Ordonnance — Aperçu</span>
                    <span className="text-xs sm:text-sm bg-[var(--color-100)] text-[var(--color-700)] px-2 py-0.5 rounded-full">
                      {totalMeds} médicament{totalMeds > 1 ? "s" : ""}
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-3 sm:p-0">
                  {prescriptionItems.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-gray-400 text-sm"
                    >
                      <Pill size={36} className="mb-3 opacity-30" />
                      <p className="font-medium">Aucun médicament ajouté</p>
                      <p className="text-xs mt-1">
                        Ajoutez un médicament ci-dessus
                      </p>
                    </motion.div>
                  ) : (
                    <ul
                      ref={scrollRef}
                      className="space-y-3 max-h-[40vh] overflow-y-auto p-1  sm:p-6 scroll-smooth "
                    >
                      <AnimatePresence>
                        {prescriptionItems.map((it, index) => (
                          <motion.li
                            key={it.medicamentId}
                            variants={itemVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            className="flex items-center justify-between bg-white border border-[var(--color-100)] rounded-xl p-3 shadow-sm hover:shadow-md hover:border-[var(--color-300)] transition-all duration-300"
                          >
                            <div className="flex flex-col flex-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--color-400)] to-[var(--color-600)] flex items-center justify-center text-white font-semibold text-xs">
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="text-sm font-semibold text-[var(--color-700)]">
                                    {it.nom}
                                  </span>
                                  {it.dosage ? (
                                    <span className="text-xs text-gray-500 font-medium ml-1">
                                      {it.dosage}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="text-xs text-gray-600 mt-1 ml-8 space-x-1 flex flex-wrap gap-1 items-center">
                                {it.frequence ? (
                                  <span className="bg-[var(--color-50)] px-1.5 py-0.5 rounded">
                                    {it.frequence}
                                  </span>
                                ) : null}
                                {it.duree ? (
                                  <span className="bg-blue-50 px-1.5 py-0.5 rounded">
                                    {`pendant ${it.duree}`}
                                  </span>
                                ) : null}
                                <span className="bg-green-50 px-1.5 py-0.5 rounded text-green-700 font-semibold">
                                  {it.quantite || 1} boîte
                                  {(it.quantite || 1) > 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>

                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="hover:bg-red-100 transition rounded-full"
                                onClick={() => removeItem(it.medicamentId)}
                              >
                                <Trash2 size={16} className="text-red-500" />
                              </Button>
                            </motion.div>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Print Section (hidden) */}
              <div className="hidden" ref={printRef}>
                <div className="ord-print-header">
                  <div className="ord-print-title">Ordonnance Médicale</div>
                  <div className="ord-print-doc">
                    {param.doctorName || "Professeur"}
                  </div>
                  <div className="ord-print-date">
                    {new Date().toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <div className="ord-print-list">
                  {prescriptionItems.length === 0 ? (
                    <div className="text-gray-500 px-4 py-8 text-center">
                      Aucun médicament ajouté.
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {prescriptionItems.map((it) => (
                        <li
                          key={it.medicamentId}
                          className="flex flex-col p-3 border rounded-md hover:bg-[var(--color-50)] transition-colors ord-print-item"
                        >
                          <div className="font-medium text-[var(--color-700)] ord-print-item-title">
                            {it.nom}
                            {it.dosage ? ` ${it.dosage}` : ""}
                          </div>
                          <div className="text-sm text-gray-700 mt-1 ord-print-item-details">
                            {[
                              it.frequence,
                              it.duree ? `pendant ${it.duree}` : null,
                              `${it.quantite || 1} boîte${(it.quantite || 1) > 1 ? "s" : ""}`,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="ord-print-footer">
                  Signature : ................................
                </div>
              </div>
            </TabsContent>

            {/* Bilans & Analyses */}
            <TabsContent value="labs">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="mt-4 border-[var(--color-300)] shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                    <CardTitle className="text-[var(--color-700)] flex items-center gap-2">
                      <Plus size={20} className="text-[var(--color-500)]" />{" "}
                      Rédiger un bilan ou une analyse
                    </CardTitle>
                    <Button
                      disabled={printingBilan}
                      className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
                      onClick={handlePrintBilanElectron}
                      size="sm"
                    >
                      {printingBilan ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Impression...
                        </>
                      ) : (
                        "🖨️ Imprimer"
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2 relative">
                        <Label
                          htmlFor="lab-search"
                          className="text-[var(--color-700)] font-medium"
                        >
                          Examen / Analyse
                        </Label>
                        <div className="relative">
                          <Input
                            ref={labSearchRef}
                            id="lab-search"
                            placeholder="Tapez le nom de l'examen..."
                            value={labQuery}
                            onChange={(e) => setLabQuery(e.target.value)}
                            onKeyDown={handleLabKeyDown}
                            className="focus:ring-2 focus:ring-[var(--color-400)] border-[var(--color-200)] transition-all duration-200"
                            autoComplete="off"
                          />
                          <motion.div
                            className="absolute right-3 top-3 pointer-events-none text-[var(--color-500)]"
                            animate={{ scale: labQuery ? 1.1 : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Search size={16} />
                          </motion.div>
                        </div>
                        <AnimatePresence>
                          {labQuery && (
                            <motion.ul
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-[var(--color-200)] rounded-xl shadow-2xl max-h-56 overflow-auto"
                            >
                              {labSuggestions.length > 0 ? (
                                labSuggestions.map((exam, idx) => (
                                  <motion.li
                                    key={exam.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className={`px-4 py-3 flex justify-between items-center cursor-pointer transition-all duration-150 ${
                                      idx === highlightedLabIdx
                                        ? "bg-[var(--color-100)] border-l-4 border-[var(--color-500)]"
                                        : "hover:bg-[var(--color-50)]"
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedLabIdx(idx)
                                    }
                                    onClick={() => addLab(exam)}
                                    ref={(el) => {
                                      if (idx === highlightedLabIdx && el)
                                        el.scrollIntoView({ block: "nearest" });
                                    }}
                                  >
                                    <span className="font-semibold text-[var(--color-700)]">
                                      {exam.nom}
                                    </span>
                                    <span className="text-xs text-[var(--color-500)] font-medium bg-[var(--color-50)] px-2 py-1 rounded">
                                      ajouter
                                    </span>
                                  </motion.li>
                                ))
                              ) : (
                                <div className="flex flex-col items-center justify-center py-4">
                                  <li className="text-sm text-gray-500 italic mb-2">
                                    Aucun examen trouvé
                                  </li>
                                  <button
                                    onClick={() => setNewBilan(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium 
               text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-lg 
               transition-all duration-150 shadow-sm"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Ajouter un Bilan
                                  </button>
                                </div>
                              )}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                      <div>
                        {NewBilan && (
                          <AddBilanModal
                            open={NewBilan}
                            onAdd={handleAddBilan}
                            value={labQuery}
                            onClose={() => setNewBilan(false)}
                          />
                        )}
                        <Label className="text-[var(--color-700)] font-medium">
                          Type de bilan
                        </Label>
                        <Select
                          onValueChange={(v) => setSelectedBilanType(v)}
                          defaultValue={SelectedbilanType || "autre"}
                        >
                          <SelectTrigger className="w-full border-[var(--color-300)] focus:ring-2 focus:ring-[var(--color-400)]">
                            <SelectValue placeholder="Choisir le type" />
                          </SelectTrigger>
                          <SelectContent>
                            {bilanTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nom}
                              </SelectItem>
                            ))}
                            <SelectItem value="autre">Autre type</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Card className="mt-6 border-[var(--color-200)] shadow-md">
                      <CardHeader className="bg-gradient-to-r from-[var(--color-50)] to-white">
                        <CardTitle className="text-[var(--color-700)] flex items-center justify-between">
                          <span>Bilans & Analyses — Aperçu</span>
                          <span className="text-sm bg-[var(--color-100)] text-[var(--color-700)] px-3 py-1 rounded-full">
                            {labItems.length} examen
                            {labItems.length > 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {labItems.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-gray-400 h-40 flex flex-col items-center justify-center"
                          >
                            <FlaskConical
                              size={48}
                              className="mb-4 opacity-30"
                            />
                            <p className="text-lg">Aucun examen ajouté</p>
                            <p className="text-sm mt-2">
                              Recherchez et ajoutez des examens ci-dessus
                            </p>
                          </motion.div>
                        ) : (
                          <ul
                            ref={scrollRef2}
                            className="space-y-2 max-h-[40vh] overflow-y-auto p-1 sm:p-2 scroll-smooth"
                          >
                            <AnimatePresence>
                              {labItems.map((exam, index) => (
                                <motion.li
                                  key={exam.id}
                                  variants={itemVariants}
                                  initial="hidden"
                                  animate="visible"
                                  exit="exit"
                                  layout
                                  className="flex items-center justify-between border border-[var(--color-100)] rounded-xl p-3 hover:bg-[var(--color-50)] hover:border-[var(--color-300)] transition-all duration-300 bg-white shadow-sm"
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-[var(--color-700)] text-sm">
                                        {exam.nom}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Type : {bilanType || "Non précisé"}
                                      </div>
                                    </div>
                                  </div>

                                  <motion.div
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="hover:bg-red-100 transition rounded-full"
                                      onClick={() => removeLab(exam)}
                                    >
                                      <Trash2
                                        size={16}
                                        className="text-red-500"
                                      />
                                    </Button>
                                  </motion.div>
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                        )}
                      </CardContent>
                    </Card>

                    {/* Print Section (hidden) */}
                    <div className="hidden" ref={bilanPrintRef}>
                      <div className="bilan-print-header">
                        <div className="bilan-print-title">
                          Bilans & Analyses
                        </div>
                        <div className="bilan-print-doc">
                          {param.doctorName || "Professeur"}
                        </div>
                        <div className="bilan-print-date">
                          {new Date().toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      <div className="bilan-print-list">
                        {labItems.length === 0 ? (
                          <div className="text-gray-500 px-4 py-8">
                            Aucun examen ajouté.
                          </div>
                        ) : (
                          labItems.map((exam) => (
                            <div key={exam.id} className="bilan-print-item">
                              <div className="font-medium text-[var(--color-700)]">
                                {exam.nom}
                              </div>
                              <div className="text-sm text-gray-500">
                                Type : {bilanType || "Non précisé"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="bilan-print-footer">
                        Signature : ................................
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Justification médicale */}
            <TabsContent value="justif">
              <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card className="mt-4 border-[var(--color-300)] shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-[var(--color-50)] to-white rounded-t-lg">
                    <CardTitle className="text-[var(--color-700)]">
                      📄 Justification médicale / Arrêt de travail
                    </CardTitle>
                    <Button
                      disabled={printingJustif}
                      className="bg-gradient-to-r from-[var(--color-500)] to-[var(--color-600)] hover:from-[var(--color-600)] hover:to-[var(--color-700)] shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center gap-2"
                      onClick={handlePrintJustifElectron}
                      size="sm"
                    >
                      {printingJustif ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Impression...
                        </>
                      ) : (
                        "🖨️ Imprimer"
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label className="text-[var(--color-700)] font-medium">
                          Modèle de justification
                        </Label>
                        <Select
                          onValueChange={(v) => setJustifType(v)}
                          value={justifType}
                        >
                          <SelectTrigger className="w-full border-[var(--color-300)] focus:ring-2 focus:ring-[var(--color-400)]">
                            <SelectValue placeholder="Choisir un modèle..." />
                          </SelectTrigger>
                          <SelectContent>
                            {justifTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.nom}
                              </SelectItem>
                            ))}
                            <SelectItem value="autre">
                              Autre / Personnalisé
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label
                          htmlFor="justif-text"
                          className="text-[var(--color-700)] font-medium"
                        >
                          Texte de la justification
                        </Label>
                        <textarea
                          id="justif-text"
                          rows={8}
                          value={justifText}
                          onChange={(e) => setJustifText(e.target.value)}
                          className="w-full border-2 border-[var(--color-200)] rounded-xl p-4 mt-2 focus:ring-2 focus:ring-[var(--color-400)] focus:border-[var(--color-400)] transition-all"
                          placeholder="Ex : Je soussigné(e), Docteur en médecine, certifie que l'état de santé de l'enfant nécessite un arrêt..."
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Footer Save */}
          <motion.div
            className="mt-6 flex justify-end gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {editMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingEdit}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  disabled={isSavingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-2"
                  onClick={handleSave}
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "💾 Enregistrer les modifications"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 transition-all duration-200"
                  onClick={() => {
                    setPrescriptionItems([]);
                    setLabItems([]);
                    setJustifType(undefined);
                    setJustifText("");
                  }}
                >
                  Tout réinitialiser
                </Button>
                <Button
                  className="bg-gradient-to-r from-[var(--color-600)] to-[var(--color-700)] hover:from-[var(--color-700)] hover:to-[var(--color-800)] shadow-lg hover:shadow-xl transition-all duration-200"
                  onClick={handleSave}
                >
                  Sauvegarder tout
                </Button>
              </>
            )}
          </motion.div>
        </motion.div>
        <DialogAlert
          open={alertData.open}
          onClose={() => setAlertData({ ...alertData, open: false })}
          title={alertData.title}
          message={alertData.message}
        />
        <Dialog open={existDialog} onOpenChange={setExistDialog}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-[var(--color-700)]">
                Médicament existant
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Ce médicament est déjà ajouté dans l'ordonnance.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExistDialog(false)}
                className="text-[var(--color-700)] border-[var(--color-300)] hover:bg-[var(--color-50)]"
              >
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
