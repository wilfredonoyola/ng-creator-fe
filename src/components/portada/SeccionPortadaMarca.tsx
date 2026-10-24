"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { GUARDAR_PLANTILLA_PORTADA, PLANTILLA_PORTADA_MARCA } from "@/graphql/operations";
import { FUENTES_ESTILO } from "@/lib/estilos-texto";
import { POSICIONES_LOGO } from "@/lib/plantilla-clip";
import {
  ESTILOS_PORTADA,
  FUENTES_PORTADA,
  plantillaParaGuardar,
  useVistaPortada,
  type PlantillaPortada,
} from "@/lib/portada-marca";
import { VistaPortada } from "./VistaPortada";

/**
 * La portada de marca en Brand Kit (ng-creator-be#239): el diseño con que
 * salen las portadas de las publicaciones nuevas. Se guarda aparte del resto
 * de la plantilla, con su botón, y la vista previa es la imagen que arma el
 * backend sobre el último clip listo de la marca.
 */
export function SeccionPortadaMarca({ marcaId, opera, tieneLogo }: { marcaId: string; opera: boolean; tieneLogo: boolean }) {
  const t = useTranslations("portadaMarca");
  const tb = useTranslations("brandKit");
  const q = useQuery(PLANTILLA_PORTADA_MARCA, { variables: { marcaId } });
  const [guardar, { loading: guardando }] = useMutation(GUARDAR_PLANTILLA_PORTADA, {
    refetchQueries: [{ query: PLANTILLA_PORTADA_MARCA, variables: { marcaId } }],
  });
  const [p, setP] = useState<PlantillaPortada | null>(null);
  const [guardada, setGuardada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Arranca de lo guardado una vez por marca; después manda lo que se edita.
  const cargadaPara = useRef<string | null>(null);
  useEffect(() => {
    const guardadaAhi = q.data?.plantillaPortadaMarca;
    if (!guardadaAhi || cargadaPara.current === marcaId) return;
    cargadaPara.current = marcaId;
    setP(plantillaParaGuardar(guardadaAhi));
  }, [q.data, marcaId]);

  const vista = useVistaPortada({ marcaId, plantilla: p ? { ...p, activa: true } : null }, !p);

  const cambiar = (c: Partial<PlantillaPortada>) => {
    setP((x) => (x ? { ...x, ...c } : x));
    setGuardada(false);
  };

  async function enviar() {
    if (!p) return;
    setError(null);
    try {
      await guardar({ variables: { marcaId, plantilla: p } });
      setGuardada(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
    }
  }

  const opcion = (activa: boolean) =>
    `rounded-lg border px-2.5 py-1.5 text-left text-xs ${
      activa ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
    }`;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("titulo")}</h2>
        {p && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={p.activa} onChange={(e) => cambiar({ activa: e.target.checked })} disabled={!opera} />
            {t("activa")}
          </label>
        )}
      </div>
      <p className="mt-0.5 text-xs text-white/45">{t("ayuda")}</p>

      {!p ? (
        <p className="mt-4 text-sm text-white/50">{tb("cargando")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">{t("estilo")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {ESTILOS_PORTADA.map((e) => (
                <button key={e} onClick={() => cambiar({ estilo: e })} disabled={!opera} className={opcion(p.estilo === e)}>
                  <span className="block font-medium">{t(`estilos.${e}.nombre`)}</span>
                  <span className="block text-[11px] text-white/45">{t(`estilos.${e}.detalle`)}</span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{t("fuente")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FUENTES_PORTADA.map((f) => {
                const def = FUENTES_ESTILO[f];
                return (
                  <button
                    key={f}
                    onClick={() => cambiar({ fuente: f })}
                    disabled={!opera}
                    className={opcion(p.fuente === f)}
                    style={{ fontFamily: `"${def.familiaCss}", sans-serif`, fontWeight: def.peso }}
                  >
                    {def.familiaCss}
                  </button>
                );
              })}
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={p.mayusculas} onChange={(e) => cambiar({ mayusculas: e.target.checked })} disabled={!opera} />
              {t("mayusculas")}
            </label>

            <Deslizador
              etiqueta={t("posicion")}
              valor={p.posicionY}
              min={0.15}
              max={0.85}
              paso={0.01}
              mostrar={(v) => (v < 0.4 ? t("arriba") : v > 0.6 ? t("abajo") : t("centro"))}
              onCambio={(v) => cambiar({ posicionY: v })}
              deshabilitado={!opera}
            />
            <Deslizador
              etiqueta={t("tamano")}
              valor={p.tamano}
              min={0.6}
              max={1.6}
              paso={0.05}
              mostrar={(v) => `${Math.round(v * 100)} %`}
              onCambio={(v) => cambiar({ tamano: v })}
              deshabilitado={!opera}
            />

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-white/50">{t("logo")}</p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={p.logoActivo} onChange={(e) => cambiar({ logoActivo: e.target.checked })} disabled={!opera} />
                {t("conLogo")}
              </label>
            </div>
            {!tieneLogo && p.logoActivo && <p className="mt-1 text-xs text-white/40">{t("sinLogo")}</p>}
            {p.logoActivo && (
              <>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {POSICIONES_LOGO.map((x) => (
                    <button key={x} onClick={() => cambiar({ logoPosicion: x })} disabled={!opera} className={opcion(p.logoPosicion === x)}>
                      {tb(`posicionesLogo.${x}`)}
                    </button>
                  ))}
                </div>
                <Deslizador
                  etiqueta={tb("logo.tamano")}
                  valor={p.logoTamano}
                  min={0.08}
                  max={0.4}
                  paso={0.01}
                  mostrar={(v) => tb("logo.delAncho", { n: Math.round(v * 100) })}
                  onCambio={(v) => cambiar({ logoTamano: v })}
                  deshabilitado={!opera}
                />
              </>
            )}

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            {opera && (
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={() => void enviar()}
                  disabled={guardando}
                  className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-60"
                >
                  {guardando ? tb("guardando") : t("guardar")}
                </button>
                {guardada && <span className="text-sm text-ng-teal">{tb("guardado")}</span>}
              </div>
            )}
          </div>
          <div>
            <VistaPortada imagen={vista.imagen} cargando={vista.cargando} error={vista.error} ancho={200} />
            <p className="mt-2 max-w-[200px] text-xs text-white/40">{t("vista.ayuda")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  mostrar,
  onCambio,
  deshabilitado,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  mostrar: (v: number) => string;
  onCambio: (v: number) => void;
  deshabilitado: boolean;
}) {
  return (
    <label className="mt-4 block">
      <span className="flex justify-between text-xs text-white/60">
        <span>{etiqueta}</span>
        <span className="tabular-nums">{mostrar(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        disabled={deshabilitado}
        className="mt-1 w-full accent-[#FFD400]"
      />
    </label>
  );
}
