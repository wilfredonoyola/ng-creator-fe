"use client";

import { BookOpen, ChevronDown, TriangleAlert } from "lucide-react";

/**
 * La guía de una pantalla de configuración del superadmin (Cobro, Mailchimp):
 * los pasos en orden, con dónde sacar cada dato, y lo importante que hay que
 * saber. Plegable; arranca abierta mientras falte configurar algo.
 *
 * Los textos vienen de los mensajes de cada pantalla (`guia.pasos`,
 * `guia.importante`), como listas.
 */
export function GuiaConfiguracion({
  titulo,
  pasosTitulo,
  pasos,
  importanteTitulo,
  importante,
  abierta,
}: {
  titulo: string;
  pasosTitulo: string;
  pasos: string[];
  importanteTitulo: string;
  importante: string[];
  abierta: boolean;
}) {
  return (
    <details
      // La key hace que cambie de abierta a cerrada cuando termina de cargar.
      key={String(abierta)}
      open={abierta}
      className="group mb-6 max-w-3xl rounded-xl border border-white/10 bg-white/[0.02]"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <BookOpen className="h-4 w-4 text-marca" aria-hidden />
        <span className="flex-1">{titulo}</span>
        <ChevronDown className="h-4 w-4 text-white/50 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-white/10 px-5 pb-5 pt-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{pasosTitulo}</h3>
        <ol className="mt-3 space-y-3">
          {pasos.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-white/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca text-xs font-bold text-ng-tinta">
                {i + 1}
              </span>
              <span className="pt-0.5">{p}</span>
            </li>
          ))}
        </ol>
        {importante.length > 0 && (
          <>
            <h3 className="mt-6 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-300/90">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              {importanteTitulo}
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/70 marker:text-amber-300/70">
              {importante.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
