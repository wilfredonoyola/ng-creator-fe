"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NOMBRE_MAX, nombreValido, useGuardarMiNombre } from "@/lib/nombre";
import { SelectorIdioma } from "@/components/SelectorIdioma";
import { cerrarSesion } from "@/lib/auth";
import { ESTILO_ROL, useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marca-activa";
import { CONTACTO } from "@/lib/legal";
import {
  ELIMINAR_MI_CUENTA,
  GUARDAR_PREFERENCIA_NOTIFICACION,
  PREFERENCIAS_NOTIFICACION,
  RESUMEN_ELIMINAR_CUENTA,
} from "@/graphql/operations";
import {
  TIPOS_NOTIFICACION,
  type PreferenciaNotificacion,
  type TipoNotificacion,
} from "@/lib/notificaciones";

/** Lo que hay que escribir para confirmar. El backend exige el mismo texto. */
const PALABRA = "ELIMINAR";

interface MarcaAlEliminar {
  marcaId: string;
  nombre: string;
  otrosMiembros: number;
}

/**
 * La cuenta de quien está en sesión: sus datos, sus marcas, qué avisos recibe
 * (ng-creator-be#134) y la opción de eliminarla (ng-creator-be#95).
 *
 * Eliminar la cuenta desde la app es requisito de Apple (App Review 5.1.1(v)),
 * y por la regla de app y web con la misma funcionalidad está también acá.
 */
export default function PerfilPage() {
  const t = useTranslations("perfil");
  const tRol = useTranslations("marcoRoles");
  const router = useRouter();
  const { usuario, accesos, esAdmin } = useSesion();
  const { marcas } = useMarcaActiva();
  const [eliminando, setEliminando] = useState(false);

  const nombreDe = (marcaId: string) => marcas.find((m) => m._id === marcaId)?.nombre ?? t("marca");

  async function salir() {
    await cerrarSesion();
    router.push("/login");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("titulo")}</h1>
          <p className="mt-1 text-white/50">{t("subtitulo")}</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">{t("datos.titulo")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-white/40">{t("datos.nombre")}</dt>
              <dd>
                <EditarNombre actual={usuario?.nombre ?? ""} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-white/40">{t("datos.correo")}</dt>
              <dd className="break-all">{usuario?.email ?? "…"}</dd>
            </div>
            {esAdmin && (
              <div>
                <dt className="text-xs text-white/40">{t("datos.rolSistema")}</dt>
                <dd>{t("datos.administrador")}</dd>
              </div>
            )}
          </dl>

          {accesos.length > 0 && (
            <>
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{t("datos.tusMarcas")}</p>
              <ul className="mt-2 space-y-2">
                {accesos.map((a) => (
                  <li key={a.marcaId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{nombreDe(a.marcaId)}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${ESTILO_ROL[a.rol].clase}`}>
                      {tRol(`${a.rol}.etiqueta`)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <button
            onClick={salir}
            className="mt-6 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5"
          >
            {t("cerrarSesion")}
          </button>
        </section>

        {/* Lo que la persona elige para sí: el idioma y, abajo, qué avisos recibe. */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">{t("preferencias")}</h2>
          <div className="mt-4">
            <SelectorIdioma />
          </div>
        </section>

        <PreferenciasDeAvisos />

        {/* Zona de peligro: separada y al final, para que no se toque por error. */}
        <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="font-semibold text-red-400">{t("peligro.titulo")}</h2>
          <p className="mt-2 text-sm text-white/60">{t("peligro.detalle")}</p>
          <button
            onClick={() => setEliminando(true)}
            className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/25"
          >
            {t("peligro.boton")}
          </button>
        </section>
      </div>

      {eliminando && <EliminarCuenta onCerrar={() => setEliminando(false)} />}
    </DashboardLayout>
  );
}

/**
 * El nombre con que la ve su equipo en avisos, autoría y Equipo. Se muestra y,
 * al tocar «Cambiar», se edita en el lugar.
 */
function EditarNombre({ actual }: { actual: string }) {
  const t = useTranslations("perfil.datos");
  const { guardar, guardando } = useGuardarMiNombre();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(actual);
  const [error, setError] = useState<string | null>(null);

  function abrir() {
    setValor(actual);
    setError(null);
    setEditando(true);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombreValido(valor)) return;
    setError(null);
    const err = await guardar(valor);
    if (err === null) setEditando(false);
    else setError(err || t("errorNombre"));
  }

  if (!editando) {
    return (
      <span className="flex items-center gap-3">
        <span className={actual ? "" : "text-white/40"}>{actual || t("sinNombre")}</span>
        <button type="button" onClick={abrir} className="text-xs text-ng-celeste hover:underline">
          {actual ? t("cambiarNombre") : t("ponerNombre")}
        </button>
      </span>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-1">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-label={t("nombre")}
          autoComplete="name"
          maxLength={NOMBRE_MAX}
          autoFocus
          className="min-w-0 flex-1 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={guardando}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
          >
            {t("cancelar")}
          </button>
          <button
            type="submit"
            disabled={!nombreValido(valor) || guardando}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
          >
            {guardando ? t("guardando") : t("guardar")}
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-white/35">{t("ayudaNombre")}</p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </form>
  );
}

/**
 * El paso de confirmación. Antes de dejar eliminar, pregunta al backend qué
 * marcas se archivan con la cuenta y cuáles la frenan: si la persona es la
 * única propietaria de una marca con más gente, primero tiene que hacer
 * propietaria a otra en Equipo, y el botón queda deshabilitado.
 */
function EliminarCuenta({ onCerrar }: { onCerrar: () => void }) {
  const t = useTranslations("perfil.eliminar");
  const router = useRouter();
  const { seleccionar } = useMarcaActiva();
  const [pedirResumen, { data, loading, error: errorResumen }] = useLazyQuery(RESUMEN_ELIMINAR_CUENTA, {
    // Siempre fresco: lo que bloquea cambia apenas se reparte la propiedad.
    fetchPolicy: "network-only",
  });
  const [eliminar, { loading: eliminando }] = useMutation(ELIMINAR_MI_CUENTA);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pedirResumen();
  }, [pedirResumen]);

  // Escape cierra, salvo mientras se está eliminando.
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !eliminando) onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [eliminando, onCerrar]);

  const resumen = data?.resumenEliminarCuenta as
    | { email: string; marcasQueSeArchivan: MarcaAlEliminar[]; marcasQueBloquean: MarcaAlEliminar[] }
    | undefined;
  const archivan = resumen?.marcasQueSeArchivan ?? [];
  const bloquean = resumen?.marcasQueBloquean ?? [];
  const puede = !!resumen && bloquean.length === 0 && texto.trim() === PALABRA && !eliminando;

  function irAEquipo(marcaId: string) {
    seleccionar(marcaId);
    router.push("/admin/equipo");
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!puede) return;
    setError(null);
    try {
      await eliminar({ variables: { confirmacion: PALABRA } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
      return;
    }
    // La cuenta ya no existe: el logout contra Cognito puede fallar, pero
    // cerrarSesion igual limpia los tokens y la caché de este navegador.
    await cerrarSesion();
    router.push("/login?aviso=cuenta-eliminada");
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      onClick={() => !eliminando && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-eliminar-cuenta"
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-ng-fondo p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="titulo-eliminar-cuenta" className="text-lg font-semibold">
          {t("titulo")}
        </h2>

        {loading || (!resumen && !errorResumen) ? (
          <p className="mt-4 text-sm text-white/50">{t("revisando")}</p>
        ) : errorResumen ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{t("errorRevisar", { error: errorResumen.message })}</p>
          </div>
        ) : (
          <form onSubmit={confirmar}>
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <p>
                {t.rich("vasAEliminar", {
                  email: resumen?.email ?? "",
                  strong: (c) => <strong className="break-all text-white">{c}</strong>,
                })}
              </p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>{t("consecuencias.acceso")}</li>
                <li>{t("consecuencias.archivan")}</li>
                <li>{t("consecuencias.historial")}</li>
              </ul>
              <p className="text-white/50">
                {t.rich("recuperar", {
                  contacto: CONTACTO,
                  link: (c) => (
                    <a href={`mailto:${CONTACTO}`} className="text-ng-celeste hover:underline">
                      {c}
                    </a>
                  ),
                })}
              </p>
            </div>

            {archivan.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">{t("seArchivan")}</p>
                <ul className="mt-2 space-y-1.5">
                  {archivan.map((m) => (
                    <li key={m.marcaId} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      {m.nombre}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bloquean.length > 0 && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-amber-300">{t("bloquean", { n: bloquean.length })}</p>
                <ul className="mt-3 space-y-1.5">
                  {bloquean.map((m) => (
                    <li key={m.marcaId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {m.nombre}{" "}
                        <span className="text-white/40">
                          · {t("personasMas", { n: m.otrosMiembros })}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => irAEquipo(m.marcaId)}
                        className="shrink-0 text-ng-celeste hover:underline"
                      >
                        {t("irAEquipo")}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="mt-5 block text-xs text-white/50">
              {t.rich("paraConfirmar", {
                palabra: PALABRA,
                strong: (c) => <strong className="text-white">{c}</strong>,
              })}
            </label>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={bloquean.length > 0 || eliminando}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="mt-1 w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2.5 text-sm outline-none transition focus:border-red-500/60 disabled:opacity-50"
            />

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCerrar}
                disabled={eliminando}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                {t("cancelar")}
              </button>
              <button
                type="submit"
                disabled={!puede}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {eliminando ? t("eliminando") : t("boton")}
              </button>
            </div>
          </form>
        )}

        {errorResumen && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={onCerrar}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:bg-white/5"
            >
              {t("cerrar")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Por dónde puede llegar un aviso: las columnas de la tabla. */
const CANALES: ("enApp" | "push" | "correo")[] = ["enApp", "push", "correo"];

/**
 * Qué avisos le llegan a esta persona y por dónde. Son de la cuenta, no de la
 * marca: valen para todas las marcas en las que está.
 *
 * Cada interruptor se guarda al tocarlo, sin botón de guardar. La respuesta
 * optimista lo deja cambiado al instante; si el servidor dice que no, Apollo
 * lo vuelve atrás solo.
 */
function PreferenciasDeAvisos() {
  const t = useTranslations("perfil.avisos");
  const tTipo = useTranslations("marcoNotificaciones");
  const { data, loading, error } = useQuery(PREFERENCIAS_NOTIFICACION, { errorPolicy: "all" });
  const [guardar] = useMutation(GUARDAR_PREFERENCIA_NOTIFICACION);
  const [errorAlGuardar, setErrorAlGuardar] = useState<string | null>(null);
  const prefs: PreferenciaNotificacion[] = data?.preferenciasNotificacion ?? [];

  async function cambiar(tipo: TipoNotificacion, campo: "enApp" | "push" | "correo", valor: boolean) {
    setErrorAlGuardar(null);
    // Las preferencias no tienen id: la caché no las une sola con la consulta,
    // así que la lista que devuelve la mutación se escribe a mano.
    const nuevas = prefs.map((p) => (p.tipo === tipo ? { ...p, [campo]: valor } : p));
    try {
      await guardar({
        variables: { input: { tipo, [campo]: valor } },
        optimisticResponse: {
          guardarPreferenciaNotificacion: nuevas.map((p) => ({ __typename: "PreferenciaNotificacion", ...p })),
        },
        update(cache, { data: respuesta }) {
          if (!respuesta?.guardarPreferenciaNotificacion) return;
          cache.writeQuery({
            query: PREFERENCIAS_NOTIFICACION,
            data: { preferenciasNotificacion: respuesta.guardarPreferenciaNotificacion },
          });
        },
      });
    } catch (err) {
      setErrorAlGuardar(err instanceof Error ? err.message : t("errorGuardar"));
    }
  }

  return (
    <section id="notificaciones" className="mt-8 scroll-mt-20 rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-semibold">{t("titulo")}</h2>
      <p className="mt-1 text-sm text-white/50">{t("detalle")}</p>

      {loading && !prefs.length ? (
        <p className="mt-4 text-sm text-white/50">{t("cargando")}</p>
      ) : error && !prefs.length ? (
        <p className="mt-4 text-sm text-red-400">{t("errorTraer", { error: error.message })}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-white/50">
                <th className="pb-2 text-left font-medium">
                  <span className="sr-only">{t("aviso")}</span>
                </th>
                {CANALES.map((c) => (
                  <th key={c} scope="col" className="w-16 px-1 pb-2 text-center font-medium sm:w-28">
                    {t(`canales.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TIPOS_NOTIFICACION.map((tipo) => {
                const p = prefs.find((x) => x.tipo === tipo);
                if (!p) return null;
                const etiqueta = tTipo(tipo);
                return (
                  <tr key={tipo}>
                    <th scope="row" className="py-3 pr-2 text-left font-normal">
                      {etiqueta}
                    </th>
                    {CANALES.map((c) => (
                      <td key={c} className="px-1 py-3 text-center">
                        <Interruptor
                          encendido={p[c]}
                          etiqueta={t("interruptor", { aviso: etiqueta, canal: t(`canales.${c}`).toLowerCase() })}
                          onCambiar={(v) => cambiar(tipo, c, v)}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-white/40">{t("telefono")}</p>

      {errorAlGuardar && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{t("errorGuardarDetalle", { error: errorAlGuardar })}</p>
        </div>
      )}
    </section>
  );
}

/** Un interruptor de encendido y apagado. Encendido lleva el degradado de la marca. */
function Interruptor({
  encendido,
  etiqueta,
  onCambiar,
}: {
  encendido: boolean;
  etiqueta: string;
  onCambiar: (valor: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={() => onCambiar(!encendido)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        encendido ? "bg-marca" : "bg-white/15"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          encendido ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
