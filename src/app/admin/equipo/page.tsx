"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/DashboardLayout";
import { colorDeMarca, useMarcaActiva } from "@/lib/marca-activa";
import { ESTILO_ROL, RolPagina, useSesion } from "@/lib/sesion";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";
import {
  CAMBIAR_ROL_MIEMBRO,
  CANCELAR_INVITACION,
  INVITACIONES_DE_PAGINA,
  INVITAR_MIEMBRO,
  MIEMBROS_DE_PAGINA,
  REVOCAR_ACCESO,
} from "@/graphql/operations";

interface Miembro {
  usuarioId: string;
  marcaId: string;
  rol: RolPagina;
  email: string;
  nombre?: string | null;
  activo: boolean;
  ultimoAccesoEn?: string | null;
  desde: string;
}

interface Invitacion {
  _id: string;
  email: string;
  rol: RolPagina;
  createdAt: string;
}

const ROLES: RolPagina[] = ["PROPIETARIO", "EDITOR", "LECTOR", "PROVEEDOR"];

/**
 * Quién trabaja en esta marca y con qué rol.
 *
 * Es por marca y no del sistema entero a propósito: cada marca es un espacio
 * de trabajo aparte, y quien conectó sus cuentas es quien decide quién más
 * entra. Un administrador del sistema no aparece acá por serlo. El rol vale
 * para todas las cuentas de la marca.
 */
export default function EquipoPage() {
  const t = useTranslations("equipo");
  const locale = useLocale();
  const { activa, cargando: cargandoPagina } = useMarcaActiva();
  const { usuario, esPropietario } = useSesion();
  const marcaId = activa?._id;
  const mando = esPropietario(marcaId);

  const [error, setError] = useState<string | null>(null);

  const { data: miembrosData, loading: cargandoMiembros } = useQuery(
    MIEMBROS_DE_PAGINA,
    { variables: { marcaId }, skip: !marcaId, errorPolicy: "all" },
  );

  const { data: invitacionesData } = useQuery(INVITACIONES_DE_PAGINA, {
    variables: { marcaId },
    // Solo el propietario puede verlas; pedirlas sin serlo da un 403 inútil.
    skip: !marcaId || !mando,
    errorPolicy: "all",
  });

  const refrescar = [
    { query: MIEMBROS_DE_PAGINA, variables: { marcaId } },
    { query: INVITACIONES_DE_PAGINA, variables: { marcaId } },
  ];

  const [invitar, { loading: invitando }] = useMutation(INVITAR_MIEMBRO, {
    refetchQueries: refrescar,
  });
  const [cambiarRol] = useMutation(CAMBIAR_ROL_MIEMBRO, {
    refetchQueries: refrescar,
  });
  const [revocar] = useMutation(REVOCAR_ACCESO, { refetchQueries: refrescar });
  const [cancelar] = useMutation(CANCELAR_INVITACION, {
    refetchQueries: refrescar,
  });

  const miembros: Miembro[] = miembrosData?.miembrosDePagina ?? [];
  const invitaciones: Invitacion[] =
    invitacionesData?.invitacionesDePagina ?? [];

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? t("errorOperacion"));
    }
  }

  if (!cargandoPagina && !activa) {
    return (
      <DashboardLayout>
        <EstadoVacio
          icono="🔗"
          titulo={t("sinPagina.titulo")}
          detalle={t("sinPagina.detalle")}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-white/50">
          <span>{t("quienTrabaja")}</span>
          {activa && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-sm text-white/80">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorDeMarca(activa) }}
              />
              {activa.nombre}
            </span>
          )}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-white/35">{t("explicacion")}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {mando ? (
        <FormularioInvitar
          invitando={invitando}
          onInvitar={(email, rol) =>
            accion(() => invitar({ variables: { email, marcaId, rol } }))
          }
        />
      ) : (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-sm text-white/60">{t("soloMirar")}</p>
        </div>
      )}

      {/* Invitaciones que todavía no entraron */}
      {invitaciones.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
            {t("invitados")}
          </h2>
          <div className="space-y-2">
            {invitaciones.map((inv) => (
              <div
                key={inv._id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-white/15 bg-black/20 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 text-sm text-white/40">
                  ✉
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white/80">{inv.email}</p>
                  <p
                    className="text-xs text-white/35"
                    title={fechaCompleta(inv.createdAt, locale)}
                  >
                    {t("invitadoHace", { cuando: tiempoRelativo(inv.createdAt, Date.now(), locale) })}
                  </p>
                </div>
                <ChipRol rol={inv.rol} />
                <button
                  onClick={() =>
                    accion(() =>
                      cancelar({ variables: { id: inv._id, marcaId } }),
                    )
                  }
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-red-500/40 hover:text-red-400"
                >
                  {t("cancelar")}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quienes ya tienen acceso */}
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
          {t("conAcceso", { n: miembros.length })}
        </h2>

        {cargandoMiembros ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        ) : miembros.length === 0 ? (
          <EstadoVacio
            icono="👥"
            titulo={t("vacio.titulo")}
            detalle={t("vacio.detalle")}
          />
        ) : (
          <div className="space-y-2">
            {miembros.map((m) => (
              <FilaMiembro
                key={m.usuarioId}
                miembro={m}
                soyYo={m.usuarioId === usuario?._id}
                editable={mando}
                onCambiarRol={(rol) =>
                  accion(() =>
                    cambiarRol({
                      variables: { usuarioId: m.usuarioId, marcaId, rol },
                    }),
                  )
                }
                onRevocar={() =>
                  accion(() =>
                    revocar({ variables: { usuarioId: m.usuarioId, marcaId } }),
                  )
                }
              />
            ))}
          </div>
        )}
      </section>

      <LeyendaDeRoles />
    </DashboardLayout>
  );
}

/** Alta por correo. Es todo lo que hace falta para sumar a alguien. */
function FormularioInvitar({
  invitando,
  onInvitar,
}: {
  invitando: boolean;
  onInvitar: (email: string, rol: RolPagina) => Promise<void>;
}) {
  const t = useTranslations("equipo.invitar");
  const tRol = useTranslations("marcoRoles");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<RolPagina>("EDITOR");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    await onInvitar(email.trim(), rol);
    setEmail("");
  }

  return (
    <form
      onSubmit={enviar}
      className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5"
    >
      <h2 className="font-semibold">{t("titulo")}</h2>
      <p className="mt-1 text-sm text-white/45">{t("detalle")}</p>

      {/* En móvil los tres controles van apilados: el correo necesita el ancho
          completo para verse entero mientras se escribe. */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("placeholder")}
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul/50"
        />
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value as RolPagina)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm outline-none transition focus:border-ng-azul/50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="bg-[#111]">
              {tRol(`${r}.etiqueta`)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!email.trim() || invitando}
          className="rounded-lg bg-marca px-5 py-2.5 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
        >
          {invitando ? t("enviando") : t("boton")}
        </button>
      </div>

      <p className="mt-2 text-xs text-white/35">{tRol(`${rol}.ayuda`)}</p>
    </form>
  );
}

function FilaMiembro({
  miembro,
  soyYo,
  editable,
  onCambiarRol,
  onRevocar,
}: {
  miembro: Miembro;
  soyYo: boolean;
  editable: boolean;
  onCambiarRol: (rol: RolPagina) => void;
  onRevocar: () => void;
}) {
  const t = useTranslations("equipo");
  const tRol = useTranslations("marcoRoles");
  const locale = useLocale();
  const [confirmando, setConfirmando] = useState(false);

  // Quitarse a uno mismo no tiene vuelta desde la interfaz: habría que pedirle
  // a otro propietario que te devuelva el acceso. El backend también lo impide.
  const puedeEditarse = editable && !soyYo;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
        {(miembro.nombre || miembro.email)[0]?.toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium">
          {miembro.nombre || miembro.email}
          {soyYo && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-normal text-white/50">
              {t("vos")}
            </span>
          )}
          {!miembro.activo && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-normal text-red-400">
              {t("desactivado")}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-white/40">{miembro.email}</p>
        <p className="truncate text-[11px] text-white/25">
          {miembro.ultimoAccesoEn ? (
            <span title={fechaCompleta(miembro.ultimoAccesoEn, locale)}>
              {t("ultimoIngreso", { cuando: tiempoRelativo(miembro.ultimoAccesoEn, Date.now(), locale) })}
            </span>
          ) : (
            t("sinIngresos")
          )}
        </p>
      </div>

      {puedeEditarse ? (
        <select
          value={miembro.rol}
          onChange={(e) => onCambiarRol(e.target.value as RolPagina)}
          title={tRol(`${miembro.rol}.ayuda`)}
          className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-xs outline-none transition focus:border-ng-azul/50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r} className="bg-[#111]">
              {tRol(`${r}.etiqueta`)}
            </option>
          ))}
        </select>
      ) : (
        <ChipRol rol={miembro.rol} />
      )}

      {puedeEditarse &&
        (confirmando ? (
          <span className="flex items-center gap-1.5">
            <button
              onClick={onRevocar}
              className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/25"
            >
              {t("quitar")}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-white/40 transition hover:text-white/70"
            >
              {t("no")}
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            title={t("quitarTitulo")}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-red-500/40 hover:text-red-400"
          >
            {t("quitar")}
          </button>
        ))}
    </div>
  );
}

function ChipRol({ rol }: { rol: RolPagina }) {
  const tRol = useTranslations("marcoRoles");
  return (
    <span
      title={tRol(`${rol}.ayuda`)}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${ESTILO_ROL[rol].clase}`}
    >
      {tRol(`${rol}.etiqueta`)}
    </span>
  );
}

/**
 * Qué puede hacer cada rol, a la vista.
 *
 * Los nombres solos no alcanzan: la diferencia entre editor y propietario es
 * justamente lo que evita que dos personas se pisen la configuración de Meta,
 * y conviene que se lea antes de repartir accesos.
 */
function LeyendaDeRoles() {
  const t = useTranslations("equipo.leyenda");
  const tRol = useTranslations("marcoRoles");
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold text-white/70">{t("titulo")}</h2>
      <dl className="mt-3 space-y-3">
        {ROLES.map((r) => (
          <div key={r} className="flex flex-wrap items-start gap-3">
            <dt className="shrink-0">
              <ChipRol rol={r} />
            </dt>
            <dd className="min-w-[12rem] flex-1 text-sm text-white/45">
              {tRol(`${r}.ayuda`)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/30">{t("nota")}</p>
    </section>
  );
}

function EstadoVacio({
  icono,
  titulo,
  detalle,
}: {
  icono: string;
  titulo: string;
  detalle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="mb-3 text-4xl opacity-40">{icono}</div>
      <p className="font-medium text-white/70">{titulo}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-white/40">{detalle}</p>
    </div>
  );
}
