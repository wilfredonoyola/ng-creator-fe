"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Un modal para confirmar algo antes de hacerlo: programar a una hora,
 * cancelar o eliminar. Escape y un clic afuera cierran (salvo mientras
 * trabaja). `peligro` lo pinta de rojo, para lo que no se deshace.
 */
export function ModalConfirmar({
  titulo,
  children,
  textoConfirmar,
  textoVolver,
  peligro = false,
  cargando = false,
  onConfirmar,
  onCerrar,
}: {
  titulo: string;
  children?: ReactNode;
  textoConfirmar: string;
  textoVolver: string;
  peligro?: boolean;
  cargando?: boolean;
  onConfirmar: () => void;
  onCerrar: () => void;
}) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    boton.current?.focus();
  }, []);
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !cargando) onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [cargando, onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={id}
      onClick={() => !cargando && onCerrar()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-white/10 bg-ng-superficie p-5">
        <h2 id={id} className="text-base font-semibold text-white">
          {titulo}
        </h2>
        {children ? <div className="mt-3 space-y-2 text-sm text-white/70">{children}</div> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            {textoVolver}
          </button>
          <button
            ref={boton}
            type="button"
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
              peligro ? "bg-red-500 text-white hover:bg-red-600" : "bg-marca text-ng-tinta hover:brightness-110"
            }`}
          >
            {cargando ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
