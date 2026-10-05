"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { LogoNG } from "@/components/LogoNG";
import { TemaDeMarca, temaCompleto } from "@/components/estilos/TemaDeMarca";
import { GaleriaEstilos } from "@/components/estilos/GaleriaEstilos";
import { haySesion } from "@/lib/auth";
import { useMarcaActiva } from "@/lib/marca-activa";
import { ErrorDeSubida, uploadMarcaLogo } from "@/lib/upload";
import { URL_SITIO } from "@/lib/sitio";
import { ESTILO_TEXTO_POR_DEFECTO, temaValido, type EstiloTexto, type Tema } from "@/lib/estilos-texto";
import { PLANTILLA_POR_DEFECTO, type PlantillaClip } from "@/lib/plantilla-clip";
import {
  CREAR_MARCA,
  GUARDAR_PLANTILLA_CLIP,
  GUARDAR_TEMA_MARCA,
  MARCAS_ACTIVAS,
  MIS_ACCESOS,
  PLANTILLA_CLIP_MARCA,
} from "@/graphql/operations";

const PASOS = ["marca", "kit", "app"] as const;
type Paso = (typeof PASOS)[number];

/**
 * Lo primero después del registro: crear la marca (sin ella no hay espacio de
 * trabajo), y si quiere, armar el Brand Kit y llevarse la app. Los dos últimos
 * se saltan: se pueden hacer después desde el panel.
 *
 * No usa DashboardLayout: el layout manda acá a quien no tiene marca, y
 * usarlo crearía la vuelta.
 */
export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const { marcas, cargando, seleccionar } = useMarcaActiva();
  const [paso, setPaso] = useState<Paso>("marca");
  const [marca, setMarca] = useState<{ _id: string; nombre: string } | null>(null);
  const [listo, setListo] = useState(false);

  // Sin sesión, al login (y de vuelta acá). Con una marca ya creada (de antes,
  // no la de este onboarding), no hay nada que hacer acá.
  useEffect(() => {
    if (!haySesion()) {
      router.replace("/login?volverA=/onboarding");
      return;
    }
    setListo(true);
  }, [router]);
  // Se decide una sola vez, con la primera lista: la marca que se crea acá
  // también la llena, y eso no debe sacarlo del onboarding.
  const decidido = useRef(false);
  useEffect(() => {
    if (!listo || cargando || decidido.current) return;
    decidido.current = true;
    if (marcas.length > 0) router.replace("/panel");
  }, [listo, cargando, marcas.length, router]);

  const indice = PASOS.indexOf(paso);

  return (
    <main className="flex min-h-screen flex-col items-center bg-ng-hondo px-4 py-10">
      <Link href="/" aria-label={t("inicio")} className="mb-8">
        <LogoNG tamano={36} />
      </Link>

      {listo && (
        <div className="w-full max-w-xl">
          {/* Progreso: tres barras, la actual y las hechas en amarillo. */}
          <div className="mb-3 flex gap-2" aria-hidden>
            {PASOS.map((p, i) => (
              <span key={p} className={`h-1 flex-1 rounded-full ${i <= indice ? "bg-marca" : "bg-white/10"}`} />
            ))}
          </div>
          <p className="mb-6 text-xs text-white/40">{t("progreso", { n: indice + 1, total: PASOS.length })}</p>

          <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta/80 p-6 sm:p-8">
            {paso === "marca" && (
              <PasoMarca
                onCreada={(m) => {
                  setMarca(m);
                  seleccionar(m._id);
                  setPaso("kit");
                }}
              />
            )}
            {paso === "kit" && marca && <PasoKit marca={marca} onSeguir={() => setPaso("app")} />}
            {paso === "app" && <PasoApp onTerminar={() => router.push("/panel")} />}
          </div>
        </div>
      )}
    </main>
  );
}

const campo =
  "w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul";
const botonPrincipal =
  "rounded-ng-md bg-marca px-5 py-2.5 text-sm font-semibold text-ng-tinta brillo-marca transition hover:brightness-110 disabled:opacity-50";
const botonSaltar = "text-sm text-white/50 hover:text-white";

/** Paso 1: el nombre de la marca. Obligatorio: es el espacio de trabajo. */
function PasoMarca({ onCreada }: { onCreada: (m: { _id: string; nombre: string }) => void }) {
  const t = useTranslations("onboarding");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Se esperan las marcas y los accesos nuevos antes de seguir: con la lista
  // vieja, el panel creería que sigue sin marca y volvería a mandar acá.
  const [crear, { loading }] = useMutation(CREAR_MARCA, {
    refetchQueries: [{ query: MARCAS_ACTIVAS }, { query: MIS_ACCESOS }],
    awaitRefetchQueries: true,
  });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await crear({ variables: { nombre: nombre.trim() } });
      const m = r.data?.crearMarca;
      if (!m) throw new Error(t("marca.error"));
      onCreada({ _id: m._id, nombre: m.nombre });
    } catch (err) {
      // Los errores del backend (ya tenés una marca de prueba) llegan traducidos.
      setError(err instanceof Error ? err.message : t("marca.error"));
    }
  }

  return (
    <form onSubmit={enviar}>
      <h1 className="text-2xl font-bold tracking-tight">{t("marca.titulo")}</h1>
      <p className="mt-1 text-sm text-ng-secundario">{t("marca.subtitulo")}</p>
      <label className="mb-1 mt-6 block text-xs text-white/50">{t("marca.nombre")}</label>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value.slice(0, 60))}
        placeholder={t("marca.ejemplo")}
        autoFocus
        required
        className={campo}
      />
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={loading || !nombre.trim()} className={botonPrincipal}>
          {loading ? t("marca.creando") : t("marca.crear")}
        </button>
      </div>
    </form>
  );
}

/**
 * Paso 2: el Brand Kit, en corto: logo, colores y estilo de texto. Guarda con
 * las mismas mutaciones que /admin/plantilla, que es donde se termina de
 * ajustar (posición del logo, llamada a la acción). Quien crea la marca es su
 * propietario, así que puede guardar el tema.
 */
function PasoKit({ marca, onSeguir }: { marca: { _id: string; nombre: string }; onSeguir: () => void }) {
  const t = useTranslations("onboarding");
  const tSubida = useTranslations("erroresSubida");
  const marcaId = marca._id;
  const q = useQuery(PLANTILLA_CLIP_MARCA, { variables: { marcaId } });
  const estilo = q.data?.estiloClipMarca;
  const [guardarTema] = useMutation(GUARDAR_TEMA_MARCA);
  const [guardarPlantilla] = useMutation(GUARDAR_PLANTILLA_CLIP);

  const [tema, setTema] = useState<Tema | null>(null);
  const [estiloTexto, setEstiloTexto] = useState<EstiloTexto>(ESTILO_TEXTO_POR_DEFECTO);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  // Arranca de lo que trae la marca recién creada (el tema por defecto).
  useEffect(() => {
    if (!estilo || tema) return;
    setTema(temaValido(estilo.tema));
    setEstiloTexto(estilo.plantilla?.estiloTexto ?? estilo.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO);
    setLogoUrl(estilo.logoUrl ?? null);
  }, [estilo, tema]);

  async function subirLogo(f: File) {
    setSubiendo(true);
    setError(null);
    try {
      setLogoUrl(await uploadMarcaLogo(f, marcaId));
    } catch (e) {
      setError(e instanceof ErrorDeSubida ? tSubida(e.clave, e.datos) : e instanceof Error ? e.message : t("kit.errorLogo"));
    } finally {
      setSubiendo(false);
    }
  }

  async function guardar() {
    if (!tema) return;
    if (!temaCompleto(tema)) {
      setError(t("kit.errorTema"));
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await guardarTema({ variables: { marcaId, tema } });
      const { __typename: _, ...guardada } = estilo?.plantilla ?? { __typename: null };
      const base: PlantillaClip = estilo?.plantilla ? (guardada as PlantillaClip) : PLANTILLA_POR_DEFECTO;
      await guardarPlantilla({
        variables: { marcaId, plantilla: { ...base, logoActivo: Boolean(logoUrl), estiloTexto } },
      });
      onSeguir();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("kit.errorGuardar"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("kit.titulo")}</h1>
      <p className="mt-1 text-sm text-ng-secundario">{t("kit.subtitulo", { marca: marca.nombre })}</p>

      {!tema ? (
        <p className="mt-6 text-sm text-white/50">{t("kit.cargando")}</p>
      ) : (
        <div className="mt-6 space-y-5">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">{t("kit.logo")}</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-white/10 bg-[repeating-conic-gradient(#ffffff10_0_25%,transparent_0_50%)] bg-[length:16px_16px] p-2">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- el logo viene del CDN de la marca
                  <img src={logoUrl} alt={t("kit.logoAlt")} className="max-h-full max-w-full" />
                ) : (
                  <span className="text-xs text-white/40">{t("kit.sinLogo")}</span>
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => archivo.current?.click()}
                  disabled={subiendo}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-60"
                >
                  {subiendo ? t("kit.subiendo") : logoUrl ? t("kit.cambiarLogo") : t("kit.subirLogo")}
                </button>
                <p className="mt-1 text-xs text-white/40">{t("kit.ayudaLogo")}</p>
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
            </div>
          </section>

          <TemaDeMarca marcaId={marcaId} tema={tema} onCambiar={setTema} editable tieneLogo={Boolean(logoUrl)} />

          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">{t("kit.estilo")}</h2>
            <p className="mb-4 mt-0.5 text-xs text-white/45">{t("kit.ayudaEstilo")}</p>
            <GaleriaEstilos
              tema={temaValido(tema)}
              valor={estiloTexto}
              onElegir={(e) => e && setEstiloTexto(e)}
              nombreMarca={marca.nombre}
              compacta
            />
          </section>
        </div>
      )}

      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onSeguir} className={botonSaltar}>
          {t("saltar")}
        </button>
        <button type="button" onClick={() => void guardar()} disabled={!tema || guardando || subiendo} className={botonPrincipal}>
          {guardando ? t("kit.guardando") : t("kit.guardar")}
        </button>
      </div>
    </div>
  );
}

/** Paso 3: la app, con un QR a /app (que manda a la tienda que corresponda). */
function PasoApp({ onTerminar }: { onTerminar: () => void }) {
  const t = useTranslations("onboarding");
  const url = `${URL_SITIO}/app`;
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0A0A0A", light: "#FFFFFF" } })
      .then((s) => vivo && setSvg(s))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [url]);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("app.titulo")}</h1>
      <p className="mt-1 text-sm text-ng-secundario">{t("app.subtitulo")}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <div
          role="img"
          aria-label={t("app.qrAlt")}
          className="h-48 w-48 overflow-hidden rounded-ng-md bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
        />
        <p className="text-xs text-white/40">
          {t.rich("app.desdeElTelefono", {
            link: (c) => (
              <a href={url} className="text-ng-celeste hover:underline">
                {c}
              </a>
            ),
          })}
        </p>
      </div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={onTerminar} className={botonSaltar}>
          {t("saltar")}
        </button>
        <button type="button" onClick={onTerminar} className={botonPrincipal}>
          {t("app.irAlPanel")}
        </button>
      </div>
    </div>
  );
}
