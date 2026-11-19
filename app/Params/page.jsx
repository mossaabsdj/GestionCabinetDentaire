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
  Palette,
  Loader2,
  ShieldCheck,
  KeyRound,
  Hash,
  ExternalLink,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Swal from "sweetalert2";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  appName: "Cabinet Dentaire",
  title: "Docteur",
  doctorName: "Docteur",
  doctorNameAr: "دكتور",
  specialty: "Chirurgien Dentiste",
  specialtyAr: "جراحة و طب الأسنان",
  cabinetName: "Cabinet Dentaire",
  cabinetNameAr: "عيادة طب الأسنان",
  numOrdre: "",
  address: "Rue Frères KAFI logts 38, 1er étage",
  addressAr: "شارع الإخوة كافي عقار 38 الطابق الأول",
  city: "El-Harrouch SKIKDA",
  cityAr: "(بزاز لعلاوي) الحروش - سكيكدة",
  phones: "0652 76 89 72 / 0562 24 40 87",
  logo: "/uploads/image.PNG",
};

// === Tab definitions ===
const TABS = [
  { id: "clinic", label: "En-tête & Informations du Cabinet", icon: Building2 },
  { id: "appearance", label: "Apparence & Thème", icon: Palette },
  { id: "backup", label: "Sauvegarde & Restauration", icon: Database },
];

// === Input field component ===
const inputBase =
  "w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-500)] focus:border-[var(--color-500)] outline-none transition-all bg-white";

function Field({ icon: Icon, label, rtl, mono, className = "", helper = "", ...props }) {
  return (
    <div className={className}>
      <label
        className={`text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 ${
          rtl ? "flex-row-reverse text-right" : ""
        }`}
      >
        <Icon
          className={`w-3.5 h-3.5 shrink-0 ${rtl ? "text-emerald-600" : "text-blue-600"}`}
        />
        <span>{label}</span>
      </label>
      <input
        type="text"
        dir={rtl ? "rtl" : undefined}
        className={`${inputBase} ${rtl ? "text-right font-arabic" : ""} ${
          mono ? "font-mono" : ""
        }`}
        {...props}
      />
      {helper && (
        <p className={`text-2xs text-gray-500 mt-1 ${rtl ? "text-right font-arabic" : ""}`}>
          {helper}
        </p>
      )}
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

  // === Modal State ===
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);

  // === Active Tab ===
  const [activeTab, setActiveTab] = useState("clinic");

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

  // === Handle Cabinet Field Change (Live updates) ===
  const handleCabinetChange = (field, value) => {
    setCabinet((prev) => ({ ...prev, [field]: value }));
  };

  // === Helper: Compress and convert image to Base64 Data URL ===
  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
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
        img.onerror = () => resolve(e.target.result);
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

      // 1. Process image to optimized Base64 data URL for instant display
      const dataUrl = await processImageFile(file);

      // 2. Also upload to disk as file backup
      let serverUrl = null;
      try {
        const formData = new FormData();
        formData.append("file", file);
        const upRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (upRes.ok) {
          const upData = await upRes.json();
          serverUrl = upData.url;
        }
      } catch (uploadErr) {
        console.warn("Server file upload failed, using Base64 data:", uploadErr);
      }

      // 3. Immediately update state and save to database
      const chosenLogo = serverUrl || dataUrl;
      const updatedCabinet = { ...cabinet, logo: chosenLogo };
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
      setCabinet((prev) => ({ ...prev, ...savedCabinet, logo: chosenLogo }));

      showAlert(
        "success",
        "Logo mis à jour",
        "Le nouveau logo a été enregistré avec succès et mis à jour sur l'en-tête.",
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
      setIsCabinetModalOpen(false);

      showAlert(
        "success",
        "Enregistré !",
        "Toutes les informations du cabinet et de l'en-tête d'impression ont été synchronisées avec succès.",
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
        "Les valeurs par défaut ont été rétablies. Cliquez sur Enregistrer pour confirmer la persistance.",
      );
    }
  };

  // === Handle Backup ===
  const handleBackup = async () => {
    try {
      setLoadingBackup(true);

      if (typeof window !== "undefined" && window?.electron?.backup) {
        const result = await window.electron.backup();
        if (result?.canceled) return;
        if (result?.success) {
          showAlert(
            "success",
            "Sauvegarde chiffrée avec succès !",
            "Toutes les données ont été chiffrées en AES-256-GCM avec la clé secrète du fichier .env et exportées en toute sécurité.",
          );
        } else {
          throw new Error(result?.message || "Échec de l'exportation.");
        }
      } else {
        const res = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
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
        a.download = `backup_dentaire_${timestamp}.cbak`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        showAlert(
          "success",
          "Sauvegarde chiffrée exportée !",
          "Le fichier de sauvegarde chiffré (AES-256-GCM) a été téléchargé.",
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

  // === Handle Restore ===
  const handleRestoreClick = async () => {
    try {
      if (typeof window !== "undefined" && window?.electron?.selectBackupFile) {
        const selection = await window.electron.selectBackupFile();
        if (selection?.canceled || !selection?.filePath) return;

        if (selection.isValid === false) {
          throw new Error(selection.error || "Ce fichier n'est pas un fichier de sauvegarde valide.");
        }

        setLoadingRestore(true);

        let result = await window.electron.restore({
          filePath: selection.filePath,
        });

        if (
          !result?.success &&
          result?.message &&
          (result.message.includes("Mot de passe incorrect") ||
            result.message.includes("déchiffrer") ||
            result.message.includes("altéré"))
        ) {
          setLoadingRestore(false);
          const { value: customPwd } = await Swal.fire({
            title: "Mot de passe requis",
            text: "Cette sauvegarde a été chiffrée avec un mot de passe différent de celui du fichier .env. Veuillez saisir le mot de passe de cette sauvegarde :",
            input: "password",
            inputPlaceholder: "Mot de passe de la sauvegarde",
            showCancelButton: true,
            confirmButtonText: "Déchiffrer et restaurer",
            cancelButtonText: "Annuler",
            confirmButtonColor: "#059669",
            cancelButtonColor: "#6b7280",
            inputValidator: (val) => {
              if (!val) {
                return "Le mot de passe est obligatoire.";
              }
            },
          });

          if (!customPwd) return;

          setLoadingRestore(true);
          result = await window.electron.restore({
            filePath: selection.filePath,
            password: customPwd,
          });
        }

        if (result?.canceled) return;
        if (result?.success) {
          showAlert(
            "success",
            "Restauration réussie !",
            "Toutes les données ont été déchiffrées, validées et restaurées avec succès.",
          );
        } else {
          throw new Error(result?.message || "Échec de l'importation.");
        }
      } else {
        if (fileInputRef.current) fileInputRef.current.click();
      }
    } catch (error) {
      console.error(error);
      showAlert(
        "error",
        "Échec de l'importation",
        error.message || "Impossible d'importer ce fichier de sauvegarde.",
      );
    } finally {
      setLoadingRestore(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoadingRestore(true);
      const formData = new FormData();
      formData.append("backupFile", file);

      let res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      let data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la restauration.");
      }

      showAlert(
        "success",
        "Restauration réussie !",
        "Toutes les données ont été déchiffrées et restaurées avec succès.",
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

  const isCabinetTab =
    activeTab === "clinic" || activeTab === "identity" || activeTab === "contact";

  // === Dynamic Check for N° d'Ordre ===
  // Rule: If empty or set to "0", do NOT display it on printed documents. Otherwise display correctly.
  const rawNumOrdre = String(cabinet.numOrdre ?? "").trim();
  const showNumOrdre = rawNumOrdre !== "" && rawNumOrdre !== "0";

  // === Live Real-Time Print-Header Preview ===
  const HeaderPreview = (
    <div className="border-2 border-[#2c3e50] rounded-xl p-4 bg-white shadow-inner">
      {/* Top Header Row (Bilingual + Central Logo) */}
      <div className="flex justify-between items-start gap-4 pb-3 border-b-2 border-[#2c3e50]">
        {/* Bloc Gauche : Médecin (Français) */}
        <div className="flex-1 text-[11px] text-gray-800 leading-snug">
          <strong className="text-sm text-[#2c3e50] font-extrabold block mb-0.5">
            {cabinet.doctorName || "Docteur"}
          </strong>
          <div className="text-gray-700 font-semibold mb-0.5 text-xs">
            {cabinet.specialty || "Chirurgien Dentiste"}
          </div>
          {cabinet.cabinetName && (
            <div className="text-gray-600 text-[10px] font-medium">
              {cabinet.cabinetName}
            </div>
          )}
        </div>

        {/* Logo Central */}
        <div className="flex-shrink-0 w-20 h-20 flex items-center justify-center p-1.5 bg-gray-50/70 rounded-xl border border-gray-200">
          <img
            src={cabinet.logo || "/uploads/image.PNG"}
            alt="Logo Cabinet"
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/uploads/image.PNG";
            }}
          />
        </div>

        {/* Bloc Droit : Médecin (Arabe) */}
        <div
          className="flex-1 text-[11px] text-gray-800 leading-snug text-right font-arabic"
          dir="rtl"
        >
          <strong className="text-sm text-[#2c3e50] font-extrabold block mb-0.5">
            {cabinet.doctorNameAr || "طبيب"}
          </strong>
          <div className="text-gray-700 font-semibold mb-0.5 text-xs">
            {cabinet.specialtyAr || "جراحة الأسنان"}
          </div>
          {cabinet.cabinetNameAr && (
            <div className="text-gray-600 text-[10px]">
              {cabinet.cabinetNameAr}
            </div>
          )}
        </div>
      </div>

      {/* N° d'Ordre Row (Instantly reacts to edits) */}
      {showNumOrdre ? (
        <div className="text-center font-bold text-xs text-slate-800 mt-2.5 py-1 px-4 bg-slate-50 border border-slate-200 rounded-md inline-block w-full">
          N° d'Ordre : <span className="font-mono text-blue-900">{rawNumOrdre}</span>
        </div>
      ) : (
        <div className="text-center text-[10px] text-gray-400 italic mt-2 py-0.5 bg-gray-50/60 rounded border border-dashed border-gray-200">
          (N° d'ordre masqué sur l'impression car vide ou défini à 0)
        </div>
      )}

      {/* Contact Strip / Pied d'en-tête */}
      <div className="mt-3 pt-2 border-t border-gray-200 text-[11px] text-gray-700 space-y-1">
        <div className="text-center font-bold text-gray-900">
          <span>Tél : </span>
          <span className="font-mono text-gray-800">
            {cabinet.phones || "0652 76 89 72 / 0562 24 40 87"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center text-center gap-1 text-[10px] text-gray-600 pt-1">
          <span>
            {[cabinet.address, cabinet.city].filter(Boolean).join(", ") ||
              "Rue Frères KAFI logts 38, 1er étage, El-Harrouch SKIKDA"}
          </span>
          <span dir="rtl" className="font-arabic">
            {[cabinet.addressAr, cabinet.cityAr].filter(Boolean).join(" - ") ||
              "شارع الإخوة كافي عقار 38 الطابق الأول - الحروش سكيكدة"}
          </span>
        </div>
      </div>
    </div>
  );

  // === Form Inputs (plain function, called as {CabinetFormContent()} so inputs keep focus) ===
  const CabinetFormContent = () => (
    <div className="space-y-6">
      {/* 1. Logo du Cabinet */}
      <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 rounded-2xl p-4 border border-gray-200">
        <div className="w-24 h-24 shrink-0 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-2 flex items-center justify-center overflow-hidden shadow-2xs">
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

        <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900">
              Logo officiel du cabinet
            </span>
            {cabinet.logo && (
              <span className="text-2xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Chargé
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Image visible sur l'en-tête de vos ordonnances et bilans (PNG, JPG ou WEBP transparent recommandé).
          </p>
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
            className="px-4 py-2 text-xs font-semibold bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {uploadingLogo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--color-600)]" />
                Téléversement en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 text-[var(--color-600)]" />
                Changer le logo
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Praticien & Spécialité (FR à gauche | AR à droite) */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Identification du Praticien (Bilingue)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            className="md:col-span-2"
            icon={User}
            label="Nom de L'application"
            value={cabinet.title || ""}
            onChange={(e) => handleCabinetChange("title", e.target.value)}
            placeholder="Ex: Docteur ou Professeur"
          />

          {/* Nom du praticien : FR | AR */}
          <Field
            icon={User}
            label="Nom du Praticien (Français)"
            value={cabinet.doctorName || ""}
            onChange={(e) => handleCabinetChange("doctorName", e.target.value)}
            placeholder="Ex: Docteur DIB Amel"
          />
          <Field
            rtl
            icon={User}
            label="اسم و لقب الطبيب (العربية)"
            value={cabinet.doctorNameAr || ""}
            onChange={(e) => handleCabinetChange("doctorNameAr", e.target.value)}
            placeholder="مثال: دكتور ديب أمال"
          />

          {/* Spécialité : FR | AR */}
          <Field
            icon={Stethoscope}
            label="Spécialité médicale (Français)"
            value={cabinet.specialty || ""}
            onChange={(e) => handleCabinetChange("specialty", e.target.value)}
            placeholder="Ex: Chirurgien Dentiste"
          />
          <Field
            rtl
            icon={Stethoscope}
            label="الاختصاص الطبي (العربية)"
            value={cabinet.specialtyAr || ""}
            onChange={(e) => handleCabinetChange("specialtyAr", e.target.value)}
            placeholder="مثال: جراحة و طب الأسنان"
          />
        </div>
      </div>

      {/* 3. Établissement & N° d'Ordre */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          Établissement & Conseil de l'Ordre
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Nom du cabinet : FR | AR */}
          <Field
            icon={Building2}
            label="Nom du cabinet (Français)"
            value={cabinet.cabinetName || ""}
            onChange={(e) => handleCabinetChange("cabinetName", e.target.value)}
            placeholder="Ex: Cabinet Dentaire"
          />
          <Field
            rtl
            icon={Building2}
            label="اسم العيادة (العربية)"
            value={cabinet.cabinetNameAr || ""}
            onChange={(e) => handleCabinetChange("cabinetNameAr", e.target.value)}
            placeholder="مثال: عيادة طب الأسنان"
          />

          {/* N° d'Ordre Field */}
          <div className="md:col-span-2 bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
            <Field
              icon={Hash}
              mono
              label="N° d'Ordre (Ordre des Médecins / Dentistes)"
              value={cabinet.numOrdre || ""}
              onChange={(e) => handleCabinetChange("numOrdre", e.target.value)}
              placeholder="Ex: 8130/23 (laisser vide ou entrer 0 pour masquer)"
              helper="Si ce champ est vide ou défini sur '0', le N° d'Ordre ne s'affichera pas sur vos ordonnances et bilans imprimés."
            />
          </div>
        </div>
      </div>

      {/* 4. Adresse & Contact */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-600" />
          Coordonnées & Localisation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            icon={MapPin}
            label="Adresse (Français)"
            value={cabinet.address || ""}
            onChange={(e) => handleCabinetChange("address", e.target.value)}
            placeholder="Ex: Rue Frères KAFI logts 38, 1er étage"
          />
          <Field
            rtl
            icon={MapPin}
            label="العنوان (العربية)"
            value={cabinet.addressAr || ""}
            onChange={(e) => handleCabinetChange("addressAr", e.target.value)}
            placeholder="مثال: شارع الإخوة كافي عقار 38 الطابق الأول"
          />
          <Field
            icon={MapPin}
            label="Ville / Wilaya (Français)"
            value={cabinet.city || ""}
            onChange={(e) => handleCabinetChange("city", e.target.value)}
            placeholder="Ex: El-Harrouch SKIKDA"
          />
          <Field
            rtl
            icon={MapPin}
            label="المدينة / الولاية (العربية)"
            value={cabinet.cityAr || ""}
            onChange={(e) => handleCabinetChange("cityAr", e.target.value)}
            placeholder="مثال: (بزاز لعلاوي) الحروش - سكيكدة"
          />
          <Field
            mono
            className="md:col-span-2"
            icon={Phone}
            label="Numéros de téléphone (séparés par /)"
            value={cabinet.phones || ""}
            onChange={(e) => handleCabinetChange("phones", e.target.value)}
            placeholder="Ex: 0652 76 89 72 / 0562 24 40 87"
            helper="Séparer les différents numéros par une barre oblique (/)"
          />
        </div>
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
        accept=".cbak,.enc,.json"
        className="hidden"
      />

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[var(--color-600)] rounded-xl shadow-md text-white">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {cabinet.appName || "Paramètres du Cabinet & Application"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                Configuration centralisée de l'en-tête médical, N° d'ordre, thèmes et sauvegardes
              </p>
            </div>
          </div>

          {/* Quick open modal button */}
          {isCabinetTab && (
            <button
              type="button"
              onClick={() => setIsCabinetModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Modifier dans une boîte modale
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Sections des paramètres"
          className="flex gap-1.5 p-1.5 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-x-auto"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active =
              activeTab === id ||
              (id === "clinic" && (activeTab === "identity" || activeTab === "contact"));
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(id)}
                className={`flex-1 min-w-fit px-4 py-2.5 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-500)] ${
                  active
                    ? "bg-[var(--color-600)] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ===================== TAB 1: CABINET & EN-TÊTE DÉDIÉ ===================== */}
        {isCabinetTab && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Section */}
            <Card className="lg:col-span-7 border border-gray-200 shadow-sm bg-white overflow-hidden rounded-2xl">
              <CardContent className="p-6">
                {loadingCabinet ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-600)]" />
                    <span className="ml-3 text-sm text-gray-600 font-medium">
                      Chargement des paramètres du cabinet...
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveCabinet} className="space-y-6">
                    {CabinetFormContent()}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleResetCabinet}
                        className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                        title="Réinitialiser tous les champs aux valeurs par défaut"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Valeurs par défaut
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsCabinetModalOpen(true)}
                          className="px-4 py-2.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Boîte modale
                        </button>
                        <button
                          type="submit"
                          disabled={savingCabinet || loadingCabinet}
                          className="px-6 py-2.5 text-sm font-bold text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
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
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Sticky Live Preview Section */}
            <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[var(--color-600)]" />
                  <span className="text-sm font-bold text-gray-800">
                    Aperçu en direct de l'en-tête d'impression
                  </span>
                </div>
              </div>
              {HeaderPreview}
            </div>
          </div>
        )}

        {/* ===================== TAB 2: APPEARANCE ===================== */}
        {activeTab === "appearance" && (
          <Card className="border border-gray-200 shadow-sm bg-white rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-[var(--color-600)]" />
                Thème et apparence visuelle
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Personnalisez le nom de l'application, la couleur d'accentuation et l'ambiance globale de l'interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Nom de l'application */}
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-xl">
                <Field
                  className="flex-1"
                  icon={Sparkles}
                  label="Nom de l'application"
                  value={cabinet.appName || ""}
                  onChange={(e) => handleCabinetChange("appName", e.target.value)}
                  placeholder="Ex: Cabinet Dentaire"
                  helper="Affiché comme titre de l'application"
                />
                <button
                  type="button"
                  onClick={handleSaveCabinet}
                  disabled={savingCabinet}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-xl transition-all shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {savingCabinet ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Enregistrer
                </button>
              </div>

              {/* Thème */}
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full md:w-80 rounded-xl">
                  <SelectValue placeholder="Sélectionner un thème" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {themes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="font-medium text-sm">{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {/* ===================== TAB 3: BACKUP & RESTORE ===================== */}
        {activeTab === "backup" && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardHeader className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Sauvegarde sécurisée (AES-256-GCM)
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Exportez une sauvegarde complète chiffrée avec la clé secrète configurée dans le fichier .env.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={loadingBackup}
                  className="px-6 py-3 bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  {loadingBackup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chiffrement & Exportation...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Exporter la sauvegarde chiffrée
                    </>
                  )}
                </button>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl">
              <CardHeader className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <KeyRound className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Restaurer une sauvegarde
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Restaurez vos données depuis un fichier sécurisé (.cbak, .enc, .json) avec déchiffrement et validation d'intégrité.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <button
                  type="button"
                  onClick={handleRestoreClick}
                  disabled={loadingRestore}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  {loadingRestore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Déchiffrement & Restauration...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Restaurer une sauvegarde
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* ===================== CABINET INFORMATION MODAL ===================== */}
      <Dialog open={isCabinetModalOpen} onOpenChange={setIsCabinetModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[var(--color-600)]" />
              Informations du Cabinet & En-tête Médical
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Modifiez les informations du praticien, les coordonnées et le N° d'ordre. L'aperçu en direct se met à jour en temps réel.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">{CabinetFormContent()}</div>

          <DialogFooter className="mt-4 pt-3 border-t border-gray-100 gap-2">
            <button
              type="button"
              onClick={() => setIsCabinetModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSaveCabinet}
              disabled={savingCabinet}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-600)] hover:bg-[var(--color-700)] rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              {savingCabinet ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer dans la base de données
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}