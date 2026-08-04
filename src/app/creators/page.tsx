"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import {
  CREATORS,
  LICENSES,
  CREAR_CREATOR,
  CREAR_LICENSE,
  EVIDENCIAS_DE_LICENCIA,
  AGREGAR_EVIDENCIA,
  ELIMINAR_EVIDENCIA,
} from "@/graphql/operations";
import { DashboardLayout } from "@/components/DashboardLayout";
import { uploadLicenseScreenshot, readFileAsDataUrl } from "@/lib/upload";
import {
  MESSAGE_TEMPLATES,
  aplicarTemplate,
  MessageTemplate,
} from "@/lib/message-templates";

interface Creator {
  _id: string;
  nombre: string;
  handle?: string;
  esPropio: boolean;
}

interface License {
  _id: string;
  scope: string;
  status: string;
  creatorId: string;
}

interface LicenseEvidence {
  _id: string;
  licenseId: string;
  tipo: "MENSAJE" | "SCREENSHOT";
  contenido?: string;
  storagePath?: string;
  storageUrl?: string;
  nota?: string;
  createdAt: string;
}

export default function CreatorsPage() {
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [creatorName, setCreatorName] = useState("");
  const [creatorHandle, setCreatorHandle] = useState("");
  const [licenseScope, setLicenseScope] = useState("");

  // Evidence state
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);
  const [evidenceCache, setEvidenceCache] = useState<Record<string, LicenseEvidence[]>>({});
  const [showMessageModal, setShowMessageModal] = useState<{ licenseId: string; creator: Creator } | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [messageText, setMessageText] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string>("");
  const [screenshotNota, setScreenshotNota] = useState("");
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: creatorsData, loading: loadingCreators } = useQuery(CREATORS);
  const { data: licensesData, loading: loadingLicenses } = useQuery(LICENSES);

  const creators: Creator[] = creatorsData?.creators ?? [];
  const licenses: License[] = licensesData?.licenses ?? [];

  const [fetchEvidences, { loading: loadingEvidences }] = useLazyQuery(EVIDENCIAS_DE_LICENCIA, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data?.evidenciasDeLicencia && expandedLicense) {
        setEvidenceCache((prev) => ({
          ...prev,
          [expandedLicense]: data.evidenciasDeLicencia,
        }));
      }
    },
  });

  const [crearCreator, { loading: creandoCreator }] = useMutation(CREAR_CREATOR, {
    refetchQueries: [{ query: CREATORS }],
    onCompleted: () => {
      setShowCreatorModal(false);
      setCreatorName("");
      setCreatorHandle("");
    },
  });

  const [crearLicense, { loading: creandoLicense }] = useMutation(CREAR_LICENSE, {
    refetchQueries: [{ query: LICENSES }],
    onCompleted: () => {
      setShowLicenseModal(false);
      setSelectedCreator("");
      setLicenseScope("");
    },
  });

  const [agregarEvidencia, { loading: agregandoEvidencia }] = useMutation(AGREGAR_EVIDENCIA, {
    onCompleted: (data) => {
      if (data?.agregarEvidencia) {
        const licId = data.agregarEvidencia.licenseId;
        setEvidenceCache((prev) => ({
          ...prev,
          [licId]: [data.agregarEvidencia, ...(prev[licId] || [])],
        }));
      }
      setShowMessageModal(null);
      setShowScreenshotModal(null);
      setMessageText("");
      setSelectedTemplate(null);
      setScreenshotFile(null);
      setScreenshotPreview("");
      setScreenshotNota("");
    },
  });

  const [eliminarEvidencia] = useMutation(ELIMINAR_EVIDENCIA);

  const handleCreateCreator = () => {
    if (!creatorName.trim()) return;
    crearCreator({
      variables: {
        input: {
          nombre: creatorName,
          handle: creatorHandle || undefined,
        },
      },
    });
  };

  const handleCreateLicense = () => {
    if (!selectedCreator || !licenseScope.trim()) return;
    crearLicense({
      variables: {
        input: {
          creatorId: selectedCreator,
          scope: licenseScope,
        },
      },
    });
  };

  const getLicensesForCreator = (creatorId: string) => {
    return licenses.filter((l) => l.creatorId === creatorId);
  };

  const toggleLicenseExpand = (licenseId: string) => {
    if (expandedLicense === licenseId) {
      setExpandedLicense(null);
    } else {
      setExpandedLicense(licenseId);
      if (!evidenceCache[licenseId]) {
        fetchEvidences({ variables: { licenseId } });
      }
    }
  };

  const handleTemplateSelect = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    if (showMessageModal) {
      const creator = showMessageModal.creator;
      setMessageText(
        aplicarTemplate(template.texto, {
          nombre: creator.nombre,
          handle: creator.handle,
        })
      );
    }
  };

  const handleSaveMessage = () => {
    if (!showMessageModal || !messageText.trim()) return;
    agregarEvidencia({
      variables: {
        input: {
          licenseId: showMessageModal.licenseId,
          tipo: "MENSAJE",
          contenido: messageText,
        },
      },
    });
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    try {
      const preview = await readFileAsDataUrl(file);
      setScreenshotPreview(preview);
    } catch {
      setScreenshotPreview("");
    }
  };

  const handleUploadScreenshot = async () => {
    if (!showScreenshotModal || !screenshotFile) return;
    setUploadingScreenshot(true);
    try {
      const result = await uploadLicenseScreenshot(screenshotFile);
      await agregarEvidencia({
        variables: {
          input: {
            licenseId: showScreenshotModal,
            tipo: "SCREENSHOT",
            storagePath: result.storagePath,
            nota: screenshotNota || undefined,
          },
        },
      });
    } catch (err: any) {
      alert(err.message || "Error al subir screenshot");
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, licenseId: string) => {
    if (!confirm("¿Eliminar esta evidencia?")) return;
    try {
      await eliminarEvidencia({ variables: { id: evidenceId } });
      setEvidenceCache((prev) => ({
        ...prev,
        [licenseId]: (prev[licenseId] || []).filter((e) => e._id !== evidenceId),
      }));
    } catch {
      alert("Error al eliminar");
    }
  };

  const getCreatorById = (creatorId: string) => creators.find((c) => c._id === creatorId);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creators</h1>
          <p className="mt-1 text-white/50">
            Gestiona los creators y sus licencias
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLicenseModal(true)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
          >
            + Licencia
          </button>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="rounded-xl bg-[#0FED9D] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90"
          >
            + Creator
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-[#0FED9D]">{creators.length}</p>
          <p className="mt-1 text-sm text-white/50">Creators totales</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-blue-400">
            {creators.filter((c) => c.esPropio).length}
          </p>
          <p className="mt-1 text-sm text-white/50">Propios</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-yellow-400">
            {licenses.filter((l) => l.status === "ACTIVA").length}
          </p>
          <p className="mt-1 text-sm text-white/50">Licencias activas</p>
        </div>
      </div>

      {/* Content */}
      {loadingCreators || loadingLicenses ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        </div>
      ) : creators.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {creators.map((creator) => {
            const creatorLicenses = getLicensesForCreator(creator._id);
            return (
              <div
                key={creator._id}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0FED9D]/20 text-xl">
                      👤
                    </div>
                    <div>
                      <p className="font-medium">{creator.nombre}</p>
                      {creator.handle && (
                        <p className="text-sm text-white/40">@{creator.handle}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      creator.esPropio
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {creator.esPropio ? "Propio" : "Externo"}
                  </span>
                </div>

                {/* Licenses */}
                <div className="space-y-2">
                  <p className="text-xs text-white/40">
                    {creatorLicenses.length} licencia{creatorLicenses.length !== 1 ? "s" : ""}
                  </p>
                  {creatorLicenses.map((lic) => {
                    const isExpanded = expandedLicense === lic._id;
                    const evidences = evidenceCache[lic._id] || [];
                    return (
                      <div key={lic._id} className="rounded-lg bg-black/30">
                        <div
                          className="flex cursor-pointer items-center justify-between px-3 py-2"
                          onClick={() => toggleLicenseExpand(lic._id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{lic.scope}</span>
                            {evidences.length > 0 && (
                              <span className="rounded bg-[#0FED9D]/20 px-1.5 py-0.5 text-xs text-[#0FED9D]">
                                {evidences.length}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                lic.status === "ACTIVA"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {lic.status}
                            </span>
                            <span className="text-white/40">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Expanded Evidence Section */}
                        {isExpanded && (
                          <div className="border-t border-white/5 p-3">
                            {loadingEvidences ? (
                              <div className="py-4 text-center text-sm text-white/40">
                                Cargando evidencias...
                              </div>
                            ) : (
                              <>
                                {/* Evidence List */}
                                {evidences.length > 0 ? (
                                  <div className="mb-3 space-y-2">
                                    {evidences.map((ev) => (
                                      <div
                                        key={ev._id}
                                        className="group rounded-lg bg-white/5 p-3"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                              {ev.tipo === "MENSAJE" ? "📝" : "🖼️"}
                                            </span>
                                            <span className="text-xs text-white/40">
                                              {new Date(ev.createdAt).toLocaleDateString()}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteEvidence(ev._id, lic._id)}
                                            className="text-xs text-red-400 opacity-0 transition group-hover:opacity-100"
                                          >
                                            Eliminar
                                          </button>
                                        </div>
                                        {ev.tipo === "MENSAJE" && ev.contenido && (
                                          <p className="mt-2 line-clamp-3 text-sm text-white/70">
                                            {ev.contenido}
                                          </p>
                                        )}
                                        {ev.tipo === "SCREENSHOT" && ev.storageUrl && (
                                          <div className="mt-2">
                                            <img
                                              src={ev.storageUrl}
                                              alt="Screenshot"
                                              className="max-h-32 cursor-pointer rounded-lg object-cover"
                                              onClick={() => setShowImageViewer(ev.storageUrl!)}
                                            />
                                            {ev.nota && (
                                              <p className="mt-1 text-xs text-white/50">
                                                {ev.nota}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mb-3 text-center text-sm text-white/40">
                                    Sin evidencias
                                  </p>
                                )}

                                {/* Add Evidence Buttons */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() =>
                                      setShowMessageModal({ licenseId: lic._id, creator })
                                    }
                                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/20"
                                  >
                                    + Mensaje
                                  </button>
                                  <button
                                    onClick={() => setShowScreenshotModal(lic._id)}
                                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/20"
                                  >
                                    + Captura
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="mb-4 text-5xl opacity-30">👤</div>
          <p className="text-lg font-medium text-white/60">No hay creators</p>
          <p className="mt-1 text-sm text-white/40">
            Crea tu primer creator para empezar
          </p>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="mt-4 rounded-xl bg-[#0FED9D] px-6 py-3 font-medium text-black transition hover:bg-[#0FED9D]/90"
          >
            Crear Creator
          </button>
        </div>
      )}

      {/* Create Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold">Nuevo Creator</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Nombre *</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="Nombre del creator"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Handle</label>
                <input
                  type="text"
                  value={creatorHandle}
                  onChange={(e) => setCreatorHandle(e.target.value)}
                  placeholder="@usuario (opcional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreatorModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCreator}
                disabled={creandoCreator || !creatorName.trim()}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {creandoCreator ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold">Nueva Licencia</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Creator *</label>
                <select
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#0FED9D]/50"
                >
                  <option value="">Seleccionar creator</option>
                  {creators.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Tipo de licencia *</label>
                <select
                  value={licenseScope}
                  onChange={(e) => setLicenseScope(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[#0FED9D]/50"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="PROPIO">Propio - Material nuestro</option>
                  <option value="META_EXCLUSIVO">Meta Exclusivo - Solo Facebook/Instagram</option>
                  <option value="SOLO_PUBLICACION">Solo Publicación - Uso único</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLicense}
                disabled={creandoLicense || !selectedCreator || !licenseScope.trim()}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {creandoLicense ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-4 text-xl font-bold">Agregar Mensaje</h2>
            <p className="mb-4 text-sm text-white/50">
              Para: {showMessageModal.creator.nombre}
              {showMessageModal.creator.handle && ` (@${showMessageModal.creator.handle})`}
            </p>

            {/* Template selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Template</label>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      selectedTemplate?.id === t.id
                        ? "bg-[#0FED9D] text-black"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Mensaje</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={8}
                placeholder="Escribe o selecciona un template..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMessageModal(null);
                  setMessageText("");
                  setSelectedTemplate(null);
                }}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyMessage}
                disabled={!messageText.trim()}
                className="rounded-xl border border-[#0FED9D]/50 px-4 py-3 font-medium text-[#0FED9D] transition hover:bg-[#0FED9D]/10 disabled:opacity-50"
              >
                Copiar
              </button>
              <button
                onClick={handleSaveMessage}
                disabled={agregandoEvidencia || !messageText.trim()}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {agregandoEvidencia ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold">Subir Captura</h2>

            {/* File input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {screenshotPreview ? (
              <div className="mb-4">
                <img
                  src={screenshotPreview}
                  alt="Preview"
                  className="max-h-64 w-full rounded-xl object-contain"
                />
                <button
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview("");
                  }}
                  className="mt-2 text-sm text-red-400"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 cursor-pointer rounded-xl border-2 border-dashed border-white/20 p-8 text-center transition hover:border-[#0FED9D]/50"
              >
                <div className="mb-2 text-4xl opacity-50">📷</div>
                <p className="text-sm text-white/50">
                  Click para seleccionar imagen
                </p>
              </div>
            )}

            {/* Note input */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Nota (opcional)</label>
              <input
                type="text"
                value={screenshotNota}
                onChange={(e) => setScreenshotNota(e.target.value)}
                placeholder="Ej: Confirmación por DM"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowScreenshotModal(null);
                  setScreenshotFile(null);
                  setScreenshotPreview("");
                  setScreenshotNota("");
                }}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={handleUploadScreenshot}
                disabled={uploadingScreenshot || agregandoEvidencia || !screenshotFile}
                className="flex-1 rounded-xl bg-[#0FED9D] py-3 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {uploadingScreenshot || agregandoEvidencia ? "Subiendo..." : "Subir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowImageViewer(null)}
        >
          <img
            src={showImageViewer}
            alt="Evidence"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      )}
    </DashboardLayout>
  );
}
