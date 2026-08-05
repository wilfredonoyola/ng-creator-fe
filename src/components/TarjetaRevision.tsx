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
  pageId: string;
  tipoDeValor: string;
  estado: string;
  videoFinalUrl?: string;
  regeneraciones: number;
  notaVozTexto?: string;
  guion?: Guion;
  validacion?: Validacion;
}

export function TarjetaRevision({ exp }: { exp: Expediente }) {
  const [nota, setNota] = useState("");
  const [mostrarNota, setMostrarNota] = useState(false);

  const refetch = [{ query: COLA_DE_REVISION, variables: { pageId: null } }];
  const [aprobar, { loading: aprobando }] = useMutation(APROBAR, {
    refetchQueries: refetch,
  });
  const [rechazar, { loading: rechazando }] = useMutation(RECHAZAR, {
    refetchQueries: refetch,
  });
  const [regenerar, { loading: regenerando }] = useMutation(REGENERAR, {
    refetchQueries: refetch,
  });

  return (
    <div className="grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-black/30 p-5 md:grid-cols-[220px_1fr]">
      {/* Video */}
      <div className="overflow-hidden rounded-xl bg-black">
        {exp.videoFinalUrl ? (
          <video
            src={exp.videoFinalUrl}
            controls
            className="aspect-[9/16] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[9/16] items-center justify-center text-xs text-white/40">
            Sin video
          </div>
        )}
      </div>

      {/* Guion + validación + acciones */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span
            className="rounded px-2 py-0.5 text-xs font-bold text-black"
            style={{ background: "#0FED9D" }}
          >
            {exp.numero ? `EXPEDIENTE #${exp.numero}` : "SIN NUMERAR"}
          </span>
          <span className="text-xs text-white/40">
            {exp.tipoDeValor}
            {exp.regeneraciones > 0 && ` · ${exp.regeneraciones} regen`}
          </span>
        </div>

        {/* Guion */}
        <div className="mb-3 space-y-1 rounded-lg border border-white/10 bg-black/40 p-3 text-sm">
          {exp.guion?.apertura && (
            <p>
              <span style={{ color: "#0FED9D" }}>[hook] </span>
              {exp.guion.apertura}
            </p>
          )}
          {exp.guion?.detalle && (
            <p>
              <span style={{ color: "#0FED9D" }}>[detalle] </span>
              {exp.guion.detalle}
            </p>
          )}
          {exp.guion?.revelacion && (
            <p>
              <span style={{ color: "#0FED9D" }}>[revelación] </span>
              {exp.guion.revelacion}
            </p>
          )}
          {exp.guion?.cierre && (
            <p>
              <span style={{ color: "#0FED9D" }}>[cierre] </span>
              {exp.guion.cierre}
            </p>
          )}
        </div>

        {/* Checklist del validador */}
        {exp.validacion && (
          <div className="mb-4 space-y-1">
            {exp.validacion.checksPasados.map((c) => (
              <div key={c} className="flex items-center gap-2 text-xs text-white/70">
                <span style={{ color: "#0FED9D" }}>✓</span> {c}
              </div>
            ))}
            {exp.validacion.fallas.map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-red-400">
                <span>✗</span> {f}
              </div>
            ))}
          </div>
        )}

        {/* Nota de regeneración */}
        {mostrarNota && (
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="El hook está flojo, hazlo más directo…"
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/50 p-2 text-sm outline-none focus:border-[#0FED9D]"
            rows={2}
          />
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => aprobar({ variables: { id: exp._id } })}
            disabled={aprobando}
            className="rounded-lg px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            style={{ background: "#0FED9D" }}
          >
            {aprobando ? "Publicando…" : "Aprobar y publicar"}
          </button>

          {!mostrarNota ? (
            <button
              onClick={() => setMostrarNota(true)}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              Regenerar con nota
            </button>
          ) : (
            <button
              onClick={() => {
                regenerar({
                  variables: { input: { expedienteId: exp._id, nota } },
                });
                setMostrarNota(false);
                setNota("");
              }}
              disabled={regenerando || !nota.trim()}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              {regenerando ? "Regenerando…" : "Enviar corrección"}
            </button>
          )}

          <button
            onClick={() => rechazar({ variables: { id: exp._id } })}
            disabled={rechazando}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 hover:bg-white/5 disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
