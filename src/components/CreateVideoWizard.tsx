"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { uploadClip, uploadVoiceNote, downloadFromTikTok, getTikTokPreview, TikTokPreview } from "@/lib/upload";
import { INGESTAR, LICENSES, COLA_DE_REVISION } from "@/graphql/operations";
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
  const [step, setStep] = useState<Step>("upload");
  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipPreview, setClipPreview] = useState<string | null>(null);
  const [tiktokUrl, setTiktokUrl] = useState<string>("");
  const [tiktokPreview, setTiktokPreview] = useState<TikTokPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  const [pagina, setPagina] = useState<string>("PRINCIPAL");
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
        setError(err.message || "Error al obtener preview");
        setTiktokPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    // Debounce: wait 500ms after user stops typing
    const timeout = setTimeout(fetchPreview, 500);
    return () => clearTimeout(timeout);
  }, [tiktokUrl]);
  const licenses: License[] = licensesData?.licenses?.filter((l: License) => l.status === "ACTIVA") || [];

  const [ingestar] = useMutation(INGESTAR, {
    refetchQueries: [{ query: COLA_DE_REVISION, variables: { pagina: null } }],
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
      setError("Selecciona un clip y una licencia");
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
        throw new Error("No hay fuente de video");
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
            pagina,
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
      setError(err.message || "Error al procesar");
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
                    ? "bg-[#0FED9D] text-black"
                    : isActive
                    ? "bg-[#0FED9D]/20 text-[#0FED9D] ring-2 ring-[#0FED9D]"
                    : "bg-white/10 text-white/40"
                }`}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`h-0.5 w-8 transition-all ${
                    isComplete ? "bg-[#0FED9D]" : "bg-white/10"
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
                    ? "bg-[#0FED9D] text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                📁 Archivo
              </button>
              <button
                onClick={() => {
                  setInputMode("link");
                  setClipFile(null);
                  setClipPreview(null);
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                  inputMode === "link"
                    ? "bg-[#0FED9D] text-black"
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
                  className="flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/20 bg-white/5 transition hover:border-[#0FED9D]/50 hover:bg-[#0FED9D]/5"
                >
                  <div className="mb-1 text-3xl opacity-50">📁</div>
                  <p className="text-sm font-medium">Arrastra o selecciona video</p>
                  <p className="mt-0.5 text-xs text-white/30">
                    MP4, MOV, WebM • Máx 500MB
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
                    placeholder="https://www.tiktok.com/@usuario/video/..."
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
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
                    <span className="text-xs text-white/50">Obteniendo preview...</span>
                  </div>
                )}

                {/* Preview */}
                {tiktokPreview && !loadingPreview && (
                  <div className="rounded-lg border border-[#0FED9D]/30 bg-black/50 overflow-hidden">
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
                          alt="Preview"
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
                      <p className="text-sm font-medium text-[#0FED9D]">@{tiktokPreview.author}</p>
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
              className="w-full rounded-lg bg-[#0FED9D] py-3 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
            >
              Continuar →
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
              <label className="mb-1.5 block text-xs font-medium text-white/60">Licencia *</label>
              {licenses.length > 0 ? (
                <select
                  value={selectedLicense}
                  onChange={(e) => setSelectedLicense(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#0FED9D]/50"
                >
                  <option value="">Seleccionar licencia</option>
                  {licenses.map((license) => (
                    <option key={license._id} value={license._id}>
                      {license.scope}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-xs text-white/40">No hay licencias activas.</p>
                  <Link
                    href="/creators"
                    className="text-xs text-[#0FED9D] hover:underline"
                  >
                    Crear una →
                  </Link>
                </div>
              )}
            </div>

            {/* Page Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Página</label>
              <div className="grid grid-cols-3 gap-1.5">
                {["PRINCIPAL", "SECUNDARIO", "ENTRETENIMIENTO"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`rounded-lg border py-2 text-xs transition ${
                      pagina === p
                        ? "border-[#0FED9D] bg-[#0FED9D]/10 text-[#0FED9D]"
                        : "border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/60">Tipo</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: "EXPEDIENTE_COMPLETO", label: "Expediente" },
                  { value: "VOZ_SIN_CAMARA", label: "Voz" },
                  { value: "XED", label: "XED" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTipoDeValor(t.value)}
                    className={`rounded-lg border py-2 text-xs transition ${
                      tipoDeValor === t.value
                        ? "border-[#0FED9D] bg-[#0FED9D]/10 text-[#0FED9D]"
                        : "border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 transition hover:bg-white/5"
              >
                ← Atrás
              </button>
              <button
                onClick={handleProcess}
                disabled={!selectedLicense || uploading}
                className="flex-1 rounded-lg bg-[#0FED9D] py-2.5 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                Crear 🚀
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-[#0FED9D]/20 p-3">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0FED9D]/30">
                <span className="text-xl">⚡</span>
              </div>
            </div>
            <div>
              <h2 className="font-bold">Procesando...</h2>
              <p className="mt-0.5 text-xs text-white/50">
                Subiendo archivos
              </p>
            </div>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#0FED9D] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#0FED9D]/20">
              <span className="text-2xl">✓</span>
            </div>
            <div>
              <h2 className="font-bold text-[#0FED9D]">¡Video creado!</h2>
              <p className="mt-0.5 text-xs text-white/50">
                Aparecerá en la cola de revisión
              </p>
            </div>
            <button
              onClick={resetWizard}
              className="rounded-lg border border-white/10 px-6 py-2 text-sm transition hover:bg-white/5"
            >
              Crear otro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
