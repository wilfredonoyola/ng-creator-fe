"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client";
import Link from "next/link";
import { uploadClip, uploadVoiceNote, downloadFromTikTok, getTikTokPreview, TikTokPreview } from "@/lib/upload";
import { INGESTAR, LICENSES, COLA_DE_REVISION } from "@/graphql/operations";

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
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  const [pagina, setPagina] = useState<string>("PRINCIPAL");
  const [tipoDeValor, setTipoDeValor] = useState<string>("EXPEDIENTE_COMPLETO");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clipInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

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

  const handleVoiceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoiceFile(file);
      setError(null);
    }
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
      if (voiceFile) {
        setProgress(50);
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
    setVoiceFile(null);
    setSelectedLicense("");
    setProgress(0);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-center gap-4">
        {["upload", "config", "processing", "done"].map((s, i) => {
          const steps = ["upload", "config", "processing", "done"];
          const currentIndex = steps.indexOf(step);
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex;
          return (
            <div key={s} className="flex items-center gap-4">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all ${
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
                  className={`h-0.5 w-12 transition-all ${
                    isComplete ? "bg-[#0FED9D]" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8">
        {step === "upload" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">Sube tu clip</h2>
              <p className="mt-1 text-sm text-white/50">
                Selecciona el video que quieres convertir en contenido
              </p>
            </div>

            {/* Mode Selection */}
            <div className="flex gap-2 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => {
                  setInputMode("file");
                  setTiktokUrl("");
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  inputMode === "file"
                    ? "bg-[#0FED9D] text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                📁 Subir archivo
              </button>
              <button
                onClick={() => {
                  setInputMode("link");
                  setClipFile(null);
                  setClipPreview(null);
                }}
                className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition ${
                  inputMode === "link"
                    ? "bg-[#0FED9D] text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                🔗 Link de TikTok
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
                <div className="relative overflow-hidden rounded-xl">
                  <video
                    src={clipPreview}
                    controls
                    className="aspect-video w-full rounded-xl object-contain bg-black"
                  />
                  <button
                    onClick={() => {
                      setClipFile(null);
                      setClipPreview(null);
                    }}
                    className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => clipInputRef.current?.click()}
                  className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 transition hover:border-[#0FED9D]/50 hover:bg-[#0FED9D]/5"
                >
                  <div className="mb-3 text-5xl opacity-50">📁</div>
                  <p className="font-medium">Arrastra tu video aquí</p>
                  <p className="mt-1 text-sm text-white/40">
                    o haz clic para seleccionar
                  </p>
                  <p className="mt-3 text-xs text-white/30">
                    MP4, MOV, WebM • Máx 500MB
                  </p>
                </button>
              )
            ) : (
              // TikTok link mode
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <span className="text-2xl">🔗</span>
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
                  <div className="flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 p-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
                    <span className="text-sm text-white/50">Obteniendo preview...</span>
                  </div>
                )}

                {/* Preview */}
                {tiktokPreview && !loadingPreview && (
                  <div className="overflow-hidden rounded-xl border border-[#0FED9D]/30 bg-black">
                    <div className="relative flex items-center justify-center bg-black">
                      <img
                        src={tiktokPreview.thumbnail}
                        alt="Preview"
                        className="max-h-[400px] w-auto max-w-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                          <span className="text-4xl">▶</span>
                        </div>
                      </div>
                      {tiktokPreview.duration > 0 && (
                        <div className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-xs">
                          {Math.floor(tiktokPreview.duration / 60)}:{String(tiktokPreview.duration % 60).padStart(2, "0")}
                        </div>
                      )}
                    </div>
                    <div className="border-t border-white/10 p-4">
                      <p className="font-medium text-[#0FED9D]">@{tiktokPreview.author}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-white/70">{tiktokPreview.title}</p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!tiktokUrl && !loadingPreview && (
                  <p className="text-center text-xs text-white/40">
                    Pega el link del video de TikTok para ver el preview
                  </p>
                )}

                {/* Error state */}
                {error && inputMode === "link" && (
                  <div className="rounded-xl bg-red-500/10 p-3 text-center text-sm text-red-400">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Voice Note (Optional) */}
            <div>
              <label className="mb-2 block text-sm text-white/60">
                Nota de voz (opcional)
              </label>
              <input
                ref={voiceInputRef}
                type="file"
                accept="audio/*"
                onChange={handleVoiceSelect}
                className="hidden"
              />
              {voiceFile ? (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="text-xl">🎙️</span>
                  <span className="flex-1 truncate text-sm">{voiceFile.name}</span>
                  <button
                    onClick={() => setVoiceFile(null)}
                    className="text-white/40 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => voiceInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-white/50 transition hover:bg-white/10"
                >
                  <span>🎙️</span>
                  Agregar nota de voz
                </button>
              )}
            </div>

            <button
              onClick={() => setStep("config")}
              disabled={!hasClipSource}
              className="w-full rounded-xl bg-[#0FED9D] py-4 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}

        {step === "config" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold">Configura tu video</h2>
              <p className="mt-1 text-sm text-white/50">
                Selecciona la licencia y el tipo de contenido
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 p-4 text-center text-sm text-red-400">
                {error}
              </div>
            )}

            {/* License Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Licencia *</label>
              {licenses.length > 0 ? (
                <div className="grid gap-2">
                  {licenses.map((license) => (
                    <button
                      key={license._id}
                      onClick={() => setSelectedLicense(license._id)}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                        selectedLicense === license._id
                          ? "border-[#0FED9D] bg-[#0FED9D]/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded-full border-2 ${
                          selectedLicense === license._id
                            ? "border-[#0FED9D] bg-[#0FED9D]"
                            : "border-white/30"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{license.scope}</p>
                        <p className="text-xs text-white/40">ID: {license.creatorId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                  <p className="text-sm text-white/40">No hay licencias activas.</p>
                  <Link
                    href="/creators"
                    className="mt-2 inline-block text-sm text-[#0FED9D] hover:underline"
                  >
                    Ir a Creators para crear una →
                  </Link>
                </div>
              )}
            </div>

            {/* Page Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Página</label>
              <div className="grid grid-cols-3 gap-2">
                {["PRINCIPAL", "SECUNDARIO", "ENTRETENIMIENTO"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPagina(p)}
                    className={`rounded-xl border py-3 text-sm transition ${
                      pagina === p
                        ? "border-[#0FED9D] bg-[#0FED9D]/10 text-[#0FED9D]"
                        : "border-white/10 text-white/60 hover:border-white/20"
                    }`}
                  >
                    {p.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo de valor</label>
              <div className="grid gap-2">
                {[
                  { value: "EXPEDIENTE_COMPLETO", label: "Expediente completo", desc: "Video narrativo completo" },
                  { value: "VOZ_SIN_CAMARA", label: "Voz sin cámara", desc: "Solo narración" },
                  { value: "XED", label: "XED", desc: "Formato corto" },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTipoDeValor(t.value)}
                    className={`rounded-xl border p-4 text-left transition ${
                      tipoDeValor === t.value
                        ? "border-[#0FED9D] bg-[#0FED9D]/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <p className="font-medium">{t.label}</p>
                    <p className="text-xs text-white/40">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 rounded-xl border border-white/10 py-4 font-medium text-white/60 transition hover:bg-white/5"
              >
                ← Atrás
              </button>
              <button
                onClick={handleProcess}
                disabled={!selectedLicense || uploading}
                className="flex-1 rounded-xl bg-[#0FED9D] py-4 font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                Crear Video 🚀
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-[#0FED9D]/20 p-4">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#0FED9D]/30">
                <span className="text-3xl">⚡</span>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold">Procesando...</h2>
              <p className="mt-1 text-sm text-white/50">
                Subiendo archivos y creando tu video
              </p>
            </div>
            <div className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#0FED9D] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-white/40">{progress}%</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0FED9D]/20">
              <span className="text-4xl">✓</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0FED9D]">¡Video creado!</h2>
              <p className="mt-1 text-sm text-white/50">
                Tu video está siendo procesado y aparecerá en la cola de revisión
              </p>
            </div>
            <button
              onClick={resetWizard}
              className="rounded-xl border border-white/10 px-8 py-3 text-sm font-medium transition hover:bg-white/5"
            >
              Crear otro video
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
