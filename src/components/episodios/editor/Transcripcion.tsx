"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { agregarCorte, estaCortado, type Corte } from "@/lib/cortes";
import type { Palabra } from "./tipos";

export type ModoTranscripcion = "inicio" | "fin" | "corregir" | "quitar";

/**
 * La transcripción alrededor del clip: se toca una palabra para elegir dónde
 * empieza o termina, para corregirla en el subtítulo o para sacar una frase
 * del medio. Lo tachado está en un corte: tocarlo lo vuelve a poner.
 */
export function Transcripcion({
  palabras,
  desde,
  hasta,
  cortes,
  correcciones,
  modo,
  onModo,
  onCambiarTramo,
  onCambiarCortes,
  onCambiarCorrecciones,
  puedeEditar,
}: {
  palabras: Palabra[];
  desde: number;
  hasta: number;
  cortes: Corte[];
  correcciones: { desde: number; texto: string }[];
  modo: ModoTranscripcion;
  onModo: (m: ModoTranscripcion) => void;
  onCambiarTramo: (desde: number, hasta: number) => void;
  onCambiarCortes: (c: Corte[]) => void;
  onCambiarCorrecciones: (c: { desde: number; texto: string }[]) => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorClip");
  const [corrigiendo, setCorrigiendo] = useState<Palabra | null>(null);
  // "Quitar del clip": de una palabra a otra. Y la palabra tachada que se tocó, para volver a ponerla.
  const [seleccion, setSeleccion] = useState<{ a: Palabra; b: Palabra } | null>(null);
  const [reponiendo, setReponiendo] = useState<{ palabra: Palabra; corte: Corte } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const correccionDe = useMemo(() => {
    const m = new Map<number, string>();
    correcciones.forEach((c) => m.set(Math.round(c.desde * 1000), c.texto));
    return m;
  }, [correcciones]);

  function tocar(p: Palabra) {
    if (!puedeEditar) return;
    const corte = estaCortado((p.desde + p.hasta) / 2, cortes);
    if (corte) {
      setSeleccion(null);
      setReponiendo({ palabra: p, corte });
      return;
    }
    setReponiendo(null);
    if (modo === "quitar") {
      // El primer toque elige una palabra; el segundo, hasta dónde va la frase.
      setSeleccion((s) => (s && s.a === s.b && s.a !== p ? (p.desde < s.a.desde ? { a: p, b: s.a } : { a: s.a, b: p }) : { a: p, b: p }));
      return;
    }
    if (modo === "inicio") onCambiarTramo(p.desde, Math.max(hasta, p.desde + 1));
    else if (modo === "fin") onCambiarTramo(Math.min(desde, p.hasta - 1), p.hasta);
    else setCorrigiendo(p);
  }

  function quitarSeleccion() {
    if (!seleccion) return;
    const r = agregarCorte(cortes, { desdeSeg: seleccion.a.desde, hastaSeg: seleccion.b.hasta }, desde, hasta);
    if (!r) {
      setAviso(tr("errores.noQuitarTodo"));
      return;
    }
    setAviso(null);
    onCambiarCortes(r);
    setSeleccion(null);
  }

  function corregir(p: Palabra, texto: string | null) {
    const clave = Math.round(p.desde * 1000);
    const resto = correcciones.filter((c) => Math.round(c.desde * 1000) !== clave);
    onCambiarCorrecciones(texto === null ? resto : [...resto, { desde: p.desde, texto }]);
    setCorrigiendo(null);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={tr("pestanas.transcripcion.titulo")}>
        {(["inicio", "fin", "corregir", "quitar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={modo === m}
            onClick={() => {
              onModo(m);
              setSeleccion(null);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs ${modo === m ? "bg-white font-medium text-ng-tinta" : "border border-white/15 text-white/70 hover:bg-white/5"}`}
          >
            {tr(`modos.${m}`)}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto rounded-lg bg-black/30 p-3 text-[15px] leading-8">
        {palabras.map((p) => {
          const mitad = (p.desde + p.hasta) / 2;
          const dentro = mitad >= desde && mitad <= hasta;
          const cortada = dentro && Boolean(estaCortado(mitad, cortes));
          const elegida = seleccion && p.desde >= seleccion.a.desde && p.desde <= seleccion.b.desde;
          const corregida = correccionDe.get(Math.round(p.desde * 1000));
          return (
            <button
              key={p.desde}
              type="button"
              onClick={() => tocar(p)}
              title={cortada ? tr("quitar.tachada") : `${p.desde.toFixed(2)} s`}
              className={`mr-1 rounded px-0.5 transition ${
                elegida
                  ? "bg-ng-azul/30 text-white"
                  : cortada
                    ? "text-white/30 line-through decoration-red-400 decoration-2"
                    : dentro
                      ? "bg-white/10 text-white"
                      : "text-white/35"
              } hover:bg-white/20 ${corregida !== undefined ? "underline decoration-ng-azul" : ""}`}
            >
              {corregida !== undefined ? corregida || "∅" : p.texto}
            </button>
          );
        })}
      </div>
      {modo === "quitar" && !seleccion && !reponiendo && <p className="mt-2 text-xs text-white/45">{tr("quitar.ayuda")}</p>}
      {aviso && <p className="mt-2 text-xs text-amber-300">{aviso}</p>}
      {seleccion && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ng-azul/30 bg-ng-azul/5 p-2.5 text-sm">
          <span className="min-w-0 flex-1 truncate text-white/70">
            {tr("quitar.seleccion", {
              n: palabras.filter((p) => p.desde >= seleccion.a.desde && p.desde <= seleccion.b.desde).length,
              seg: (seleccion.b.hasta - seleccion.a.desde).toFixed(1),
            })}
          </span>
          <button type="button" onClick={quitarSeleccion} className="rounded bg-ng-azul px-2 py-1 text-xs font-medium text-ng-tinta">
            {tr("quitar.quitar")}
          </button>
          <button type="button" onClick={() => setSeleccion(null)} className="text-xs text-white/40">
            {tr("quitar.cancelar")}
          </button>
        </div>
      )}
      {reponiendo && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 p-2.5 text-sm">
          <span className="min-w-0 flex-1 text-white/70">
            {tr("reponer.texto", {
              palabra: reponiendo.palabra.texto,
              seg: (reponiendo.corte.hastaSeg - reponiendo.corte.desdeSeg).toFixed(1),
            })}
          </span>
          <button
            type="button"
            onClick={() => {
              const c = reponiendo.corte;
              onCambiarCortes(cortes.filter((x) => x.desdeSeg !== c.desdeSeg || x.hastaSeg !== c.hastaSeg));
              setReponiendo(null);
            }}
            className="rounded bg-white px-2 py-1 text-xs text-ng-tinta"
          >
            {tr("reponer.volver")}
          </button>
          <button type="button" onClick={() => setReponiendo(null)} className="text-xs text-white/40">
            {tr("reponer.cancelar")}
          </button>
        </div>
      )}
      {corrigiendo && (
        <Correccion
          key={corrigiendo.desde}
          palabra={corrigiendo}
          actual={correccionDe.get(Math.round(corrigiendo.desde * 1000))}
          onGuardar={(texto) => corregir(corrigiendo, texto)}
          onCancelar={() => setCorrigiendo(null)}
        />
      )}
    </div>
  );
}

function Correccion({
  palabra,
  actual,
  onGuardar,
  onCancelar,
}: {
  palabra: Palabra;
  actual?: string;
  onGuardar: (texto: string | null) => void;
  onCancelar: () => void;
}) {
  const tr = useTranslations("editorClip");
  const [texto, setTexto] = useState(actual ?? palabra.texto);
  const guardar = () => onGuardar(texto.trim() === palabra.texto ? null : texto);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-ng-azul/30 bg-ng-azul/5 p-2.5 text-sm">
      <span className="text-white/50">{tr("correccion.palabra", { palabra: palabra.texto, seg: palabra.desde.toFixed(2) })}</span>
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && guardar()}
        maxLength={60}
        className="rounded border border-white/15 bg-black/30 px-2 py-1"
      />
      <button type="button" onClick={guardar} className="rounded bg-white px-2 py-1 text-xs text-ng-tinta">
        {tr("correccion.guardar")}
      </button>
      <button type="button" onClick={() => onGuardar("")} className="rounded border border-white/15 px-2 py-1 text-xs">
        {tr("correccion.quitar")}
      </button>
      {actual !== undefined && (
        <button type="button" onClick={() => onGuardar(null)} className="rounded border border-white/15 px-2 py-1 text-xs">
          {tr("correccion.original")}
        </button>
      )}
      <button type="button" onClick={onCancelar} className="text-xs text-white/40">
        {tr("correccion.cancelar")}
      </button>
    </div>
  );
}
