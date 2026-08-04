"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { APROBAR, RECHAZAR, REGENERAR, COLA_DE_REVISION } from "@/graphql/operations";

interface Guion {
  apertura?: string;
  detalle?: string;
  pregunta?: string;
  evidencia?: string;
  revelacion?: string;
  reconocimiento?: string;
  cierre?: string;
}

interface Validacion {
  aprobado: boolean;
  checksPasados: string[];
  fallas: string[];
}

export interface Expediente {
  _id: string;
  numero?: number | null;
  pagina: string;
  tipoDeValor: string;
  estado: string;
  videoFinalUrl?: string;
  regeneraciones: number;
  notaVozTexto?: string;
  guion?: Guion;
  validacion?: Validacion;
}

const estadoColors: Record<string, { bg: string; text: string }> = {
  EN_REVISION: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  APROBADO: { bg: "bg-green-500/20", text: "text-green-400" },
  PUBLICADO: { bg: "bg-blue-500/20", text: "text-blue-400" },
  FALLIDO: { bg: "bg-red-500/20", text: "text-red-400" },
  RECHAZADO: { bg: "bg-gray-500/20", text: "text-gray-400" },
};

const estadoLabels: Record<string, string> = {
  EN_REVISION: "En revisión",
  APROBADO: "Aprobado",
  PUBLICADO: "Publicado",
  FALLIDO: "Fallido",
  RECHAZADO: "Rechazado",
  INGESTADO: "Procesando",
  TRANSCRIBIENDO: "Transcribiendo",
  ESCRIBIENDO_GUION: "Escribiendo guión",
  VALIDANDO: "Validando",
  GENERANDO_VOZ: "Generando voz",
  ENSAMBLANDO: "Ensamblando",
};

export function VideoCard({ exp }: { exp: Expediente }) {
  const [expanded, setExpanded] = useState(false);
  const [nota, setNota] = useState("");
  const [showRegenerate, setShowRegenerate] = useState(false);

  const refetch = [{ query: COLA_DE_REVISION, variables: { pagina: null } }];
  const [aprobar, { loading: aprobando }] = useMutation(APROBAR, { refetchQueries: refetch });
  const [rechazar, { loading: rechazando }] = useMutation(RECHAZAR, { refetchQueries: refetch });
  const [regenerar, { loading: regenerando }] = useMutation(REGENERAR, { refetchQueries: refetch });

  const estadoStyle = estadoColors[exp.estado] || { bg: "bg-white/10", text: "text-white/60" };
  const estadoLabel = estadoLabels[exp.estado] || exp.estado;

  const handleRegenerate = () => {
    if (!nota.trim()) return;
    regenerar({ variables: { input: { expedienteId: exp._id, nota } } });
    setShowRegenerate(false);
    setNota("");
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent transition-all hover:border-white/20">
      {/* Video Preview */}
      <div className="relative aspect-video bg-black">
        {exp.videoFinalUrl ? (
          <video
            src={exp.videoFinalUrl}
            controls
            className="h-full w-full object-contain"
            poster=""
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-4xl opacity-30">🎬</div>
              <p className="text-sm text-white/30">Video en proceso...</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute left-3 top-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${estadoStyle.bg} ${estadoStyle.text}`}>
            {estadoLabel}
          </span>
        </div>

        {/* Number Badge */}
        {exp.numero && (
          <div className="absolute right-3 top-3">
            <span className="rounded-lg bg-[#0FED9D] px-2 py-1 text-xs font-bold text-black">
              #{exp.numero}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Meta */}
        <div className="mb-3 flex items-center gap-2 text-xs text-white/40">
          <span className="rounded bg-white/10 px-2 py-0.5">{exp.pagina}</span>
          <span>•</span>
          <span>{exp.tipoDeValor}</span>
          {exp.regeneraciones > 0 && (
            <>
              <span>•</span>
              <span className="text-yellow-400">{exp.regeneraciones} regen</span>
            </>
          )}
        </div>

        {/* Guion Preview */}
        {exp.guion?.apertura && (
          <p className="mb-3 line-clamp-2 text-sm text-white/70">
            "{exp.guion.apertura}"
          </p>
        )}

        {/* Expandable Content */}
        {expanded && (
          <div className="mb-4 space-y-3 border-t border-white/10 pt-4">
            {/* Full Script */}
            <div className="space-y-2 rounded-xl bg-black/30 p-3">
              {exp.guion?.apertura && (
                <p className="text-sm">
                  <span className="font-medium text-[#0FED9D]">[Hook]</span>{" "}
                  <span className="text-white/80">{exp.guion.apertura}</span>
                </p>
              )}
              {exp.guion?.detalle && (
                <p className="text-sm">
                  <span className="font-medium text-[#0FED9D]">[Detalle]</span>{" "}
                  <span className="text-white/80">{exp.guion.detalle}</span>
                </p>
              )}
              {exp.guion?.revelacion && (
                <p className="text-sm">
                  <span className="font-medium text-[#0FED9D]">[Revelación]</span>{" "}
                  <span className="text-white/80">{exp.guion.revelacion}</span>
                </p>
              )}
              {exp.guion?.cierre && (
                <p className="text-sm">
                  <span className="font-medium text-[#0FED9D]">[Cierre]</span>{" "}
                  <span className="text-white/80">{exp.guion.cierre}</span>
                </p>
              )}
            </div>

            {/* Validation Checklist */}
            {exp.validacion && (
              <div className="space-y-1">
                {exp.validacion.checksPasados.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-xs">
                    <span className="text-[#0FED9D]">✓</span>
                    <span className="text-white/60">{c}</span>
                  </div>
                ))}
                {exp.validacion.fallas.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">✗</span>
                    <span className="text-red-400/80">{f}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Regenerate Input */}
            {showRegenerate && (
              <div className="space-y-2">
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Describe qué quieres mejorar..."
                  className="w-full rounded-xl border border-white/10 bg-black/50 p-3 text-sm outline-none placeholder:text-white/30 focus:border-[#0FED9D]/50"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRegenerate(false)}
                    className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerando || !nota.trim()}
                    className="flex-1 rounded-lg bg-[#0FED9D] py-2 text-sm font-medium text-black disabled:opacity-50"
                  >
                    {regenerando ? "..." : "Regenerar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm text-white/60 transition hover:bg-white/5"
          >
            {expanded ? "Ver menos" : "Ver más"}
          </button>

          {exp.estado === "EN_REVISION" && (
            <>
              <button
                onClick={() => setShowRegenerate(true)}
                disabled={showRegenerate}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:bg-white/5 disabled:opacity-50"
              >
                🔄
              </button>
              <button
                onClick={() => rechazar({ variables: { id: exp._id } })}
                disabled={rechazando}
                className="rounded-lg border border-red-500/30 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                ✗
              </button>
              <button
                onClick={() => aprobar({ variables: { id: exp._id } })}
                disabled={aprobando}
                className="rounded-lg bg-[#0FED9D] px-4 py-2.5 text-sm font-medium text-black transition hover:bg-[#0FED9D]/90 disabled:opacity-50"
              >
                {aprobando ? "..." : "Aprobar ✓"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
