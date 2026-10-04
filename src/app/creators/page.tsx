"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
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
import { ErrorDeSubida, uploadLicenseScreenshot, readFileAsDataUrl } from "@/lib/upload";
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
  const t = useTranslations("creators");
  const tSubida = useTranslations("erroresSubida");
  const locale = useLocale();
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
        aplicarTemplate(t.raw(`plantillas.${template.clave}.texto`) as string, {
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
      alert(err instanceof ErrorDeSubida ? tSubida(err.clave, err.datos) : err.message || t("errorScreenshot"));
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, licenseId: string) => {
    if (!confirm(t("confirmarEliminar"))) return;
    try {
      await eliminarEvidencia({ variables: { id: evidenceId } });
      setEvidenceCache((prev) => ({
        ...prev,
        [licenseId]: (prev[licenseId] || []).filter((e) => e._id !== evidenceId),
      }));
    } catch {
      alert(t("errorEliminar"));
    }
  };

  const getCreatorById = (creatorId: string) => creators.find((c) => c._id === creatorId);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-white/50">
            {t("subtitulo")}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLicenseModal(true)}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/5"
          >
            {t("nuevaLicencia")}
          </button>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="rounded-xl bg-marca px-4 py-2 text-sm font-medium text-ng-tinta transition hover:brightness-110"
          >
            {t("nuevoCreator")}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-ng-teal">{creators.length}</p>
          <p className="mt-1 text-sm text-white/50">{t("stats.totales")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-blue-400">
            {creators.filter((c) => c.esPropio).length}
          </p>
          <p className="mt-1 text-sm text-white/50">{t("stats.propios")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
          <p className="text-3xl font-bold text-yellow-400">
            {licenses.filter((l) => l.status === "ACTIVA").length}
          </p>
          <p className="mt-1 text-sm text-white/50">{t("stats.licenciasActivas")}</p>
        </div>
      </div>

      {/* Content */}
      {loadingCreators || loadingLicenses ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ng-teal/20 text-xl">
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
                    {creator.esPropio ? t("propio") : t("externo")}
                  </span>
                </div>

                {/* Licenses */}
                <div className="space-y-2">
                  <p className="text-xs text-white/40">
                    {t("licencias", { n: creatorLicenses.length })}
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
                              <span className="rounded bg-ng-teal/20 px-1.5 py-0.5 text-xs text-ng-teal">
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
                                {t("cargandoEvidencias")}
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
                                              {new Date(ev.createdAt).toLocaleDateString(locale)}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteEvidence(ev._id, lic._id)}
                                            className="text-xs text-red-400 opacity-0 transition group-hover:opacity-100"
                                          >
                                            {t("eliminar")}
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
                                              alt={t("altScreenshot")}
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
                                    {t("sinEvidencias")}
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
                                    {t("agregarMensaje")}
                                  </button>
                                  <button
                                    onClick={() => setShowScreenshotModal(lic._id)}
                                    className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium transition hover:bg-white/20"
                                  >
                                    {t("agregarCaptura")}
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
          <p className="text-lg font-medium text-white/60">{t("vacio.titulo")}</p>
          <p className="mt-1 text-sm text-white/40">
            {t("vacio.detalle")}
          </p>
          <button
            onClick={() => setShowCreatorModal(true)}
            className="mt-4 rounded-xl bg-marca px-6 py-3 font-medium text-ng-tinta transition hover:brightness-110"
          >
            {t("vacio.crear")}
          </button>
        </div>
      )}

      {/* Create Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ng-fondo p-6">
            <h2 className="mb-6 text-xl font-bold">{t("modalCreator.titulo")}</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{t("modalCreator.nombre")}</label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder={t("modalCreator.placeholderNombre")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-ng-azul/50"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("modalCreator.handle")}</label>
                <input
                  type="text"
                  value={creatorHandle}
                  onChange={(e) => setCreatorHandle(e.target.value)}
                  placeholder={t("modalCreator.placeholderHandle")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-ng-azul/50"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCreatorModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                {t("cancelar")}
              </button>
              <button
                onClick={handleCreateCreator}
                disabled={creandoCreator || !creatorName.trim()}
                className="flex-1 rounded-xl bg-marca py-3 font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
              >
                {creandoCreator ? t("creando") : t("crear")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ng-fondo p-6">
            <h2 className="mb-6 text-xl font-bold">{t("modalLicencia.titulo")}</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">{t("modalLicencia.creator")}</label>
                <select
                  value={selectedCreator}
                  onChange={(e) => setSelectedCreator(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-ng-azul/50"
                >
                  <option value="">{t("modalLicencia.seleccionarCreator")}</option>
                  {creators.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">{t("modalLicencia.tipo")}</label>
                <select
                  value={licenseScope}
                  onChange={(e) => setLicenseScope(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-ng-azul/50"
                >
                  <option value="">{t("modalLicencia.seleccionarTipo")}</option>
                  <option value="PROPIO">{t("modalLicencia.PROPIO")}</option>
                  <option value="META_EXCLUSIVO">{t("modalLicencia.META_EXCLUSIVO")}</option>
                  <option value="SOLO_PUBLICACION">{t("modalLicencia.SOLO_PUBLICACION")}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="flex-1 rounded-xl border border-white/10 py-3 font-medium text-white/60 transition hover:bg-white/5"
              >
                {t("cancelar")}
              </button>
              <button
                onClick={handleCreateLicense}
                disabled={creandoLicense || !selectedCreator || !licenseScope.trim()}
                className="flex-1 rounded-xl bg-marca py-3 font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
              >
                {creandoLicense ? t("creando") : t("crear")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ng-fondo p-6">
            <h2 className="mb-4 text-xl font-bold">{t("modalMensaje.titulo")}</h2>
            <p className="mb-4 text-sm text-white/50">
              {t("modalMensaje.para", { nombre: showMessageModal.creator.nombre })}
              {showMessageModal.creator.handle && ` (@${showMessageModal.creator.handle})`}
            </p>

            {/* Template selector */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">{t("modalMensaje.template")}</label>
              <div className="flex flex-wrap gap-2">
                {MESSAGE_TEMPLATES.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleTemplateSelect(pl)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      selectedTemplate?.id === pl.id
                        ? "bg-marca text-ng-tinta"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {t(`plantillas.${pl.clave}.nombre`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Message textarea */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">{t("modalMensaje.mensaje")}</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={8}
                placeholder={t("modalMensaje.placeholder")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-ng-azul/50"
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
                {t("cancelar")}
              </button>
              <button
                onClick={handleCopyMessage}
                disabled={!messageText.trim()}
                className="rounded-xl border border-ng-azul/50 px-4 py-3 font-medium text-ng-teal transition hover:bg-ng-teal/10 disabled:opacity-50"
              >
                {t("modalMensaje.copiar")}
              </button>
              <button
                onClick={handleSaveMessage}
                disabled={agregandoEvidencia || !messageText.trim()}
                className="flex-1 rounded-xl bg-marca py-3 font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
              >
                {agregandoEvidencia ? t("guardando") : t("guardar")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ng-fondo p-6">
            <h2 className="mb-6 text-xl font-bold">{t("modalCaptura.titulo")}</h2>

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
                  alt={t("modalCaptura.altPreview")}
                  className="max-h-64 w-full rounded-xl object-contain"
                />
                <button
                  onClick={() => {
                    setScreenshotFile(null);
                    setScreenshotPreview("");
                  }}
                  className="mt-2 text-sm text-red-400"
                >
                  {t("modalCaptura.quitar")}
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 cursor-pointer rounded-xl border-2 border-dashed border-white/20 p-8 text-center transition hover:border-ng-azul/50"
              >
                <div className="mb-2 text-4xl opacity-50">📷</div>
                <p className="text-sm text-white/50">
                  {t("modalCaptura.elegir")}
                </p>
              </div>
            )}

            {/* Note input */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">{t("modalCaptura.nota")}</label>
              <input
                type="text"
                value={screenshotNota}
                onChange={(e) => setScreenshotNota(e.target.value)}
                placeholder={t("modalCaptura.placeholderNota")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none placeholder:text-white/30 focus:border-ng-azul/50"
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
                {t("cancelar")}
              </button>
              <button
                onClick={handleUploadScreenshot}
                disabled={uploadingScreenshot || agregandoEvidencia || !screenshotFile}
                className="flex-1 rounded-xl bg-marca py-3 font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
              >
                {uploadingScreenshot || agregandoEvidencia ? t("subiendo") : t("subir")}
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
            alt={t("altEvidencia")}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
          />
        </div>
      )}
    </DashboardLayout>
  );
}
