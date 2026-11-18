"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Plus,
  Trash2,
  Eye,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

function isImageFileName(filename) {
  if (!filename) return false;
  const lower = String(filename).toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".bmp")
  );
}

function formatFileUrl(filename) {
  if (!filename) return "";
  if (
    filename.startsWith("http://") ||
    filename.startsWith("https://") ||
    filename.startsWith("data:")
  ) {
    return filename;
  }
  const clean = filename.startsWith("/") ? filename : `/uploads/${filename}`;
  return clean;
}

export default function Analyses({
  patientID,
  ShowAddDialogNewAnalyse,
  setShowAddDialogNewAnalyse,
  dateFilter,
}) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  // Preview modal for images
  const [previewFile, setPreviewFile] = useState(null);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [formData, setFormData] = useState({
    consultationId: "",
    type: "",
    description: "",
    fichier: "",
  });

  const filteredFiles = useMemo(() => {
    if (!dateFilter) return files;
    return files.filter((file) => isSameDate(file.createdAt, dateFilter));
  }, [files, dateFilter]);

  // ✅ Fetch files (filtered by patient)
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const [radiosRes, bilansRes] = await Promise.all([
        fetch("/api/radio"),
        fetch("/api/bilanfile"),
      ]);

      const [radios, bilans] = await Promise.all([
        radiosRes.json(),
        bilansRes.json(),
      ]);

      // Filter only the patient’s files
      const filteredRadios = Array.isArray(radios)
        ? radios.filter((r) => r.patient && r.patient.id === Number(patientID))
        : [];
      const filteredBilans = Array.isArray(bilans)
        ? bilans.filter((b) => b.patient && b.patient.id === Number(patientID))
        : [];

      const combined = [
        ...filteredRadios.map((r) => ({
          id: r.id,
          name: r.description || "Radio",
          date: new Date(r.createdAt).toLocaleDateString("fr-FR"),
          createdAt: r.createdAt,
          type: "Radio",
          fichier: r.fichier,
        })),
        ...filteredBilans.map((b) => ({
          id: b.id,
          name: b.description || "Bilan",
          date: new Date(b.createdAt).toLocaleDateString("fr-FR"),
          createdAt: b.createdAt,
          type: "Bilan",
          fichier: b.fichier,
        })),
      ];

      combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFiles(combined);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientID) fetchFiles();
  }, [patientID]);

  // ✅ Open or preview file
  const handleViewFile = (file) => {
    if (!file || !file.fichier) return;

    if (isImageFileName(file.fichier)) {
      setPreviewFile(file);
    } else {
      openFile(file.fichier);
    }
  };

  // ✅ Open file in native desktop app or new browser tab
  const openFile = async (fileName) => {
    if (!fileName) return;

    if (typeof window !== "undefined" && window?.electron?.openFile) {
      try {
        const res = await window.electron.openFile(fileName);
        if (res && res.success === false) {
          console.warn("[Analyses] Native openFile error, opening in browser:", res.error);
          window.open(formatFileUrl(fileName), "_blank");
        }
      } catch (err) {
        console.error("[Analyses] Electron openFile failed:", err);
        window.open(formatFileUrl(fileName), "_blank");
      }
    } else if (typeof window !== "undefined") {
      window.open(formatFileUrl(fileName), "_blank");
    }
  };

  // ✅ Handle upload
  const handleFileChange = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setUploadedFileName(file.name);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors du téléversement");
      }

      const data = await response.json();
      console.log("File uploaded successfully:", data);

      // Save the server URL/path in formData
      setFormData((prev) => ({
        ...prev,
        fichier: data.url || data.filename,
        description: prev.description || file.name.replace(/\.[^/.]+$/, ""),
      }));
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError(error.message || "Échec du téléversement du fichier.");
    } finally {
      setUploading(false);
    }
  };

  // ✅ Add new file
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fichier) {
      setUploadError("Veuillez sélectionner un fichier avant d'enregistrer.");
      return;
    }

    try {
      const endpoint =
        formData.type.toLowerCase() === "radio"
          ? "/api/radio"
          : "/api/bilanfile";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          patientId: Number(patientID),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur lors de l'ajout");
      }

      setShowAddDialogNewAnalyse(false);
      setFormData({
        consultationId: null,
        type: "",
        description: "",
        fichier: "",
      });
      setUploadedFileName("");
      setUploadError("");
      await fetchFiles();
    } catch (err) {
      console.error("Erreur lors de l’ajout:", err);
      setUploadError(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  // ✅ Delete confirmation
  const confirmDelete = (file) => {
    setFileToDelete(file);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      const endpoint =
        fileToDelete.type === "Radio" ? "/api/radio?id=" : "/api/bilanfile?id=";
      const res = await fetch(endpoint + fileToDelete.id, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur de suppression");
      }
      await fetchFiles();
    } catch (err) {
      console.error("Erreur de suppression:", err);
    } finally {
      setShowDeleteDialog(false);
      setFileToDelete(null);
    }
  };

  return (
    <div className="p-5">
      {/* Content Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[var(--color-100)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-600)] text-white">
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  Nom / Description
                </th>
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-4 font-semibold text-sm uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 font-semibold text-sm uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`analyse-skel-${idx}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 w-48 bg-[var(--color-200)]/60 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 w-16 bg-[var(--color-200)]/60 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 w-24 bg-[var(--color-200)]/60 rounded" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 w-16 mx-auto bg-[var(--color-200)]/60 rounded-full" />
                    </td>
                  </tr>
                ))
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    {dateFilter
                      ? "Aucun document ou analyse trouvé pour cette date."
                      : "Aucun document ou analyse trouvé pour ce patient."}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file, index) => {
                  const isImg = isImageFileName(file.fichier);
                  return (
                    <tr
                      key={file.id}
                      className={`cursor-pointer transition-colors hover:bg-[var(--color-50)] ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                      }`}
                      onClick={() => handleViewFile(file)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isImg ? (
                            <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            file.type === "Radio"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {file.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                          <Calendar size={16} className="text-[var(--color-500)]" />
                          {file.date}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewFile(file);
                            }}
                            className="group h-8 px-2.5 inline-flex items-center justify-center gap-1.5
                              rounded-lg border border-blue-200 bg-blue-50/60 text-blue-600
                              hover:bg-blue-100 hover:border-blue-300
                              shadow-sm transition-all duration-200 text-xs font-medium"
                            title={isImg ? "Aperçu de l'image" : "Ouvrir le document"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {isImg ? "Aperçu" : "Ouvrir"}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(file);
                            }}
                            className="group h-8 w-8 inline-flex items-center justify-center
                              rounded-lg border border-red-200 bg-red-50/60 text-red-500
                              hover:bg-red-100 hover:border-red-300 hover:text-red-600
                              shadow-sm transition-all duration-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-200" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Add Dialog */}
      <Dialog
        open={ShowAddDialogNewAnalyse}
        onOpenChange={(val) => {
          setShowAddDialogNewAnalyse(val);
          if (!val) {
            setUploadError("");
            setUploadedFileName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-700)] text-lg font-bold">
              Ajouter une analyse / document
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium">Type (Radio / Bilan)</Label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
                className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-500)]"
              >
                <option value="">Sélectionner le type</option>
                <option value="Radio">Radio (Cliché, Panoramique, etc.)</option>
                <option value="Bilan">Bilan (Analyse de laboratoire, PDF)</option>
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Ex: Radio panoramique pré-op, Bilan NFS..."
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Sélectionner le fichier</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChange(file);
                }}
                className="w-full mt-1 border border-gray-300 rounded-md p-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[var(--color-50)] file:text-[var(--color-700)] hover:file:bg-[var(--color-100)]"
              />

              {uploading && (
                <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Téléversement du fichier en cours...
                </div>
              )}

              {uploadedFileName && !uploading && formData.fichier && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fichier prêt : {uploadedFileName}</span>
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {uploadError}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => setShowAddDialogNewAnalyse(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={uploading || !formData.fichier || !formData.type}
                className="bg-[var(--color-600)] hover:bg-[var(--color-700)] text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ✅ In-App Image Preview Modal */}
      <Dialog
        open={Boolean(previewFile)}
        onOpenChange={(val) => !val && setPreviewFile(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center justify-between">
              <span>{previewFile?.name || "Aperçu de l'image"}</span>
              <span className="text-xs font-normal text-gray-500 mr-6">
                {previewFile?.date}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 my-3 overflow-auto flex items-center justify-center bg-gray-950/5 rounded-xl border border-gray-200 p-2 min-h-[300px]">
            {previewFile?.fichier && (
              <img
                src={formatFileUrl(previewFile.fichier)}
                alt={previewFile.name}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  console.error("Image loading failed:", previewFile.fichier);
                  e.target.alt = "Image non trouvée ou inaccessible sur le serveur.";
                }}
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 truncate max-w-[300px]">
              {previewFile?.fichier}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openFile(previewFile?.fichier)}
                className="flex items-center gap-1.5 text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir en taille réelle
              </Button>
              <Button
                size="sm"
                onClick={() => setPreviewFile(null)}
                className="bg-gray-800 hover:bg-gray-900 text-white text-xs"
              >
                Fermer
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[var(--color-700)]">
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-sm mt-1">
            Êtes-vous sûr de vouloir supprimer{" "}
            <span className="font-semibold text-gray-800">
              {fileToDelete?.name}
            </span>{" "}
            ? Cette action est irréversible.
          </p>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
