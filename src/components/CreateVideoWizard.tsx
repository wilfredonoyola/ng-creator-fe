"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ErrorDeSubida, uploadClip, uploadVoiceNote, downloadFromTikTok, getTikTokPreview, TikTokPreview } from "@/lib/upload";
import { INGESTAR, LICENSES, COLA_DE_REVISION } from "@/graphql/operations";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { VoiceRecorder } from "./VoiceRecorder";

type Step = "upload" | "config" | "processing" | "done";
type InputMode = "file" | "link";

interface License {
  _id: string;
  scope: string;
  status: string;
  creatorId: string;
}

export function CreateVideoWizard({ onComplete }: { onComplete?: () => void }) {
  const t = useTranslations("montajeWizard");
  const tSubida = useTranslations("erroresSubida");
  const [step, setStep] = useState<Step>("upload");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipPreview, setClipPreview] = useState<string | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [tiktokPreview, setTiktokPreview] = useState<TikTokPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  // La pagina NO se elige aca: sale del espacio de trabajo activo. Elegirla
  // suelta permitiria crear un expediente en una pagina distinta a la que estas
  // viendo, que es justo la confusion que el switch de contexto evita.
  const { activa: marcaActiva } = useMarcaActiva();
  const [tipoDeValor, setTipoDeValor] = useState<string>("EXPEDIENTE_COMPLETO");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clipInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const hasClipSource = inputMode === "file" ? !!clipFile : !!tiktokPreview;

  const { data: licensesData } = useQuery(LICENSES);

  // Fetch TikTok preview when URL changes
  useEffect(() => {
    if (!tiktokUrl || !tiktokUrl.includes("tiktok.com")) {
      setTiktokPreview(null);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setError(null);
      try {
        const preview = await getTikTokPreview(tiktokUrl);
        setTiktokPreview(preview);
      } catch (err: any) {
        setError(err instanceof ErrorDeSubida ? tSubida(err.clave, err.datos) : err.message || t("errores.preview"));
        setTiktokPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    // Debounce: wait 500ms after user stops typing
    const timeout = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timeout);
  }, [tiktokUrl, t, tSubida]);
  const licenses: License[] = licensesData?.licenses?.filter((l: License) => l.status === "ACTIVA") || [];

  const [ingestar] = useMutation(INGESTAR, {
    refetchQueries: [{ query: COLA_DE_REVISION, variables: { marcaId: null } }],
  });

  const handleClipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClipFile(file);
    setClipPreview(URL.createObjectURL(file));
    setError(null);
  };


  const handleProcess = async () => {
    if (!hasClipSource || !selectedLicense) {
      setError(t("errores.faltaClip"));
      return;
    }
    // Sin pagina activa no hay a que espacio de trabajo asignar el expediente.
    if (!marcaActiva) {
      setError(t("errores.sinPagina"));
      return;
    }

    setUploading(true);
    setStep("processing");
    setError(null);

    try {
      // Upload or download clip
      setProgress(10);
      let clipResult;
      if (inputMode === "file" && clipFile) {
        setProgress(20);
        clipResult = await uploadClip(clipFile);
      } else if (inputMode === "link" && tiktokUrl) {
        setProgress(20);
        clipResult = await downloadFromTikTok(tiktokUrl);
      } else {
        throw new Error(t("errores.sinFuente"));
      }

      // Upload voice note if exists
      let voicePath: string | undefined;
      if (voiceBlob) {
        setProgress(50);
        // Convert Blob to File for upload
        const voiceFile = new File([voiceBlob], `voice-${Date.now()}.webm`, {
          type: voiceBlob.type,
        });
        const voiceResult = await uploadVoiceNote(voiceFile);
        voicePath = voiceResult.storagePath;
      }

      // Create expediente
      setProgress(80);
      await ingestar({
        variables: {
          input: {
            licenseId: selectedLicense,
            sha256: `sha256-${Date.now()}`, // TODO: calcular SHA256 real
            clipStoragePath: clipResult.storagePath,
            notaVozPath: voicePath,
            marcaId: marcaActiva!._id,
            tipoDeValor,
          },
        },
      });

      setProgress(100);
      setStep("done");

      // Reset after delay
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    } catch (err: any) {
      setError(err instanceof ErrorDeSubida ? tSubida(err.clave, err.datos) : err.message || t("errores.procesar"));
      setStep("config");
    } finally {
      setUploading(false);
    }
  };

  const resetWizard = () => {
    setStep("upload");
    setInputMode("file");
    setClipFile(null);
    setClipPreview(null);
    setTiktokUrl("");
    setTiktokPreview(null);
    setVoiceBlob(null);
    setSelectedLicense("");
    setProgress(0);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress Steps */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {["upload", "config", "processing", "done"].map((s, i) => {
          const steps = ["upload", "config", "processing", "done"];
          const currentIndex = steps.indexOf(step);
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all ${
                  isComplete
                    ? "bg-marca text-ng-tinta"
                    : isActive
                    ? "bg-ng-teal/20 text-ng-teal ring-2 ring-ng-azul"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`h-0.5 w-8 transition-all ${
                    isComplete ? "bg-marca" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-5">
        {step === "upload" && (
          <div className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-1 rounded-lg bg-white/5 p-0.5">
              <button
                onClick={() => {
                  setInputMode("file");
                  setTiktokUrl("");
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  inputMode === "file"
                    ? "bg-marca text-ng-tinta"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {t("modoArchivo")}
              </button>
              <button
                onClick={() => {
                  setInputMode("link");
                  setClipFile(null);
                  setClipPreview(null);
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  inputMode === "link"
                    ? "bg-marca text-ng-tinta"
                    : "text-white/60 hover:text-white"
                }`}
              >
                🔗 TikTok
              </button>
            </div>

            <input
              ref={clipInputRef}
              type="file"
              accept="video/*"
              onChange={handleClipSelect}
              className="hidden"
            />

            {inputMode === "file" ? (
              // File upload mode
              clipPreview ? (
                <div className="relative overflow-hidden rounded-lg">
                  <video
                    ref={videoPreviewRef}
                    src={clipPreview}
                    controls
                    className="max-h-48 w-full rounded-lg object-contain bg-black"
                  />
                  <button
                    onClick={() => {
                      setClipFile(null);
                      setClipPreview(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-sm text-white hover:bg-black"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => clipInputRef.current?.click()}
                  className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 transition hover:border-ng-azul/50 hover:bg-ng-teal/5"
                >
                  <div className="mb-1 text-3xl opacity-50">📁</div>
                  <p className="text-sm font-medium">{t("arrastra")}</p>
                  <p className="mt-0.5 text-xs text-white/30">
                    {t("formatos")}
                  </p>
                </button>
              )
            ) : (
              // TikTok link mode
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-lg">🔗</span>
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder={t("placeholderTiktok")}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
                  />
                  {tiktokUrl && (
                    <button
                      onClick={() => {
                        setTiktokUrl("");
                        setTiktokPreview(null);
                      }}
                      className="text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Loading state */}
                {loadingPreview && (
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-6">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
                    <span className="text-xs text-white/50">{t("obteniendoPreview")}</span>
                  </div>
                )}

                {/* Preview */}
                {tiktokPreview && !loadingPreview && (
                  <div className="rounded-lg border border-ng-azul/30 bg-black/50 overflow-hidden">
                    {/* Video player or thumbnail */}
                    {tiktokPreview.videoUrl ? (
                      <video
                        ref={videoPreviewRef}
                        src={tiktokPreview.videoUrl}
                        controls
                        className="w-full max-h-64 bg-black"
                        poster={tiktokPreview.thumbnail}
                      />
                    ) : (
                      <div className="relative">
                        <img
                          src={tiktokPreview.thumbnail}
                          alt={t("altPreview")}
                          className="w-full max-h-48 object-contain bg-black"
                        />
                        {tiktokPreview.duration > 0 && (
                          <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs">
                            {Math.floor(tiktokPreview.duration / 60)}:{String(tiktokPreview.duration % 60).padStart(2, "0")}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Info */}
                    <div className="p-3">
                      <p className="text-sm font-medium text-ng-teal">@{tiktokPreview.author}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-white/60">{tiktokPreview.title}</p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {error && inputMode === "link" && (
                  <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Voice Note Recorder */}
            <VoiceRecorder
              hasRecording={!!voiceBlob}
              onRecordingComplete={(blob) => setVoiceBlob(blob)}
              onClear={() => setVoiceBlob(null)}
              videoRef={videoPreviewRef}
            />

            <button
              onClick={() => setStep("config")}
              disabled={!hasClipSource}
              className="w-full rounded-lg bg-marca py-3 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
            >
              {t("continuar")}
            </button>
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-400">
                {error}
              </div>
            )}

            {/* License Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">{t("licencia")}</label>
              {licenses.length > 0 ? (
                <select
                  value={selectedLicense}
                  onChange={(e) => setSelectedLicense(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-ng-azul/50"
                >
                  <option value="">{t("seleccionarLicencia")}</option>
                  {licenses.map((license) => (
                    <option key={license._id} value={license._id}>
                      {license.scope}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-xs text-white/40">{t("sinLicencias")}</p>
                  <Link
                    href="/creators"
                    className="text-xs text-ng-teal hover:underline"
                  >
                    {t("crearUna")}
                  </Link>
                </div>
              )}
            </div>

            {/* Pagina de destino: viene del espacio de trabajo, no se elige */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">
                {t("pagina")}
              </label>
              {marcaActiva ? (
                <div
                  style={{ borderLeftColor: colorDeMarca(marcaActiva) }}
                  className="flex items-center gap-2 rounded-lg border border-l-4 border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {marcaActiva.nombre}
                    </span>
                    <span className="block text-[10px] text-white/40">
                      {t("espacioActivo")}
                    </span>
                  </span>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-xs font-medium text-amber-400">
                    {t("sinPaginaTitulo")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/50">
                    {t("sinPaginaDetalle")}
                  </p>
                </div>
              )}
            </div>

            {/* Type Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">{t("tipo")}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["EXPEDIENTE_COMPLETO", "VOZ_SIN_CAMARA", "XED"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setTipoDeValor(tipo)}
                    className={`rounded-lg border py-2 text-xs transition ${
                      tipoDeValor === tipo
                        ? "border-ng-azul bg-ng-teal/10 text-ng-teal"
                        : "border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {t(`tipos.${tipo}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 transition hover:bg-white/5"
              >
                {t("atras")}
              </button>
              <button
                onClick={handleProcess}
                disabled={!selectedLicense || uploading || !marcaActiva}
                title={
                  !marcaActiva
                    ? t("sinPaginaTitle")
                    : undefined
                }
                className="flex-1 rounded-lg bg-marca py-2.5 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-50"
              >
                {t("crear")}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-ng-teal/20 p-3">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-ng-teal/30">
                <span className="text-xl">⚡</span>
              </div>
            </div>
            <div>
              <h2 className="font-bold">{t("procesando")}</h2>
              <p className="mt-0.5 text-xs text-white/50">
                {t("subiendoArchivos")}
              </p>
            </div>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-marca transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ng-teal/20">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <h2 className="font-bold text-ng-teal">{t("creado")}</h2>
              <p className="mt-0.5 text-xs text-white/50">
                {t("enCola")}
              </p>
            </div>
            <button
              onClick={resetWizard}
              className="rounded-lg border border-white/10 px-6 py-2 text-sm transition hover:bg-white/5"
            >
              {t("crearOtro")}

            </button>
          </div>
        )}
      </div>
    </div>
  );
}
