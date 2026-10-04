"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { uploadMarcaLogo } from "@/lib/upload";
import { FUENTES, LIENZOS, medidasEfecto } from "@/lib/clip-encuadre";
import { GUARDAR_PLANTILLA_CLIP, GUARDAR_TEMA_MARCA, PLANTILLA_CLIP_MARCA } from "@/graphql/operations";
import {
  estiloDelLogo,
  PLANTILLA_POR_DEFECTO,
  POSICIONES_LOGO,
  textoDeLlamada,
  type PlantillaClip,
} from "@/lib/plantilla-clip";
import {
  dibujarTexto,
  ESTILO_TEXTO_POR_DEFECTO,
  ganchoDeLlamada,
  resolverEstilo,
  temaValido,
  type EstiloTexto,
  type Tema,
} from "@/lib/estilos-texto";
import { useEstilosTexto } from "@/lib/use-estilos-texto";
import { GaleriaEstilos, MuestraEstilo, useRelojMuestra } from "@/components/estilos/GaleriaEstilos";
import { CapaDibujos } from "@/components/estilos/CapaDibujos";
import { TemaDeMarca, temaCompleto } from "@/components/estilos/TemaDeMarca";
import { InterfazPlataforma, SelectorPlataforma } from "@/components/estilos/InterfazPlataforma";
import type { Plataforma } from "@/lib/plataformas";

/** Ancho de la vista previa en px: un clip 9:16 chico. */
const ANCHO_VISTA = 216;

/**
 * La plantilla de clips de la marca (ng-creator-be#117): el logo en una
 * esquina y una llamada a la acción al final. Se arma una vez y la lleva cada
 * clip de la marca; en el editor, cada clip la puede apagar.
 *
 * Con ng-creator-be#132 suma el tema de la marca (sus colores) y el estilo de
 * texto de sus clips (gancho y subtítulos), que cada clip puede cambiar.
 *
 * Como Equipo: la ve cualquiera con acceso a la marca y la cambia quien opera;
 * el tema, solo el propietario.
 */
export default function PlantillaClipsPage() {
  const { activa } = useMarcaActiva();
  const { puedeOperar, esPropietario } = useSesion();
  const marcaId = activa?._id;
  const opera = puedeOperar(marcaId);
  const propietario = esPropietario(marcaId);

  const q = useQuery(PLANTILLA_CLIP_MARCA, { variables: { marcaId: marcaId ?? "" }, skip: !marcaId });
  const estilo = q.data?.estiloClipMarca;
  const [guardar, { loading: guardando }] = useMutation(GUARDAR_PLANTILLA_CLIP, {
    refetchQueries: [{ query: PLANTILLA_CLIP_MARCA, variables: { marcaId } }],
  });
  const [guardarTema, { loading: guardandoTema }] = useMutation(GUARDAR_TEMA_MARCA, {
    refetchQueries: [{ query: PLANTILLA_CLIP_MARCA, variables: { marcaId } }],
  });
  const [tema, setTema] = useState<Tema | null>(null);

  const [p, setP] = useState<PlantillaClip | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  // Arranca de lo guardado una vez por marca; después manda lo que se edita.
  const cargadaPara = useRef<string | null>(null);
  useEffect(() => {
    if (!estilo || !marcaId || cargadaPara.current === marcaId) return;
    cargadaPara.current = marcaId;
    const { __typename: _, ...guardada } = estilo.plantilla ?? { __typename: null };
    setP(
      estilo.plantilla
        ? (guardada as PlantillaClip)
        : { ...PLANTILLA_POR_DEFECTO, estiloTexto: estilo.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO },
    );
    setLogoUrl(estilo.logoUrl ?? null);
    setTema(temaValido(estilo.tema));
  }, [estilo, marcaId]);

  const cambiar = (c: Partial<PlantillaClip>) => {
    setP((x) => (x ? { ...x, ...c } : x));
    setGuardadoEn(null);
  };

  async function subirLogo(f: File) {
    if (!marcaId) return;
    setSubiendo(true);
    setError(null);
    try {
      setLogoUrl(await uploadMarcaLogo(f, marcaId));
      cambiar({ logoActivo: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir el logo");
    } finally {
      setSubiendo(false);
    }
  }

  // Los colores van con el resto: solo si los cambió el propietario, que es quien puede.
  const guardado = estilo ? temaValido(estilo.tema) : null;
  const temaCambiado =
    !!tema && !!guardado && (Object.keys(tema) as (keyof Tema)[]).some((k) => tema[k] !== guardado[k]);

  async function enviar() {
    if (!marcaId || !p || !tema) return;
    setError(null);
    if (propietario && temaCambiado && !temaCompleto(tema)) {
      setError("Cada color del tema va como #RRGGBB.");
      return;
    }
    try {
      if (propietario && temaCambiado) await guardarTema({ variables: { marcaId, tema } });
      await guardar({ variables: { marcaId, plantilla: { ...p, ctaTexto: p.ctaTexto.trim() } } });
      setGuardadoEn(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  if (!activa) {
    return (
      <DashboardLayout>
        <p className="text-sm text-white/50">Elegí una marca arriba para armar su Brand Kit.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Brand Kit</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-white/50">
          <span>Lo que lleva cada clip de</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/80">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDeMarca(activa) }} />
            {activa.nombre}
          </span>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-white/35">
          Los colores de la marca, el estilo de los textos, tu logo en una esquina y, si querés, una llamada a la acción
          al final. Se aplica sola a todos los clips de la marca; en el editor de cada clip se puede cambiar el estilo y
          apagar el logo y la llamada. Los clips ya procesados la toman al volver a procesarlos.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!p || !tema || !marcaId ? (
        <p className="text-sm text-white/50">Cargando…</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-6">
            <TemaDeMarca
              marcaId={marcaId}
              tema={tema}
              onCambiar={(t) => {
                setTema(t);
                setGuardadoEn(null);
              }}
              editable={propietario}
              tieneLogo={Boolean(logoUrl)}
            />

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="font-semibold">Estilo de los textos</h2>
              <p className="mb-4 mt-0.5 text-xs text-white/45">
                Cómo salen el gancho y los subtítulos de los clips de la marca, con sus colores. Cada clip lo puede
                cambiar en el editor. Se guarda con el Brand Kit.
              </p>
              <GaleriaEstilos
                tema={temaValido(tema)}
                valor={p.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
                onElegir={(e) => e && cambiar({ estiloTexto: e })}
                nombreMarca={activa.nombre}
                deshabilitado={!opera}
              />
            </section>
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Logo</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.logoActivo}
                    onChange={(e) => cambiar({ logoActivo: e.target.checked })}
                    disabled={!opera}
                  />
                  En los clips
                </label>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-white/10 bg-[repeating-conic-gradient(#ffffff10_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca
                    <img src={logoUrl} alt="Logo de la marca" className="max-h-full max-w-full" />
                  ) : (
                    <span className="text-xs text-white/40">Sin logo</span>
                  )}
                </div>
                {opera && (
                  <div>
                    <button
                      onClick={() => archivo.current?.click()}
                      disabled={subiendo}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-60"
                    >
                      {subiendo ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
                    </button>
                    <p className="mt-1 text-xs text-white/40">PNG con fondo transparente, si tenés. Le sacamos el fondo igual.</p>
                    <input
                      ref={archivo}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void subirLogo(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">Dónde va</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {POSICIONES_LOGO.map((x) => (
                  <button
                    key={x.valor}
                    onClick={() => cambiar({ logoPosicion: x.valor })}
                    disabled={!opera}
                    className={`rounded-lg border px-2 py-1.5 text-xs ${
                      p.logoPosicion === x.valor ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {x.etiqueta}
                  </button>
                ))}
              </div>

              <Deslizador
                etiqueta="Tamaño"
                valor={p.logoTamano}
                min={0.08}
                max={0.4}
                paso={0.01}
                mostrar={(v) => `${Math.round(v * 100)} % del ancho`}
                onCambio={(v) => cambiar({ logoTamano: v })}
                deshabilitado={!opera}
              />
              <Deslizador
                etiqueta="Opacidad"
                valor={p.logoOpacidad}
                min={0.2}
                max={1}
                paso={0.05}
                mostrar={(v) => `${Math.round(v * 100)} %`}
                onCambio={(v) => cambiar({ logoOpacidad: v })}
                deshabilitado={!opera}
              />
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Llamada a la acción al final</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.ctaActivo}
                    onChange={(e) => cambiar({ ctaActivo: e.target.checked })}
                    disabled={!opera}
                  />
                  En los clips
                </label>
              </div>
              <input
                value={p.ctaTexto}
                onChange={(e) => cambiar({ ctaTexto: e.target.value.slice(0, 80) })}
                placeholder="Mirá el episodio completo en YouTube"
                disabled={!opera}
                className="mt-4 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-ng-azul"
              />
              <p className="mt-1 text-right text-xs text-white/35">{p.ctaTexto.length}/80</p>
              <Deslizador
                etiqueta="Dura"
                valor={p.ctaSeg}
                min={2}
                max={8}
                paso={0.5}
                mostrar={(v) => `los últimos ${v.toLocaleString("es")} s`}
                onCambio={(v) => cambiar({ ctaSeg: v })}
                deshabilitado={!opera}
              />
              <p className="mt-2 text-xs text-white/40">
                {p.estiloTexto && p.estiloTexto !== "KARAOKE"
                  ? "Va en el centro, en una caja de tu color primario, con la letra del estilo."
                  : "Va en el centro, en caja, con los colores del gancho de la marca."}
              </p>
            </section>

            {opera && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void enviar()}
                  disabled={guardando || guardandoTema}
                  className="rounded-lg bg-marca px-5 py-2 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-60"
                >
                  {guardando || guardandoTema ? "Guardando…" : "Guardar Brand Kit"}
                </button>
                {guardadoEn && <span className="text-sm text-ng-teal">Guardado. Los clips nuevos ya salen así.</span>}
              </div>
            )}
          </div>

          <VistaPrevia
            plantilla={p}
            logoUrl={logoUrl}
            colorGancho={estilo?.colorGancho ?? "#FFFFFF"}
            colorCaja={estilo?.colorContornoGancho ?? "#000000"}
            tema={temaValido(tema)}
            estiloTexto={p.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
            nombreMarca={activa.nombre}
          />
        </div>
      )}
    </DashboardLayout>
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

/**
 * Un clip 9:16 de muestra con el estilo de los textos, el tema, el logo y la
 * llamada a la acción, como salen en el render. Con KARAOKE la llamada va como
 * siempre (Anton, en caja con los colores del gancho); con otro estilo, en una
 * caja del primario con la letra del gancho del estilo.
 */
function VistaPrevia({
  plantilla,
  logoUrl,
  colorGancho,
  colorCaja,
  tema,
  estiloTexto,
  nombreMarca,
}: {
  plantilla: PlantillaClip;
  logoUrl: string | null;
  colorGancho: string;
  colorCaja: string;
  tema: Tema;
  estiloTexto: EstiloTexto;
  nombreMarca: string;
}) {
  const { porEstilo } = useEstilosTexto();
  const t = useRelojMuestra();
  const def = porEstilo.get(estiloTexto);
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  // El render mide en un lienzo de 1080 de ancho: lo mismo, a esta escala.
  const k = ANCHO_VISTA / 1080;
  const { borde } = medidasEfecto("CAJA", 80);
  const cta = plantilla.ctaActivo && plantilla.ctaTexto.trim();
  const conEstilo = def && !def.respetaTextos;

  const encima = (
    <>
      {plantilla.logoActivo && logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca
        <img src={logoUrl} alt="" style={estiloDelLogo(plantilla, ANCHO_VISTA)} />
      )}
      {cta && conEstilo && (
        <CapaDibujos
          lienzo={LIENZOS.VERTICAL}
          dibujos={[
            dibujarTexto(
              textoDeLlamada(plantilla, 10, { color: colorGancho, colorCaja }),
              ganchoDeLlamada(resolverEstilo(def, tema).gancho, tema),
              LIENZOS.VERTICAL,
              { duracionSeg: 10 },
            ),
          ]}
        />
      )}
      {cta && !conEstilo && (
        <div
          className="absolute text-center"
          style={{
            left: "50%",
            top: "42%",
            transform: "translate(-50%, -50%)",
            width: "max-content",
            maxWidth: ANCHO_VISTA * 0.85,
            fontFamily: "'Anton', sans-serif",
            fontSize: 80 * FUENTES.ANTON.factorCss * k,
            lineHeight: `${80 * k}px`,
            color: colorGancho,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              background: colorCaja,
              padding: `${borde * k * 0.35}px ${borde * k}px`,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {plantilla.ctaTexto.trim()}
          </span>
        </div>
      )}
      {plataforma && <InterfazPlataforma plataforma={plataforma} ancho={ANCHO_VISTA} nombreMarca={nombreMarca} />}
    </>
  );

  return (
    <div className="lg:sticky lg:top-6">
      <p className="mb-2 text-sm font-medium">Así sale (9:16)</p>
      <div className="mb-2 max-w-[216px]">
        <SelectorPlataforma valor={plataforma} onCambio={setPlataforma} />
      </div>
      {def ? (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <MuestraEstilo def={def} tema={tema} t={t} nombreMarca={nombreMarca} ancho={ANCHO_VISTA}>
            {encima}
          </MuestraEstilo>
        </div>
      ) : (
        <div
          className="relative animate-pulse overflow-hidden rounded-xl border border-white/10 bg-white/5"
          style={{ width: ANCHO_VISTA, height: (ANCHO_VISTA * 16) / 9 }}
        />
      )}
      <p className="mt-2 max-w-[216px] text-xs text-white/40">
        El gancho dura los primeros segundos y la llamada a la acción aparece solo al final; acá se ven siempre para que
        los ajustes.
        {plataforma && " Lo que queda fuera de la línea punteada lo tapa la red."}
      </p>
    </div>
  );
}
