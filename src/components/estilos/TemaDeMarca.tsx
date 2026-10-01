"use client";

import { useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { COLORES_DEL_LOGO } from "@/graphql/operations";
import { HEX, type Tema } from "@/lib/estilos-texto";

type Clave = keyof Tema;

const COLORES: { clave: Clave; nombre: string; ayuda: string }[] = [
  { clave: "colorPrimario", nombre: "Primario", ayuda: "La palabra que se dice, las píldoras, las barras" },
  { clave: "colorSecundario", nombre: "Secundario", ayuda: "El segundo bloque y los acentos" },
  { clave: "colorTexto", nombre: "Texto", ayuda: "La letra de los subtítulos y el gancho" },
  { clave: "colorFondo", nombre: "Fondo", ayuda: "Cajas y franjas oscuras" },
];

/** Si los cuatro colores son #RRGGBB: recién entonces se puede guardar. */
export const temaCompleto = (t: Tema) => COLORES.every((c) => HEX.test(t[c.clave]));

/**
 * El tema de la marca (ng-creator-be#132): los cuatro colores con que se
 * pintan los estilos de texto de sus clips. Arranca de lo que trae
 * `estiloClipMarca.tema` (el guardado o, si nunca se guardó, el que sale del
 * estilo de sus montajes). Solo el propietario lo cambia; los demás lo ven.
 *
 * Controlado: el tema que se está editando también pinta la galería y la
 * vista previa de al lado, antes de guardarlo.
 */
export function TemaDeMarca({
  marcaId,
  tema,
  onCambiar,
  editable,
  tieneLogo,
  onGuardar,
  guardando,
  guardadoEn,
}: {
  marcaId: string;
  tema: Tema;
  onCambiar: (t: Tema) => void;
  editable: boolean;
  tieneLogo: boolean;
  onGuardar: () => void;
  guardando: boolean;
  guardadoEn: Date | null;
}) {
  const [elegido, setElegido] = useState<Clave>("colorPrimario");
  const [pedirLogo, logoQ] = useLazyQuery(COLORES_DEL_LOGO, { fetchPolicy: "network-only" });
  const [aviso, setAviso] = useState<string | null>(null);
  const sugeridos: string[] = logoQ.data?.coloresDelLogo?.colores ?? [];

  const poner = (clave: Clave, valor: string) => onCambiar({ ...tema, [clave]: valor });

  async function usarLogo() {
    setAviso(null);
    if (!tieneLogo) {
      setAviso("La marca no tiene logo. Subilo más abajo, en Logo, y probá de nuevo.");
      return;
    }
    const r = await pedirLogo({ variables: { marcaId } });
    if (r.error) {
      setAviso(r.error.message);
      return;
    }
    const s = r.data?.coloresDelLogo;
    if (!s) {
      setAviso("El logo no tiene colores que sirvan (es blanco y negro, o casi transparente). Elegilos a mano.");
      return;
    }
    onCambiar({ ...tema, colorPrimario: s.colorPrimario, colorSecundario: s.colorSecundario });
    setElegido("colorPrimario");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Tema de la marca</h2>
          <p className="mt-0.5 text-xs text-white/45">Los colores con que se pintan los estilos de texto de tus clips.</p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => void usarLogo()}
            disabled={logoQ.loading}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            {logoQ.loading ? "Mirando el logo…" : "Usar colores del logo"}
          </button>
        )}
      </div>

      {aviso && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">{aviso}</p>}

      {editable && sugeridos.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-white/55">
            Del logo. Tocá uno para usarlo como{" "}
            <span className="font-medium text-white">{COLORES.find((c) => c.clave === elegido)?.nombre.toLowerCase()}</span>:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sugeridos.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => poner(elegido, c.toUpperCase())}
                title={c}
                className={`h-8 w-8 rounded-lg border-2 transition hover:scale-110 ${
                  tema[elegido].toUpperCase() === c.toUpperCase() ? "border-white" : "border-white/20"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {COLORES.map(({ clave, nombre, ayuda }) => {
          const valor = tema[clave];
          const valido = HEX.test(valor);
          return (
            <div
              key={clave}
              onClick={() => editable && setElegido(clave)}
              className={`flex items-center gap-3 rounded-lg border p-2 ${
                editable && elegido === clave ? "border-ng-azul bg-ng-azul/10" : "border-white/10"
              }`}
            >
              <label className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/20" style={{ background: valido ? valor : "transparent" }}>
                <input
                  type="color"
                  value={valido ? valor.toLowerCase() : "#000000"}
                  onChange={(e) => poner(clave, e.target.value.toUpperCase())}
                  onFocus={() => setElegido(clave)}
                  disabled={!editable}
                  aria-label={`Elegir el color ${nombre.toLowerCase()}`}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{nombre}</p>
                <p className="truncate text-[11px] text-white/40">{ayuda}</p>
              </div>
              <input
                value={valor}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  poner(clave, (v.startsWith("#") ? v : `#${v}`).toUpperCase().slice(0, 7));
                }}
                onFocus={() => setElegido(clave)}
                disabled={!editable}
                aria-label={`Color ${nombre.toLowerCase()} en hexadecimal`}
                className={`w-[5.5rem] rounded-md border bg-black/30 px-2 py-1 font-mono text-xs uppercase outline-none ${
                  valido ? "border-white/15 focus:border-ng-azul" : "border-red-500/60"
                }`}
              />
            </div>
          );
        })}
      </div>

      {editable ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onGuardar}
            disabled={guardando || !temaCompleto(tema)}
            className="rounded-lg bg-marca px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar tema"}
          </button>
          {!temaCompleto(tema) && <span className="text-xs text-red-400">Cada color va como #RRGGBB.</span>}
          {guardadoEn && <span className="text-sm text-ng-teal">Guardado. Los clips nuevos ya salen con estos colores.</span>}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/40">Los colores de la marca los cambia el propietario.</p>
      )}
    </section>
  );
}
