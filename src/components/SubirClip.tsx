"use client";

import { useState, useRef } from "react";
import { uploadClip, uploadVoiceNote } from "@/lib/upload";

interface SubirClipProps {
  onSuccess?: () => void;
}

export function SubirClip({ onSuccess }: SubirClipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipPreview, setClipPreview] = useState<string | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  const clipInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  const handleClipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setClipFile(file);
    setError(null);

    // Create video preview
    try {
      const url = URL.createObjectURL(file);
      setClipPreview(url);
    } catch {
      // ignore preview errors
    }
  };

  const handleVoiceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVoiceFile(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!clipFile) {
      setError("Selecciona un clip de video");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      setProgress("Subiendo clip...");
      const clipResult = await uploadClip(clipFile);
      console.log("Clip subido:", clipResult);

      let voiceResult = null;
      if (voiceFile) {
        setProgress("Subiendo nota de voz...");
        voiceResult = await uploadVoiceNote(voiceFile);
        console.log("Nota de voz subida:", voiceResult);
      }

      setProgress("Listo!");

      // TODO: Llamar mutation ingestar con los paths
      console.log("Clip path:", clipResult.storagePath);
      if (voiceResult) {
        console.log("Voice path:", voiceResult.storagePath);
      }

      // Reset form
      setClipFile(null);
      setClipPreview(null);
      setVoiceFile(null);
      setIsOpen(false);
      setProgress("");

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Error al subir");
      setProgress("");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setClipFile(null);
    setClipPreview(null);
    setVoiceFile(null);
    setError(null);
    setProgress("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-[#0FED9D] px-4 py-2 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90"
      >
        + Subir clip
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-6">
      <h2 className="mb-4 text-lg font-medium">Subir nuevo clip</h2>

      {/* Clip de video */}
      <div className="mb-4">
        <label className="mb-2 block text-sm text-white/70">
          Clip de video *
        </label>
        <input
          ref={clipInputRef}
          type="file"
          accept="video/*"
          onChange={handleClipSelect}
          className="hidden"
        />
        {clipPreview ? (
          <div className="relative">
            <video
              src={clipPreview}
              controls
              className="max-h-48 w-full rounded-lg object-contain"
            />
            <button
              onClick={() => {
                setClipFile(null);
                setClipPreview(null);
              }}
              className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => clipInputRef.current?.click()}
            className="w-full rounded-lg border-2 border-dashed border-white/20 py-8 text-sm text-white/50 transition hover:border-white/40"
          >
            Haz clic para seleccionar video
          </button>
        )}
        {clipFile && (
          <p className="mt-1 text-xs text-white/40">
            {clipFile.name} ({(clipFile.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
      </div>

      {/* Nota de voz (opcional) */}
      <div className="mb-4">
        <label className="mb-2 block text-sm text-white/70">
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
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="text-sm">{voiceFile.name}</span>
            <button
              onClick={() => setVoiceFile(null)}
              className="ml-auto text-white/50 hover:text-white"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => voiceInputRef.current?.click()}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-3 text-sm text-white/50 transition hover:bg-white/10"
          >
            + Agregar nota de voz
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="mb-4 text-sm text-red-400">{error}</p>
      )}

      {/* Progress */}
      {progress && (
        <p className="mb-4 text-sm text-[#0FED9D]">{progress}</p>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={uploading}
          className="flex-1 rounded-lg border border-white/10 py-2 text-sm transition hover:bg-white/5 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || !clipFile}
          className="flex-1 rounded-lg bg-[#0FED9D] py-2 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
        >
          {uploading ? "Subiendo..." : "Subir"}
        </button>
      </div>
    </div>
  );
}
