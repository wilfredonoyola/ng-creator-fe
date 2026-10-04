"use client";

import { useState } from "react";
import { useLazyQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { COLORES_DEL_LOGO } from "@/graphql/operations";
import { HEX, type Tema } from "@/lib/estilos-texto";

type Clave = keyof Tema;

const COLORES: { clave: Clave }[] = [
  { clave: "colorPrimario" },
  { clave: "colorSecundario" },
  { clave: "colorTexto" },
  { clave: "colorFondo" },
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
 * vista previa de al lado, y se guarda con el resto del Brand Kit. Tenía un
 * botón propio y, si se guardaba con el de abajo, los colores se perdían.
 */
export function TemaDeMarca({
  marcaId,
  tema,
  onCambiar,
  editable,
  tieneLogo,
}: {
  marcaId: string;
  tema: Tema;
  onCambiar: (t: Tema) => void;
  editable: boolean;
  tieneLogo: boolean;
}) {
  const t = useTranslations("estilosTema");
  const [elegido, setElegido] = useState<Clave>("colorPrimario");
  const [pedirLogo, logoQ] = useLazyQuery(COLORES_DEL_LOGO, { fetchPolicy: "network-only" });
  const [aviso, setAviso] = useState<string | null>(null);
  const sugeridos: string[] = logoQ.data?.coloresDelLogo?.colores ?? [];

  const poner = (clave: Clave, valor: string) => onCambiar({ ...tema, [clave]: valor });

  async function usarLogo() {
    setAviso(null);
    if (!tieneLogo) {
      setAviso(t("sinLogo"));
      return;
    }
    const r = await pedirLogo({ variables: { marcaId } });
    if (r.error) {
      setAviso(r.error.message);
      return;
    }
    const s = r.data?.coloresDelLogo;
    if (!s) {
      setAviso(t("logoSinColores"));
      return;
    }
    onCambiar({ ...tema, colorPrimario: s.colorPrimario, colorSecundario: s.colorSecundario });
    setElegido("colorPrimario");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("titulo")}</h2>
          <p className="mt-0.5 text-xs text-white/45">{t("subtitulo")}</p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => void usarLogo()}
            disabled={logoQ.loading}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-60"
          >
            {logoQ.loading ? t("mirandoLogo") : t("usarLogo")}
          </button>
        )}
      </div>

      {aviso && <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">{aviso}</p>}

      {editable && sugeridos.length > 0 && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-white/55">
            {t.rich("delLogo", {
              color: t(`colores.${elegido}.minuscula`),
              b: (c) => <span className="font-medium text-white">{c}</span>,
            })}
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
        {COLORES.map(({ clave }) => {
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
                  aria-label={t("elegirColor", { color: t(`colores.${clave}.minuscula`) })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
                />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t(`colores.${clave}.nombre`)}</p>
                <p className="truncate text-[11px] text-white/40">{t(`colores.${clave}.ayuda`)}</p>
              </div>
              <input
                value={valor}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  poner(clave, (v.startsWith("#") ? v : `#${v}`).toUpperCase().slice(0, 7));
                }}
                onFocus={() => setElegido(clave)}
                disabled={!editable}
                aria-label={t("colorHex", { color: t(`colores.${clave}.minuscula`) })}
                className={`w-[5.5rem] rounded-md border bg-black/30 px-2 py-1 font-mono text-xs uppercase outline-none ${
                  valido ? "border-white/15 focus:border-ng-azul" : "border-red-500/60"
                }`}
              />
            </div>
          );
        })}
      </div>

      {editable ? (
        !temaCompleto(tema) && <p className="mt-3 text-xs text-red-400">{t("formatoHex")}</p>
      ) : (
        <p className="mt-3 text-xs text-white/40">{t("soloPropietario")}</p>
      )}
    </section>
  );
}
