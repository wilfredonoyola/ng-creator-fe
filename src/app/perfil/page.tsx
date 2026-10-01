"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLazyQuery, useMutation } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { cerrarSesion } from "@/lib/auth";
import { ESTILO_ROL, useSesion } from "@/lib/sesion";
import { useMarcaActiva } from "@/lib/marca-activa";
import { CONTACTO } from "@/lib/legal";
import { ELIMINAR_MI_CUENTA, RESUMEN_ELIMINAR_CUENTA } from "@/graphql/operations";

/** Lo que hay que escribir para confirmar. El backend exige el mismo texto. */
const PALABRA = "ELIMINAR";

interface MarcaAlEliminar {
  marcaId: string;
  nombre: string;
  otrosMiembros: number;
}

/**
 * La cuenta de quien está en sesión: sus datos, sus marcas y la opción de
 * eliminarla (ng-creator-be#95).
 *
 * Eliminar la cuenta desde la app es requisito de Apple (App Review 5.1.1(v)),
 * y por la regla de app y web con la misma funcionalidad está también acá.
 */
export default function PerfilPage() {
  const router = useRouter();
  const { usuario, accesos, esAdmin } = useSesion();
  const { marcas } = useMarcaActiva();
  const [eliminando, setEliminando] = useState(false);

  const nombreDe = (marcaId: string) => marcas.find((m) => m._id === marcaId)?.nombre ?? "Marca";

  async function salir() {
    await cerrarSesion();
    router.push("/login");
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="mt-1 text-white/50">Tu cuenta en NG Creator.</p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="font-semibold">Tus datos</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-white/40">Nombre</dt>
              <dd>{usuario?.nombre || "Sin nombre"}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/40">Correo</dt>
              <dd className="break-all">{usuario?.email ?? "…"}</dd>
            </div>
            {esAdmin && (
              <div>
                <dt className="text-xs text-white/40">Rol en el sistema</dt>
                <dd>Administrador</dd>
              </div>
            )}
          </dl>

          {accesos.length > 0 && (
            <>
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">Tus marcas</p>
              <ul className="mt-2 space-y-2">
                {accesos.map((a) => (
                  <li key={a.marcaId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{nombreDe(a.marcaId)}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${ESTILO_ROL[a.rol].clase}`}>
                      {ESTILO_ROL[a.rol].etiqueta}
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
            Cerrar sesión
          </button>
        </section>

        {/* Zona de peligro: separada y al final, para que no se toque por error. */}
        <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="font-semibold text-red-400">Zona de peligro</h2>
          <p className="mt-2 text-sm text-white/60">
            Eliminar tu cuenta borra tu usuario y tu acceso a todas las marcas. No se puede deshacer.
          </p>
          <button
            onClick={() => setEliminando(true)}
            className="mt-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/25"
          >
            Eliminar mi cuenta
          </button>
        </section>
      </div>

      {eliminando && <EliminarCuenta onCerrar={() => setEliminando(false)} />}
    </DashboardLayout>
  );
}

/**
 * El paso de confirmación. Antes de dejar eliminar, pregunta al backend qué
 * marcas se archivan con la cuenta y cuáles la frenan: si la persona es la
 * única propietaria de una marca con más gente, primero tiene que hacer
 * propietaria a otra en Equipo, y el botón queda deshabilitado.
 */
function EliminarCuenta({ onCerrar }: { onCerrar: () => void }) {
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
      setError(err instanceof Error ? err.message : "No se pudo eliminar la cuenta");
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
          Eliminar mi cuenta
        </h2>

        {loading || (!resumen && !errorResumen) ? (
          <p className="mt-4 text-sm text-white/50">Revisando tus marcas…</p>
        ) : errorResumen ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">No pudimos revisar tus marcas: {errorResumen.message}</p>
          </div>
        ) : (
          <form onSubmit={confirmar}>
            <div className="mt-3 space-y-3 text-sm text-white/70">
              <p>
                Vas a eliminar la cuenta <strong className="break-all text-white">{resumen?.email}</strong>. Esto
                no se puede deshacer:
              </p>
              <ul className="ml-5 list-disc space-y-1.5">
                <li>se borran tu usuario y tu acceso a todas las marcas;</li>
                <li>
                  las marcas de las que sos el único miembro se archivan: se desconectan sus redes y se cancelan sus
                  publicaciones programadas;
                </li>
                <li>en el historial de las marcas, tu nombre pasa a «Cuenta eliminada».</li>
              </ul>
              <p className="text-white/50">
                El contenido de las marcas archivadas queda guardado y se puede recuperar pidiéndolo a{" "}
                <a href={`mailto:${CONTACTO}`} className="text-ng-celeste hover:underline">
                  {CONTACTO}
                </a>{" "}
                por 30 días.
              </p>
            </div>

            {archivan.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-white/50">Se archivan</p>
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
                <p className="text-sm text-amber-300">
                  Sos el único propietario de {bloquean.length === 1 ? "esta marca" : "estas marcas"}, y hay más
                  gente en {bloquean.length === 1 ? "ella" : "ellas"}. Antes de eliminar tu cuenta, hacé propietaria
                  a otra persona en Equipo.
                </p>
                <ul className="mt-3 space-y-1.5">
                  {bloquean.map((m) => (
                    <li key={m.marcaId} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {m.nombre}{" "}
                        <span className="text-white/40">
                          · {m.otrosMiembros} {m.otrosMiembros === 1 ? "persona más" : "personas más"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => irAEquipo(m.marcaId)}
                        className="shrink-0 text-ng-celeste hover:underline"
                      >
                        Ir a Equipo
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="mt-5 block text-xs text-white/50">
              Para confirmar, escribí <strong className="text-white">{PALABRA}</strong>
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
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!puede}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {eliminando ? "Eliminando…" : "Eliminar mi cuenta"}
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
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
