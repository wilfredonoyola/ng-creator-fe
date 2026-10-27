"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Loader2, Paintbrush, Undo2 } from "lucide-react";
import { GUARDAR_PLANTILLA_PORTADA, PLANTILLA_CLIP_MARCA, PLANTILLA_PORTADA_MARCA, PORTADAS_PERFIL } from "@/graphql/operations";
import { FUENTES_ESTILO, legibleSobre, temaValido, type Tema } from "@/lib/estilos-texto";
import { POSICIONES_LOGO } from "@/lib/plantilla-clip";
import type { DisenoPortada } from "@/lib/diseno-portada";
import {
  ESTILOS_PORTADA,
  FUENTES_PORTADA,
  disenoDePlantilla,
  plantillaParaGuardar,
  useVistaPortada,
  type EstiloPortada,
  type PlantillaPortada,
} from "@/lib/portada-marca";
import { EditorPortada } from "./EditorPortada";
import { VistaPortada } from "./VistaPortada";
import { Interruptor } from "@/components/Interruptor";

/**
 * La portada de marca en Brand Kit (ng-creator-be#239): el diseño con que
 * salen las portadas de las publicaciones nuevas. Se guarda aparte del resto
 * de la plantilla, con su botón, y la vista previa es la imagen que arma el
 * backend sobre el último clip listo de la marca.
 *
 * Con el editor (be#244), "Editar diseño" arma la portada estándar de la
 * marca con capas; mientras haya uno, manda sobre el diseño simple, al que se
 * vuelve con un botón (`diseno: null`). La grilla del perfil muestra el diseño
 * sobre los últimos clips, como se vería la cuadrícula en la red.
 */
export function SeccionPortadaMarca({ marcaId, opera, tieneLogo }: { marcaId: string; opera: boolean; tieneLogo: boolean }) {
  const t = useTranslations("portadaMarca");
  const tb = useTranslations("brandKit");
  const q = useQuery(PLANTILLA_PORTADA_MARCA, { variables: { marcaId } });
  const [guardar, { loading: guardando }] = useMutation(GUARDAR_PLANTILLA_PORTADA, {
    refetchQueries: [{ query: PLANTILLA_PORTADA_MARCA, variables: { marcaId } }],
  });
  const estiloQ = useQuery(PLANTILLA_CLIP_MARCA, { variables: { marcaId } });
  const tema = temaValido(estiloQ.data?.estiloClipMarca?.tema);
  const [p, setP] = useState<PlantillaPortada | null>(null);
  const [diseno, setDiseno] = useState<DisenoPortada | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Arranca de lo guardado una vez por marca; después manda lo que se edita.
  const cargadaPara = useRef<string | null>(null);
  useEffect(() => {
    const guardadaAhi = q.data?.plantillaPortadaMarca;
    if (!guardadaAhi || cargadaPara.current === marcaId) return;
    cargadaPara.current = marcaId;
    setP(plantillaParaGuardar(guardadaAhi));
    setDiseno(disenoDePlantilla(guardadaAhi));
  }, [q.data, marcaId]);

  // Con diseño propio va en la plantilla; sin él, el servidor arma el simple.
  const plantillaVista = p ? { ...p, activa: true, diseno } : null;
  const vista = useVistaPortada({ marcaId, plantilla: plantillaVista }, !p);

  // La grilla del perfil se pide a mano (arma hasta 9 portadas) y se rehace al guardar.
  const [perfilPedido, setPerfilPedido] = useState<string | null>(null);
  const perfilQ = useQuery(PORTADAS_PERFIL, {
    variables: perfilPedido ? (JSON.parse(perfilPedido) as Record<string, unknown>) : undefined,
    skip: !perfilPedido,
    fetchPolicy: "cache-first",
  });
  const pedirPerfil = (pl = plantillaVista) => pl && setPerfilPedido(JSON.stringify({ marcaId, plantilla: pl, cantidad: 9 }));
  const perfil: { clipId: string; imagen: string }[] = perfilQ.data?.portadasPerfil ?? [];

  const cambiar = (c: Partial<PlantillaPortada>) => {
    setP((x) => (x ? { ...x, ...c } : x));
    setGuardada(false);
  };

  async function enviar() {
    if (!p) return;
    setError(null);
    try {
      // Sin `diseno`: el servidor conserva el que ya tiene.
      await guardar({ variables: { marcaId, plantilla: p } });
      setGuardada(true);
      if (perfilPedido) pedirPerfil();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
    }
  }

  /** Guarda el diseño del editor como el estándar de la marca (o null: vuelve al simple). */
  async function guardarDiseno(d: DisenoPortada | null) {
    if (!p) return;
    setError(null);
    await guardar({ variables: { marcaId, plantilla: { ...p, diseno: d } } });
    setDiseno(d);
    setGuardada(true);
    if (perfilPedido) pedirPerfil({ ...p, activa: true, diseno: d });
  }

  async function volverAlSimple() {
    if (!window.confirm(t("disenoPropio.confirmarSimple"))) return;
    try {
      await guardarDiseno(null);
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
          <Interruptor valor={p.activa} onCambio={(v) => cambiar({ activa: v })} etiqueta={t("activa")} deshabilitado={!opera} />
        )}
      </div>
      <p className="mt-0.5 text-xs text-white/45">{t("ayuda")}</p>

      {!p ? (
        <p className="mt-4 text-sm text-white/50">{tb("cargando")}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          <div className="min-w-0 flex-1">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-sm font-medium">{diseno ? t("disenoPropio.titulo") : t("disenoPropio.tituloSimple")}</p>
              <p className="mt-0.5 text-xs text-white/45">{diseno ? t("disenoPropio.ayuda") : t("disenoPropio.ayudaSimple")}</p>
              {opera && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setEditando(true)}
                    className="flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-ng-tinta hover:brightness-110"
                  >
                    <Paintbrush className="h-4 w-4" />
                    {t("disenoPropio.editar")}
                  </button>
                  {diseno && (
                    <button
                      onClick={() => void volverAlSimple()}
                      disabled={guardando}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      {t("disenoPropio.volverSimple")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {!diseno && (
            <>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{t("estilo")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {ESTILOS_PORTADA.map((e) => (
                <button key={e} onClick={() => cambiar({ estilo: e })} disabled={!opera} className={`${opcion(p.estilo === e)} flex items-start gap-2.5`}>
                  <MiniEstilo estilo={e} tema={tema} fuente={p.fuente} />
                  <span className="min-w-0">
                    <span className="block font-medium">{t(`estilos.${e}.nombre`)}</span>
                    <span className="block text-[11px] text-white/45">{t(`estilos.${e}.detalle`)}</span>
                  </span>
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

            <Interruptor
              valor={p.mayusculas}
              onCambio={(v) => cambiar({ mayusculas: v })}
              etiqueta={t("mayusculas")}
              deshabilitado={!opera}
              className="mt-4"
            />

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
              <Interruptor valor={p.logoActivo} onCambio={(v) => cambiar({ logoActivo: v })} etiqueta={t("conLogo")} deshabilitado={!opera} />
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

      {p && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t("perfil.titulo")}</p>
              <p className="text-xs text-white/45">{t("perfil.ayuda")}</p>
            </div>
            <button
              onClick={() => pedirPerfil()}
              disabled={perfilQ.loading}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5 disabled:opacity-50"
            >
              {perfilQ.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {perfilPedido ? t("perfil.actualizar") : t("perfil.ver")}
            </button>
          </div>
          {perfilPedido && (
            <div className="mt-3 grid max-w-[360px] grid-cols-3 gap-1">
              {perfilQ.loading && !perfil.length
                ? Array.from({ length: 9 }, (_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded bg-white/5" />)
                : perfil.map((x) => (
                    // eslint-disable-next-line @next/next/no-img-element -- data URL armada por el backend
                    <img key={x.clipId} src={x.imagen} alt="" className="aspect-[9/16] w-full rounded object-cover" />
                  ))}
            </div>
          )}
          {perfilPedido && !perfilQ.loading && !perfil.length && (
            <p className="mt-2 text-xs text-white/45">{perfilQ.error ? t("perfil.error") : t("perfil.vacio")}</p>
          )}
        </div>
      )}

      {editando && (
        <EditorPortada
          marcaId={marcaId}
          inicial={diseno ?? undefined}
          tituloEjemplo={t("disenoPropio.tituloEjemplo")}
          titulo={t("disenoPropio.tituloEditor")}
          textoGuardar={t("disenoPropio.guardar")}
          onGuardar={async (d) => {
            await guardarDiseno(d);
            setEditando(false);
          }}
          onCerrar={() => setEditando(false)}
        />
      )}
    </section>
  );
}

/** Una miniatura del estilo del título, con los colores de la marca. */
function MiniEstilo({ estilo, tema, fuente }: { estilo: EstiloPortada; tema: Tema; fuente: string }) {
  const def = FUENTES_ESTILO[fuente as keyof typeof FUENTES_ESTILO] ?? FUENTES_ESTILO.ANTON;
  const letra: React.CSSProperties = {
    fontFamily: `"${def.familiaCss}", sans-serif`,
    fontWeight: def.peso,
    fontSize: 9,
    lineHeight: 1.15,
    textTransform: "uppercase",
  };
  const renglon = (texto: string, i: number) => {
    if (estilo === "CAJA") {
      return (
        <span key={i} className="rounded-[2px] px-1" style={{ ...letra, background: tema.colorPrimario, color: legibleSobre(tema.colorPrimario, tema) }}>
          {texto}
        </span>
      );
    }
    const color = estilo === "DOS_COLORES" && i > 0 ? tema.colorPrimario : tema.colorTexto;
    return (
      <span
        key={i}
        style={{
          ...letra,
          color,
          WebkitTextStroke: estilo === "LIMPIO" ? undefined : "0.6px #000",
          textShadow: estilo === "LIMPIO" ? "0 1px 3px rgba(0,0,0,.9)" : "0 1px 1px rgba(0,0,0,.5)",
        }}
      >
        {texto}
      </span>
    );
  };
  return (
    <span
      aria-hidden
      className="flex h-[64px] w-9 shrink-0 flex-col items-center justify-end gap-0.5 overflow-hidden rounded-md pb-3"
      style={{ background: "linear-gradient(160deg,#4b5563,#1f2937)" }}
    >
      {["Tu", "título"].map(renglon)}
    </span>
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
