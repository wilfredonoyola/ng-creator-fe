"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface SeccionMenu<Id extends string = string> {
  id: Id;
  grupo: string;
  icono: LucideIcon;
  etiqueta: string;
  /** Un punto al lado: "hay cambios sin guardar acá". */
  aviso?: boolean;
}

/**
 * La sección elegida de una página con menú (Brand Kit, Ajustes), en el hash
 * de la URL: se puede compartir (#logo) y volver atrás no la pierde.
 */
export function useSeccionHash<Id extends string>(ids: readonly Id[], inicial: Id): [Id, (s: Id) => void] {
  const [seccion, setSeccion] = useState<Id>(inicial);
  const clave = ids.join(",");
  useEffect(() => {
    const validos = clave.split(",");
    const leer = () => {
      const h = window.location.hash.slice(1);
      if (validos.includes(h)) setSeccion(h as Id);
    };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, [clave]);
  const elegir = (s: Id) => {
    setSeccion(s);
    window.history.replaceState(null, "", `#${s}`);
  };
  return [seccion, elegir];
}

/**
 * El menú de una página por secciones: a la izquierda en pantallas grandes
 * (agrupado y fijo al bajar) y una fila de pestañas arriba en el teléfono.
 */
export function MenuSecciones<Id extends string>({
  secciones,
  grupos,
  actual,
  onElegir,
  titulo,
  avisoTitulo,
}: {
  secciones: SeccionMenu<Id>[];
  /** En orden; un grupo sin secciones no se muestra. */
  grupos: { id: string; etiqueta: string }[];
  actual: Id;
  onElegir: (s: Id) => void;
  /** Para lectores de pantalla. */
  titulo: string;
  avisoTitulo?: string;
}) {
  const boton = (x: SeccionMenu<Id>, chico: boolean) => {
    const Icono = x.icono;
    const activa = actual === x.id;
    return (
      <button
        key={x.id}
        type="button"
        onClick={() => onElegir(x.id)}
        aria-current={activa ? "page" : undefined}
        className={`flex shrink-0 items-center gap-2.5 rounded-lg text-left text-sm transition ${
          chico ? "px-3 py-1.5" : "w-full px-3 py-2"
        } ${activa ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"}`}
      >
        <Icono size={16} className={activa ? "text-marca" : "text-white/40"} aria-hidden />
        <span className="min-w-0 flex-1 truncate">{x.etiqueta}</span>
        {x.aviso && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" title={avisoTitulo} />}
      </button>
    );
  };
  return (
    <nav aria-label={titulo} className="min-w-0">
      {/* Teléfono y tablet: una fila de pestañas que se desliza. */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">{secciones.map((x) => boton(x, true))}</div>
      {/* Escritorio: el menú a la izquierda, fijo al bajar. */}
      <div className="sticky top-6 hidden space-y-5 lg:block">
        {grupos.map((g) => {
          const deGrupo = secciones.filter((x) => x.grupo === g.id);
          if (!deGrupo.length) return null;
          return (
            <div key={g.id}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">{g.etiqueta}</p>
              <div className="space-y-0.5">{deGrupo.map((x) => boton(x, false))}</div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
