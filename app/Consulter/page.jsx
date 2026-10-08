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
} from "lucide-react";

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
import TraitementsTab from "@/app/component/Traitements/TraitementsTab";
import FinancesPatientTab from "@/app/component/Finances/FinancesPatientTab";
import { tabs } from "@heroui/theme";
export default function PatientDashboard() {
  const searchRef = useRef();
  const [selectedPatient, setSelectedPatient] = useState();
  const [preselectedTraitement, setPreselectedTraitement] = useState(null);
  const [search, setSearch] = useState("");
  const [files, setFiles] = useState([]);
  const [visitsinfo, setVisitsinfo] = useState(false);
  const [refrech, setrefrech] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedtab, setselectedtab] = useState("Informations Patient");
  const [NewConsultation, setNewConsultation] = useState(false);
  const [patientsData, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ShowAddDialogNewAnalyse, setShowAddDialogNewAnalyse] = useState(false);
  const [NewConsultationData, setNewConsultationData] = useState(null);
  const [lastid, setlastid] = useState(null);
  const [openNewordanance, setnewordanance] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [load, setload] = useState(false);
  const [query, setquery] = useState({ visites: "", ord: "", vaccination: "" });
  const [dateFilter, setDateFilter] = useState({
    visites: "",
    analyses: "",
    ord: "",
    vaccination: "",
  });
  const [successopen, setsuccessopen] = useState(false);
  const [DateTimeModal, setDataTimeModel] = useState(false);
  const [openAddElementModal, setOpenAddElementModal] = useState(false);
  const [viderForm, setViderForm] = useState(false);
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
    setquery((prev) => ({ ...prev, [att]: value }));
  };

  const handleDateChange = (value) => {
    let key = "ord";
    if (selectedtab === "Visites") key = "visites";
    else if (selectedtab === "Analyses et Résultats") key = "analyses";
    else if (selectedtab === "Vaccinations") key = "vaccination";
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

    setConfig({
      title: "Nouvelle consultation ajoutée !",
      description: "La consultation du patient a été ajoutée avec succès.",
    });
    setsuccessopen(true);
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
  const handleSaveConsultation = () => {};
  async function addconsultationfunction(data) {
    setDate(new Date().toISOString().split("T")[0]);
    setTime(new Date().toTimeString().slice(0, 5));
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

      // Ctrl+V: Vaccinations tab
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        setselectedtab("Vaccinations");
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
        icon: ClipboardList,
        label: "Antécédents",
        value: selectedPatient?.antecedents || "—",
        type: "textarea",
      },
      {
        icon: Droplets,
        label: "Groupe sanguin",
        value: selectedPatient?.groupeSanguin || "—",
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

  const medicalInfo = (selectedPatient) => {
    if (!selectedPatient) return [];

    const consultations = selectedPatient.consultations || [];
    const lastIndex = consultations.length - 1;

    const getInfo = (attr, index) => {
      for (let i = index; i >= 0; i--) {
        const val = consultations[i]?.[attr];
        if (val !== null && val !== undefined && val !== "") {
          return val;
        }
      }
      return null;
    };

    const c = lastIndex >= 0 ? consultations[lastIndex] : null;

    // 🦷 1. Traitements en cours
    const traitements = selectedPatient.traitements || [];
    const enCours = traitements.filter((t) => t.statut === "EN_COURS");
    const enCoursText =
      enCours.length > 0
        ? `${enCours.length} soin(s) en cours : ${enCours
            .map((t) => `${t.description}${t.dent ? ` (D${t.dent})` : ""}`)
            .join(", ")}`
        : "Aucun soin en cours";

    // 🦷 2. Dernier traitement
    const sortedTraitements = [...traitements].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const lastTr = sortedTraitements[0];
    let lastTrText = "Aucun traitement enregistré";
    if (lastTr) {
      const lastActe =
        lastTr.consultationsTraitement?.[0]?.acteRealise ||
        lastTr.acteRealise;
      lastTrText = `${lastTr.description}${
        lastTr.dent ? ` (Dent ${lastTr.dent})` : ""
      }${lastActe ? ` — Acte : ${lastActe}` : ""}${
        lastTr.createdAt
          ? ` (le ${new Date(lastTr.createdAt).toLocaleDateString("fr-FR")})`
          : ""
      }`;
    }

    // 💰 3. Dernier versement
    const allPaiements = [
      ...(selectedPatient.paiements || []),
      ...traitements.flatMap((t) => t.versements || []),
    ].filter(
      (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx
    );
    allPaiements.sort(
      (a, b) =>
        new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
    );
    const lastP = allPaiements[0];
    const lastVersementText = lastP
      ? `${Number(lastP.montant).toLocaleString("fr-FR")} DZD${
          lastP.date
            ? ` (le ${new Date(lastP.date).toLocaleDateString("fr-FR")})`
            : ""
        }${lastP.note ? ` - ${lastP.note}` : ""}`
      : "0 DZD";

    // 💳 4. Crédit / Solde restant
    const totalDu =
      selectedPatient.totalDu !== undefined
        ? Number(selectedPatient.totalDu)
        : traitements
            .filter((t) => t.statut !== "ANNULE")
            .reduce((sum, t) => sum + (Number(t.prixTotal) || 0), 0);

    const totalPaye =
      selectedPatient.totalPaye !== undefined
        ? Number(selectedPatient.totalPaye)
        : allPaiements.reduce(
            (sum, p) => sum + (Number(p.montant) || 0),
            0
          );

    const dette =
      selectedPatient.detteRestante !== undefined
        ? Number(selectedPatient.detteRestante)
        : Math.max(0, totalDu - totalPaye);

    const creditText =
      dette > 0
        ? `${dette.toLocaleString("fr-FR")} DZD (Reste à payer)`
        : "0 DZD (En règle)";

    const fields = [
      {
        icon: Activity,
        label: "Traitements en cours",
        value: enCoursText,
        onClickTab: "Traitements",
      },
      {
        icon: Sparkles,
        label: "Dernier traitement",
        value: lastTrText,
        onClickTab: "Traitements",
      },
      {
        icon: DollarSign,
        label: "Dernier versement",
        value: lastVersementText,
        onClickTab: "Finances & Crédits",
      },
      {
        icon: CreditCard,
        label: "Crédit patient",
        value: creditText,
        onClickTab: "Finances & Crédits",
      },
      {
        icon: Stethoscope,
        label: "Motif de consultation",
        value: lastIndex >= 0 ? getInfo("motifDeConsultation", lastIndex) : null,
        type: "textarea",
      },
      {
        icon: ClipboardList,
        label: "Notes",
        value: lastIndex >= 0 ? getInfo("note", lastIndex) : null,
        type: "textarea",
      },
      c?.rendezVous
        ? {
            icon: Clock,
            label: "Rendez-vous lié",
            value: `${new Date(c.rendezVous.date).toLocaleDateString(
              "fr-FR",
            )} - ${c.rendezVous.description || "Non spécifié"}`,
            unite: "",
          }
        : null,
    ];

    // Filter out fields with no value
    return fields
      .filter(
        (f) => f && f.value !== null && f.value !== undefined && f.value !== "",
      )
      .map((f) => {
        if (f.type === "textarea") {
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
                  { key: "Ctrl + V", desc: "Onglet Vaccinations" },
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

            {(selectedtab === "Visites" ||
              selectedtab === "Analyses et Résultats" ||
              selectedtab === "Prescriptions et Bilans" ||
              selectedtab === "Vaccinations") && (
              <DatePickerFilter
                value={
                  selectedtab === "Visites"
                    ? dateFilter.visites
                    : selectedtab === "Analyses et Résultats"
                      ? dateFilter.analyses
                      : selectedtab === "Prescriptions et Bilans"
                        ? dateFilter.ord
                        : dateFilter.vaccination
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
            ) : selectedtab === "Visites" ||
              selectedtab === "Informations Patient" ||
              selectedtab === "Traitements" ||
              selectedtab === "Finances & Crédits" ? (
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
            "Traitements",
            "Finances & Crédits",
            "Analyses et Résultats",
            "Vaccinations",
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
                  {[
                    {
                      title: "Informations Générales",
                      icon: User,
                      data: selectedPatient
                        ? generalInfo(selectedPatient)
                        : null,
                    },
                    {
                      title: "Informations Médicales",
                      icon: Stethoscope,
                      data: selectedPatient
                        ? medicalInfo(selectedPatient)
                        : null,
                    },
                    {
                      title: "Informations de Contact",
                      icon: Phone,
                      data: selectedPatient
                        ? contactInfo(selectedPatient)
                        : null,
                    },
                  ].map((section, sectionIndex) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.1 }}
                      className="mb-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        {/* Section Title */}
                        <h3 className="text-xl font-semibold text-[var(--color-700)] flex items-center gap-2">
                          <section.icon size={20} /> {section.title}
                        </h3>

                        {/* Optional Dossier/View Button */}
                        {section.title === "Informations Médicales" && (
                          <button
                            type="button"
                            onClick={() => setVisitsinfo(true)}
                            disabled={!selectedPatient?.id}
                            className="p-2 rounded-xl bg-[var(--color-500)] text-white shadow-sm hover:bg-[var(--color-700)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                            title="Historique des consultations"
                          >
                            <Files size={18} />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {section?.data?.map((info, infoIndex) => {
                          const isEmpty = !info.value || info.value === "—";

                          return (
                            <motion.div
                              key={info.label}
                              className={
                                section.title === "Informations Médicales"
                                  ? "cursor-pointer"
                                  : ""
                              }
                              onClick={() => {
                                if (info.onClickTab) {
                                  setselectedtab(info.onClickTab);
                                } else if (
                                  section.title === "Informations Médicales"
                                ) {
                                  setVisitsinfo(true);
                                }
                              }}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{
                                delay: sectionIndex * 0.1 + infoIndex * 0.05,
                              }}
                              whileHover={{ scale: 1.02, y: -2 }}
                            >
                              <Card
                                className={`flex items-center gap-3 p-3 shadow-sm transition-shadow w-full
          ${
            isEmpty
              ? "bg-gray-100 cursor-not-allowed opacity-60"
              : "bg-white hover:shadow-md"
          }`}
                              >
                                {[
                                  "Motif de consultation",
                                  "Notes",
                                  "Antécédents",
                                ].includes(info.label) ? (
                                  // Long text fields
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
                                      className={`
      w-full
      min-w-0
      h-auto
      min-h-[80px]
      rounded-md
      px-0
      py-0
      ${isEmpty ? "bg-gray-50 text-gray-400" : "bg-gray-50 text-gray-800"}
    `}
                                    >
                                      <span
                                        className="
        block
        w-full
        h-auto
        min-h-[60px]
        font-medium
        leading-6
        whitespace-pre-wrap
        break-words
        
      "
                                      >
                                        {info.value || "—"} {info.unite}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  // Normal fields
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
                                        {info.value || "—"} {info.unite}
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
                  ))}
                </>
              )}
              {selectedtab === "Traitements" && (
                <TraitementsTab
                  selectedPatient={selectedPatient}
                  patient={selectedPatient}
                  patientId={selectedPatient?.id}
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
      <Dialog open={DateTimeModal} onOpenChange={setDataTimeModel}>
        <DialogContent className="sm:max-w-xl w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-slate-900">
              Programmer une consultation
            </DialogTitle>
            <DialogDescription className="text-base text-slate-500">
              Choisissez la date et l&rsquo;heure de cette consultation avant de
              l&rsquo;enregistrer.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Date */}
              <label className="flex flex-col gap-1.5 text-base">
                <span className="font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] transition-all"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              {/* Time */}
              <label className="flex flex-col gap-1.5 text-base">
                <span className="font-medium text-slate-700">Heure</span>
                <input
                  type="time"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] transition-all"
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
              onClick={() => setDataTimeModel(false)}
              className="px-5 py-2.5 text-base rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={() => {
                addConsultation(NewConsultationData);
                setDataTimeModel(false);
              }}
              disabled={!date || !time}
              className="px-5 py-2.5 text-base rounded-xl bg-[var(--color-600)] text-white font-medium shadow-sm hover:bg-[var(--color-700)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Enregistrer la consultation
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
