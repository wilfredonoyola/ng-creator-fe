"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brush, Hash, ImageIcon, Megaphone, Palette, Type, type LucideIcon } from "lucide-react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { RenombrarMarca } from "@/components/RenombrarMarca";
import { ErrorDeSubida, uploadMarcaLogo } from "@/lib/upload";
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
import { SeccionPortadaMarca } from "@/components/portada/SeccionPortadaMarca";
import { SeccionNumeracion } from "@/components/SeccionNumeracion";

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
/**
 * Las secciones de Brand Kit, en el menú de la izquierda. Las de `clips` van
 * en la plantilla de clips y se guardan juntas (la barra de abajo); las de
 * `publicar` tienen su propio botón. Cada una tiene su enlace: #logo, #portada…
 */
const SECCIONES = [
  { id: "colores", grupo: "clips", icono: Palette },
  { id: "estilo", grupo: "clips", icono: Type },
  { id: "logo", grupo: "clips", icono: ImageIcon },
  { id: "llamada", grupo: "clips", icono: Megaphone },
  { id: "portada", grupo: "publicar", icono: Brush },
  { id: "numeracion", grupo: "publicar", icono: Hash },
] as const satisfies readonly { id: string; grupo: "clips" | "publicar"; icono: LucideIcon }[];
type IdSeccion = (typeof SECCIONES)[number]["id"];
const esSeccion = (x: string): x is IdSeccion => SECCIONES.some((s) => s.id === x);

/** La sección elegida, en el hash de la URL: se puede compartir y volver atrás no la pierde. */
function useSeccion(): [IdSeccion, (s: IdSeccion) => void] {
  const [seccion, setSeccion] = useState<IdSeccion>("colores");
  useEffect(() => {
    const leer = () => {
      const h = window.location.hash.slice(1);
      if (esSeccion(h)) setSeccion(h);
    };
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);
  const elegir = (s: IdSeccion) => {
    setSeccion(s);
    window.history.replaceState(null, "", `#${s}`);
  };
  return [seccion, elegir];
}

export default function PlantillaClipsPage() {
  const t = useTranslations("brandKit");
  const tSubida = useTranslations("erroresSubida");
  const locale = useLocale();
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
  const [seccion, elegirSeccion] = useSeccion();
  const deClips = SECCIONES.find((x) => x.id === seccion)?.grupo === "clips";
  /** La plantilla como se guardó la última vez: para saber si hay cambios sin guardar. */
  const plantillaGuardada = useRef<string | null>(null);

  // Arranca de lo guardado una vez por marca; después manda lo que se edita.
  const cargadaPara = useRef<string | null>(null);
  useEffect(() => {
    if (!estilo || !marcaId || cargadaPara.current === marcaId) return;
    cargadaPara.current = marcaId;
    const { __typename: _, ...guardada } = estilo.plantilla ?? { __typename: null };
    const inicial = estilo.plantilla
      ? (guardada as PlantillaClip)
      : { ...PLANTILLA_POR_DEFECTO, estiloTexto: estilo.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO };
    plantillaGuardada.current = JSON.stringify(inicial);
    setP(inicial);
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
      setError(e instanceof ErrorDeSubida ? tSubida(e.clave, e.datos) : e instanceof Error ? e.message : t("errores.subirLogo"));
    } finally {
      setSubiendo(false);
    }
  }

  // Los colores van con el resto: solo si los cambió el propietario, que es quien puede.
  const guardado = estilo ? temaValido(estilo.tema) : null;
  const temaCambiado =
    !!tema && !!guardado && (Object.keys(tema) as (keyof Tema)[]).some((k) => tema[k] !== guardado[k]);
  const sinGuardar = (!!p && JSON.stringify(p) !== plantillaGuardada.current) || (propietario && temaCambiado);

  async function enviar() {
    if (!marcaId || !p || !tema) return;
    setError(null);
    if (propietario && temaCambiado && !temaCompleto(tema)) {
      setError(t("errores.tema"));
      return;
    }
    try {
      if (propietario && temaCambiado) await guardarTema({ variables: { marcaId, tema } });
      await guardar({ variables: { marcaId, plantilla: { ...p, ctaTexto: p.ctaTexto.trim() } } });
      plantillaGuardada.current = JSON.stringify(p);
      setGuardadoEn(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errores.guardar"));
    }
  }

  if (!activa) {
    return (
      <DashboardLayout>
        <p className="text-sm text-white/50">{t("sinMarca")}</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Brand Kit</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-white/50">
          <span>{t("loQueLleva")}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/80">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorDeMarca(activa) }} />
            {activa.nombre}
          </span>
          {propietario && marcaId && <RenombrarMarca marcaId={marcaId} actual={activa.nombre} />}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-white/35">
          {t("intro")}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!p || !tema || !marcaId ? (
        <p className="text-sm text-white/50">{t("cargando")}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <MenuSecciones actual={seccion} onElegir={elegirSeccion} sinGuardar={sinGuardar} />

          <div className={`grid min-w-0 gap-8 ${deClips ? "xl:grid-cols-[minmax(0,1fr)_auto]" : ""}`}>
            <div className="min-w-0 space-y-6">
              <div hidden={seccion !== "colores"}>
                <TemaDeMarca
                  marcaId={marcaId}
                  tema={tema}
                  onCambiar={(nuevo) => {
                    setTema(nuevo);
                    setGuardadoEn(null);
                  }}
                  editable={propietario}
                  tieneLogo={Boolean(logoUrl)}
                />
              </div>
              <div hidden={seccion !== "estilo"}>
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h2 className="font-semibold">{t("estilo.titulo")}</h2>
                  <p className="mb-4 mt-0.5 text-xs text-white/45">
                    {t("estilo.ayuda")}
                  </p>
                  <GaleriaEstilos
                    tema={temaValido(tema)}
                    valor={p.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
                    onElegir={(e) => e && cambiar({ estiloTexto: e })}
                    nombreMarca={activa.nombre}
                    deshabilitado={!opera}
                  />
                </section>
              </div>
              <div hidden={seccion !== "logo"}>
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{t("logo.titulo")}</h2>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={p.logoActivo}
                        onChange={(e) => cambiar({ logoActivo: e.target.checked })}
                        disabled={!opera}
                      />
                      {t("enLosClips")}
                    </label>
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-white/10 bg-[repeating-conic-gradient(#ffffff10_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca
                        <img src={logoUrl} alt={t("logo.alt")} className="max-h-full max-w-full" />
                      ) : (
                        <span className="text-xs text-white/40">{t("logo.sinLogo")}</span>
                      )}
                    </div>
                    {opera && (
                      <div>
                        <button
                          onClick={() => archivo.current?.click()}
                          disabled={subiendo}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-60"
                        >
                          {subiendo ? t("logo.subiendo") : logoUrl ? t("logo.cambiar") : t("logo.subir")}
                        </button>
                        <p className="mt-1 text-xs text-white/40">{t("logo.ayuda")}</p>
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

                  <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{t("logo.dondeVa")}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {POSICIONES_LOGO.map((x) => (
                      <button
                        key={x}
                        onClick={() => cambiar({ logoPosicion: x })}
                        disabled={!opera}
                        className={`rounded-lg border px-2 py-1.5 text-xs ${
                          p.logoPosicion === x ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"
                        }`}
                      >
                        {t(`posicionesLogo.${x}`)}
                      </button>
                    ))}
                  </div>

                  <Deslizador
                    etiqueta={t("logo.tamano")}
                    valor={p.logoTamano}
                    min={0.08}
                    max={0.4}
                    paso={0.01}
                    mostrar={(v) => t("logo.delAncho", { n: Math.round(v * 100) })}
                    onCambio={(v) => cambiar({ logoTamano: v })}
                    deshabilitado={!opera}
                  />
                  <Deslizador
                    etiqueta={t("logo.opacidad")}
                    valor={p.logoOpacidad}
                    min={0.2}
                    max={1}
                    paso={0.05}
                    mostrar={(v) => `${Math.round(v * 100)} %`}
                    onCambio={(v) => cambiar({ logoOpacidad: v })}
                    deshabilitado={!opera}
                  />
                </section>
              </div>
              <div hidden={seccion !== "llamada"}>
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{t("cta.titulo")}</h2>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={p.ctaActivo}
                        onChange={(e) => cambiar({ ctaActivo: e.target.checked })}
                        disabled={!opera}
                      />
                      {t("enLosClips")}
                    </label>
                  </div>
                  <input
                    value={p.ctaTexto}
                    onChange={(e) => cambiar({ ctaTexto: e.target.value.slice(0, 80) })}
                    placeholder={t("cta.ejemplo")}
                    disabled={!opera}
                    className="mt-4 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-ng-azul"
                  />
                  <p className="mt-1 text-right text-xs text-white/35">{p.ctaTexto.length}/80</p>
                  <Deslizador
                    etiqueta={t("cta.dura")}
                    valor={p.ctaSeg}
                    min={2}
                    max={8}
                    paso={0.5}
                    mostrar={(v) => t("cta.ultimos", { n: v.toLocaleString(locale) })}
                    onCambio={(v) => cambiar({ ctaSeg: v })}
                    deshabilitado={!opera}
                  />
                  <p className="mt-2 text-xs text-white/40">
                    {p.estiloTexto && p.estiloTexto !== "KARAOKE"
                      ? t("cta.conEstilo")
                      : t("cta.sinEstilo")}
                  </p>
                </section>
              </div>
              {/* Todas quedan montadas: cambiar de sección no pierde lo que se estaba editando. */}
              <div hidden={seccion !== "portada"}>
                <SeccionPortadaMarca marcaId={marcaId} opera={opera} tieneLogo={Boolean(logoUrl)} />
              </div>
              <div hidden={seccion !== "numeracion"}>
                <SeccionNumeracion marcaId={marcaId} opera={opera} />
              </div>

              {deClips && opera && (
                <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-ng-tinta/95 p-3 shadow-lg backdrop-blur">
                  <button
                    onClick={() => void enviar()}
                    disabled={guardando || guardandoTema || !sinGuardar}
                    className="rounded-lg bg-marca px-5 py-2 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-50"
                  >
                    {guardando || guardandoTema ? t("guardando") : t("guardar")}
                  </button>
                  {sinGuardar ? (
                    <span className="text-sm text-amber-300">{t("nav.sinGuardar")}</span>
                  ) : guardadoEn ? (
                    <span className="text-sm text-ng-teal">{t("guardado")}</span>
                  ) : (
                    <span className="text-xs text-white/40">{t("nav.seGuardanJuntas")}</span>
                  )}
                </div>
              )}
            </div>

            {deClips && (
              <VistaPrevia
                plantilla={p}
                logoUrl={logoUrl}
                colorGancho={estilo?.colorGancho ?? "#FFFFFF"}
                colorCaja={estilo?.colorContornoGancho ?? "#000000"}
                tema={temaValido(tema)}
                estiloTexto={p.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
                nombreMarca={activa.nombre}
              />

            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/** El menú de Brand Kit: a la izquierda en pantallas grandes, pestañas arriba en el teléfono. */
function MenuSecciones({
  actual,
  onElegir,
  sinGuardar,
}: {
  actual: IdSeccion;
  onElegir: (s: IdSeccion) => void;
  sinGuardar: boolean;
}) {
  const t = useTranslations("brandKit.nav");
  const grupos = ["clips", "publicar"] as const;
  const boton = (x: (typeof SECCIONES)[number], chico: boolean): ReactNode => {
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
        <span className="min-w-0 flex-1 truncate">{t(x.id)}</span>
        {sinGuardar && x.grupo === "clips" && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" title={t("sinGuardar")} />
        )}
      </button>
    );
  };
  return (
    <nav aria-label={t("titulo")} className="min-w-0">
      {/* Teléfono y tablet: una fila de pestañas que se desliza. */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:hidden">{SECCIONES.map((x) => boton(x, true))}</div>
      {/* Escritorio: el menú a la izquierda, fijo al bajar. */}
      <div className="sticky top-6 hidden space-y-5 lg:block">
        {grupos.map((g) => (
          <div key={g}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/35">{t(`grupos.${g}`)}</p>
            <div className="space-y-0.5">{SECCIONES.filter((x) => x.grupo === g).map((x) => boton(x, false))}</div>
          </div>
        ))}
      </div>
    </nav>
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
  const tr = useTranslations("brandKit");
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
      <p className="mb-2 text-sm font-medium">{tr("vista.titulo")}</p>
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
        {tr("vista.ayuda")}
        {plataforma && ` ${tr("vista.zonaSegura")}`}
      </p>
    </div>
  );
}
