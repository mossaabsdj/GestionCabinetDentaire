"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  User,
  Stethoscope,
  Phone,
  MapPin,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Upload,
  Eye,
  Database,
  UploadCloud,
  DownloadCloud,
  Palette,
  Loader2,
  IdCard,
  Contact,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTheme, themes } from "@/context/theme-context";
import AlertModal from "@/app/component/success/page";

// === Animation ===
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

const DEFAULT_CABINET_DATA = {
  title: "Docteur",
  doctorName: "Docteur",
  doctorNameAr: "دكتور",
  specialty: "Chirurgien Dentiste",
  specialtyAr: "جراحة و طب الأسنان",
  cabinetName: "Cabinet Dentaire",
  cabinetNameAr: "عيادة طب الأسنان",
  address: "Rue Frères KAFI logts 38, 1er étage",
  addressAr: "شارع الإخوة كافي عقار 38 الطابق الأول",
  city: "El-Harrouch SKIKDA",
  cityAr: "(بزاز لعلاوي) الحروش - سكيكدة",
  phones: "0652 76 89 72 / 0562 24 40 87",
  logo: "/uploads/image.PNG",
};

// === UI only: tab definitions ===
const TABS = [
  { id: "identity", label: "Identité", icon: IdCard },
  { id: "contact", label: "Coordonnées", icon: Contact },
  { id: "appearance", label: "Apparence", icon: Palette },
  { id: "backup", label: "Sauvegarde", icon: Database },
];

// === UI only: bilingual field (FR left, AR right) ===
const inputBase =
  "w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] outline-none transition-all bg-white";

function Field({ icon: Icon, label, rtl, mono, className = "", ...props }) {
  return (
    <div className={className}>
      <label
        className={`text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 ${
          rtl ? "flex-row-reverse text-right" : ""
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${rtl ? "text-emerald-600" : "text-blue-600"}`}
        />
        {label}
      </label>
      <input
        type="text"
        dir={rtl ? "rtl" : undefined}
        className={`${inputBase} ${rtl ? "text-right font-arabic" : ""} ${
          mono ? "font-mono" : ""
        }`}
        {...props}
      />
    </div>
  );
}

export default function ParametrePage() {
  // === Cabinet State ===
  const [cabinet, setCabinet] = useState(DEFAULT_CABINET_DATA);
  const [loadingCabinet, setLoadingCabinet] = useState(true);
  const [savingCabinet, setSavingCabinet] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  // === UI only: active tab ===
  const [activeTab, setActiveTab] = useState("identity");

  // === Backup & Restore State ===
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [loadingRestore, setLoadingRestore] = useState(false);
  const fileInputRef = useRef(null);

  // === Centered Alert Modal State ===
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "success",
    title: "",
    description: "",
  });

  const showAlert = (type, title, description, autoClose = true) => {
    setAlertConfig({
      type,
      title,
      description,
      autoClose,
      autoCloseDelay: type === "error" ? 4000 : 2500,
    });
    setAlertOpen(true);
  };

  const { theme, setTheme } = useTheme();

  // === Load Cabinet Settings on Mount ===
  useEffect(() => {
    async function loadCabinet() {
      try {
        setLoadingCabinet(true);
        const res = await fetch("/api/cabinet");
        if (res.ok) {
          const data = await res.json();
          setCabinet((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Erreur de chargement des paramètres du cabinet:", err);
      } finally {
        setLoadingCabinet(false);
      }
    }
    loadCabinet();
  }, []);

  // === Handle Cabinet Field Change ===
  const handleCabinetChange = (field, value) => {
    setCabinet((prev) => ({ ...prev, [field]: value }));
  };

  // === Helper: Compress and convert image to Base64 Data URL ===
  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
      // SVGs don't need canvas downscaling
      if (file.type === "image/svg+xml") {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => resolve(e.target.result); // Fallback to raw base64
        img.onload = () => {
          const MAX_DIM = 500;
          let width = img.width;
          let height = img.height;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const mime = file.type === "image/jpeg" ? "image/jpeg" : "image/png";
          const dataUrl = canvas.toDataURL(mime, 0.92);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // === Handle Logo Upload ===
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);

      // 1. Process image to optimized Base64 data URL
      const dataUrl = await processImageFile(file);

      // 2. Also upload to disk as file backup
      try {
        const formData = new FormData();
        formData.append("file", file);
        await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
      } catch (uploadErr) {
        console.warn("Server file upload failed, using Base64 data:", uploadErr);
      }

      // 3. Immediately update state and save to database
      const updatedCabinet = { ...cabinet, logo: dataUrl };
      setCabinet(updatedCabinet);

      const res = await fetch("/api/cabinet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedCabinet),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || "Erreur lors de l'enregistrement du logo.",
        );
      }

      const savedCabinet = await res.json();
      setCabinet((prev) => ({ ...prev, ...savedCabinet, logo: dataUrl }));

      showAlert(
        "success",
        "Logo mis à jour",
        "Le nouveau logo a été enregistré avec succès.",
      );
    } catch (err) {
      console.error("Erreur mise à jour logo:", err);
      showAlert(
        "error",
        "Erreur",
        err.message || "Impossible de charger le nouveau logo.",
      );
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // === Handle Save Cabinet ===
  const handleSaveCabinet = async (e) => {
    e?.preventDefault?.();
    try {
      setSavingCabinet(true);

      const res = await fetch("/api/cabinet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cabinet),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error || "Erreur lors de la mise à jour des paramètres.",
        );
      }

      const updated = await res.json();
      setCabinet((prev) => ({ ...prev, ...updated }));
      showAlert(
        "success",
        "Enregistré !",
        "Les informations du cabinet ont été enregistrées avec succès.",
      );
    } catch (err) {
      console.error(err);
      showAlert(
        "error",
        "Échec de l'enregistrement",
        err.message || "Impossible d'enregistrer les informations.",
      );
    } finally {
      setSavingCabinet(false);
    }
  };

  // === Handle Reset to Default ===
  const handleResetCabinet = () => {
    if (
      window.confirm(
        "Voulez-vous réinitialiser les informations aux valeurs par défaut ?",
      )
    ) {
      setCabinet(DEFAULT_CABINET_DATA);
      showAlert(
        "info",
        "Réinitialisé",
        "Les valeurs par défaut ont été rétablies. Cliquez sur Enregistrer pour confirmer.",
      );
    }
  };

  // === Handle Backup (Full App JSON Export) ===
  const handleBackup = async () => {
    try {
      setLoadingBackup(true);

      if (typeof window !== "undefined" && window?.electron?.backup) {
        const result = await window.electron.backup();
        if (result?.canceled) return;
        if (result?.success) {
          showAlert(
            "success",
            "Sauvegarde exportée !",
            `La base de données a été exportée au format JSON avec succès.`,
          );
        } else {
          throw new Error(result?.message || "Échec de l'exportation.");
        }
      } else {
        const res = await fetch("/api/backup");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || "Échec du téléchargement de la sauvegarde.",
          );
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const timestamp = new Date().toISOString().split("T")[0];
        a.download = `backup_amel_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showAlert(
          "success",
          "Exportation réussie !",
          "Le fichier de sauvegarde JSON de l'application a été téléchargé.",
        );
      }
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Échec de l'exportation",
        error.message || "Une erreur est survenue lors de l'exportation.",
      );
    } finally {
      setLoadingBackup(false);
    }
  };

  // === Handle Restore Button Click ===
  const handleRestoreClick = async () => {
    try {
      if (typeof window !== "undefined" && window?.electron?.restore) {
        setLoadingRestore(true);
        const result = await window.electron.restore();
        if (result?.canceled) return;
        if (result?.success) {
          showAlert(
            "success",
            "Restauration réussie !",
            "Toutes les données ont été restaurées avec succès depuis le fichier JSON.",
          );
        } else {
          throw new Error(result?.message || "Échec de l'importation.");
        }
      } else {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          fileInputRef.current.click();
        }
      }
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Échec de l'importation",
        error.message || "Erreur lors de la restauration.",
      );
    } finally {
      setLoadingRestore(false);
    }
  };

  // === Handle File Input Selection in Browser (JSON) ===
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoadingRestore(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la restauration.");
      }

      showAlert(
        "success",
        "Restauration réussie !",
        "Toutes les données de l'application ont été restaurées avec succès.",
      );
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Échec de l'importation",
        error.message || "Impossible d'importer ce fichier de sauvegarde.",
      );
    } finally {
      setLoadingRestore(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleThemeChange = (value) => {
    setTheme(value);
  };

  // === UI only: derived flags ===
  const isCabinetTab = activeTab === "identity" || activeTab === "contact";

  // === UI only: live print-header preview ===
  const HeaderPreview = (
    <div className="bg-white border-2 border-[#2c3e50] rounded-xl p-4 shadow-md">
      <div className="flex justify-between items-start gap-3 pb-3 border-b-2 border-[#2c3e50]">
        <div className="flex-1 text-[11px] text-gray-800 leading-relaxed">
          <strong className="text-xs text-[#2c3e50] font-bold block mb-0.5">
            {cabinet.doctorName || "Docteur"}
          </strong>
          <div className="text-gray-700 mb-1">
            {cabinet.specialty ||
              "Chirurgien Dentiste"}
          </div>
          <div className="text-gray-600">
            <strong>Adresse :</strong>{" "}
            {cabinet.address || "Rue Frères KAFI logts 38, 1er étage"}
          </div>
          <div className="text-gray-600">
            {cabinet.city || "El-Harrouch SKIKDA"}
          </div>
        </div>

        <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center p-1">
          <img
            src={cabinet.logo || "/uploads/image.PNG"}
            alt="Logo"
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/uploads/image.PNG";
            }}
          />
        </div>

        <div
          className="flex-1 text-[11px] text-gray-800 leading-relaxed text-right font-arabic"
          dir="rtl"
        >
          <strong className="text-xs text-[#2c3e50] font-bold block mb-0.5">
            {cabinet.doctorNameAr || "طبيب"}
          </strong>
          <div className="text-gray-700 mb-1">
            {cabinet.specialtyAr || "جراحة الأسنان"}
          </div>
          <div className="text-gray-600">
            <strong>العنوان :</strong>{" "}
            {cabinet.addressAr || "شارع الإخوة كافي عقار 38 الطابق الأول"}
          </div>
          <div className="text-gray-600">
            {cabinet.cityAr || "(بزاز لعلاوي) الحروش - سكيكدة"}
          </div>
        </div>
      </div>

      <div className="text-center text-[11px] font-semibold text-gray-800 mt-2.5">
        <strong>Tél :</strong>{" "}
        {cabinet.phones || "0652 76 89 72 / 0562 24 40 87"}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/70 p-4 sm:p-6 md:p-8">
      {/* Centered Nice Alert Modal */}
      <AlertModal
        config={alertConfig}
        dialogOpen={alertOpen}
        setDialogOpen={setAlertOpen}
      />

      {/* Hidden file input (restore) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="max-w-6xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--color-600)] rounded-xl shadow-md text-white">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Paramètres du Cabinet & Application
            </h1>
            <p className="text-sm text-gray-600">
              Personnalisation de l'en-tête, thème, sauvegarde et restauration
              globale en JSON
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Sections des paramètres"
          className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className={`flex-1 min-w-fit px-4 py-2.5 text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-500)] ${
                  active
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ===================== CABINET TABS (form) ===================== */}
        {isCabinetTab && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            <Card className="lg:col-span-3 border border-gray-200 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-[var(--color-600)]" />
                  {activeTab === "identity"
                    ? "Identité du cabinet"
                    : "Adresse et contact"}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Informations bilingues (Français / العربية) imprimées sur vos
                  ordonnances, bilans et justifications
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                {loadingCabinet ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-600)]" />
                    <span className="ml-3 text-sm text-gray-600">
                      Chargement des paramètres...
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveCabinet} className="space-y-6">
                    {/* ---------- Identity ---------- */}
                    <div
                      className={
                        activeTab === "identity" ? "space-y-6" : "hidden"
                      }
                    >
                      {/* Logo */}
                      <div className="flex items-center gap-5 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                        <div className="w-24 h-24 shrink-0 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-2 flex items-center justify-center overflow-hidden">
                          {cabinet.logo ? (
                            <img
                              src={cabinet.logo}
                              alt="Logo Cabinet"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "/uploads/image.PNG";
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-gray-300" />
                          )}
                        </div>

                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-sm font-semibold text-gray-800">
                            Logo du cabinet
                          </span>
                          <input
                            type="file"
                            ref={logoInputRef}
                            onChange={handleLogoUpload}
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            disabled={uploadingLogo}
                            className="px-3.5 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {uploadingLogo ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Chargement...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                Changer le logo
                              </>
                            )}
                          </button>
                          <span className="text-[11px] text-gray-500">
                            PNG, JPG, WEBP (transparent recommandé)
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field
                          icon={User}
                          label="Titre / Grade (Français)"
                          value={cabinet.title}
                          onChange={(e) =>
                            handleCabinetChange("title", e.target.value)
                          }
                          placeholder="Ex: Professeur ou Dr."
                        />
                        <Field
                          icon={User}
                          label="Nom du Professeur / Médecin (Français)"
                          value={cabinet.doctorName}
                          onChange={(e) =>
                            handleCabinetChange("doctorName", e.target.value)
                          }
                          placeholder="Ex: Professeur DIB Amel"
                        />
                        <Field
                          rtl
                          className="md:col-span-2"
                          icon={User}
                          label="اسم و لقب البروفيسور / الطبيب (العربية)"
                          value={cabinet.doctorNameAr}
                          onChange={(e) =>
                            handleCabinetChange("doctorNameAr", e.target.value)
                          }
                          placeholder="مثال: بروفيسور ديب أمال"
                        />
                        <Field
                          icon={Stethoscope}
                          label="Spécialité (Français)"
                          value={cabinet.specialty}
                          onChange={(e) =>
                            handleCabinetChange("specialty", e.target.value)
                          }
                          placeholder="Ex: Chirurgien Dentiste"
                        />
                        <Field
                          rtl
                          icon={Stethoscope}
                          label="الاختصاص (العربية)"
                          value={cabinet.specialtyAr}
                          onChange={(e) =>
                            handleCabinetChange("specialtyAr", e.target.value)
                          }
                          placeholder="مثال: جراحة الأسنان"
                        />
                        <Field
                          icon={Building2}
                          label="Nom du cabinet (Français)"
                          value={cabinet.cabinetName}
                          onChange={(e) =>
                            handleCabinetChange("cabinetName", e.target.value)
                          }
                          placeholder="Ex: Cabinet Dentaire"
                        />
                        <Field
                          rtl
                          icon={Building2}
                          label="اسم العيادة (العربية)"
                          value={cabinet.cabinetNameAr}
                          onChange={(e) =>
                            handleCabinetChange("cabinetNameAr", e.target.value)
                          }
                          placeholder="مثال: عيادة طب الأسنان"
                        />
                      </div>
                    </div>

                    {/* ---------- Contact ---------- */}
                    <div
                      className={
                        activeTab === "contact"
                          ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                          : "hidden"
                      }
                    >
                      <Field
                        icon={MapPin}
                        label="Adresse (Français)"
                        value={cabinet.address}
                        onChange={(e) =>
                          handleCabinetChange("address", e.target.value)
                        }
                        placeholder="Ex: Rue Frères KAFI logts 38, 1er étage"
                      />
                      <Field
                        rtl
                        icon={MapPin}
                        label="العنوان (العربية)"
                        value={cabinet.addressAr}
                        onChange={(e) =>
                          handleCabinetChange("addressAr", e.target.value)
                        }
                        placeholder="مثال: شارع الإخوة كافي عقار 38 الطابق الأول"
                      />
                      <Field
                        icon={MapPin}
                        label="Ville / Wilaya (Français)"
                        value={cabinet.city}
                        onChange={(e) =>
                          handleCabinetChange("city", e.target.value)
                        }
                        placeholder="Ex: El-Harrouch SKIKDA"
                      />
                      <Field
                        rtl
                        icon={MapPin}
                        label="المدينة / الولاية (العربية)"
                        value={cabinet.cityAr}
                        onChange={(e) =>
                          handleCabinetChange("cityAr", e.target.value)
                        }
                        placeholder="مثال: (بزاز لعلاوي) الحروش - سكيكدة"
                      />
                      <Field
                        mono
                        className="md:col-span-2"
                        icon={Phone}
                        label="Numéros de téléphone (séparés par /)"
                        value={cabinet.phones}
                        onChange={(e) =>
                          handleCabinetChange("phones", e.target.value)
                        }
                        placeholder="Ex: 0652 76 89 72 / 0562 24 40 87"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-5 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleResetCabinet}
                        className="px-3.5 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1.5"
                        title="Réinitialiser les champs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Par défaut
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCabinet}
                        disabled={savingCabinet || loadingCabinet}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-lg transition-all shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {savingCabinet ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enregistrement...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Enregistrer
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Sticky live preview */}
            <div className="lg:col-span-2 lg:sticky lg:top-6 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--color-600)]" />
                <span className="text-sm font-semibold text-gray-800">
                  Aperçu en direct de l'en-tête d'impression
                </span>
              </div>
              {HeaderPreview}
            </div>
          </div>
        )}

        {/* ===================== APPEARANCE TAB ===================== */}
        {activeTab === "appearance" && (
          <Card className="border border-gray-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-[var(--color-600)]" />
                Thème et apparence
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Choisissez le thème et la palette de couleurs de l'application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full md:w-80">
                  <SelectValue placeholder="Sélectionner un thème" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {themes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: t.color }}
                        />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* ===================== BACKUP TAB ===================== */}
        {activeTab === "backup" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardHeader className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DownloadCloud className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Exporter la base de données
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Téléchargez une sauvegarde complète de toutes les données au
                    format JSON
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={loadingBackup}
                  className="px-5 py-2.5 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  {loadingBackup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exportation en cours...
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      Exporter en JSON
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardHeader className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <UploadCloud className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Importer une sauvegarde
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Restaurez vos données depuis un fichier de sauvegarde
                    (.json)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <button
                  type="button"
                  onClick={handleRestoreClick}
                  disabled={loadingRestore}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  {loadingRestore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restauration en cours...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Importer un fichier JSON
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
