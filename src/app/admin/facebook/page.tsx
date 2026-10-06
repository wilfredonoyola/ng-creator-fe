"use client";

import { FotoMarca } from "@/components/FotoMarca";
import { useEffect, useRef, useState } from "react";
import { useApolloClient, useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { ErrorDeSubida, uploadLogoPagina } from "@/lib/upload";
import { DashboardLayout } from "@/components/DashboardLayout";
import { CanalesYoutube } from "@/components/CanalesYoutube";
import { CuentasTiktok } from "@/components/CuentasTiktok";
import { ESTILO_ROL, RolPagina, useSesion } from "@/lib/sesion";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";
import { useMarcaActiva } from "@/lib/marca-activa";
import {
  type CuentaUploadPost,
  PARAMETRO_VUELTA,
  QUERIES_UPLOAD_POST,
  REDES_UPLOAD_POST,
  type Red,
  metaPropiaApagada,
  useCuentasUploadPost,
  useProveedores,
  useUploadPost,
} from "@/lib/upload-post";
import { IconoRed } from "@/components/IconoRed";
import { AjustesPublicacionMarca } from "@/components/AjustesPublicacionMarca";
import {
  FACEBOOK_ESTADO,
  FACEBOOK_PAGINAS,
  MARCAS_ACTIVAS,
  FACEBOOK_URL_DE_CONEXION,
  FACEBOOK_RESINCRONIZAR,
  FACEBOOK_SET_PAGINA_ACTIVA,
  FACEBOOK_SET_LOGO_PAGINA,
  FACEBOOK_REGISTRAR_PAGINA_POR_ID,
  FACEBOOK_DESCONECTAR,
  MIS_ACCESOS,
  SINCRONIZAR_UPLOAD_POST,
  ESTADO_UPLOAD_POST,
  VINCULAR_PERFIL_UPLOAD_POST,
} from "@/graphql/operations";

interface Pagina {
  _id: string;
  pageId: string;
  /** El rol se tiene en la marca de la página, no en la página (#58). */
  marcaId?: string | null;
  nombre: string;
  categoria?: string | null;
  fotoUrl?: string | null;
  logoUrl?: string | null;
  tasks: string[];
  activa: boolean;
  ultimaSincronizacionEn?: string | null;
}

export default function AdminFacebookPage() {
  const t = useTranslations("redesFacebook");
  const locale = useLocale();
  // Dos públicos distintos en la misma pantalla: un ADMIN suma cuentas nuevas
  // (pasos 1 y 2), y un propietario que no es ADMIN entra solo a configurar las
  // páginas que ya son suyas. Sin esto, a quien fue nombrado propietario por
  // invitación la pantalla le quedaba cerrada y no podía ni habilitar su página.
  const { esAdmin, rolEn, accesos, cargando: cargandoSesion } = useSesion();
  const tieneAlguna = accesos.length > 0;
  const tUp = useTranslations("redesUploadPost");
  const proveedores = useProveedores();
  const redesUploadPost = REDES_UPLOAD_POST.filter((r) => proveedores[r] === "upload-post");
  const metaPorUploadPost =
    proveedores.FACEBOOK === "upload-post" || proveedores.INSTAGRAM === "upload-post";
  // Pasos 1-3 de Meta fuera mientras todo sale por Upload-Post.
  const sinMetaPropia = metaPropiaApagada(proveedores);

  const { data: estado, loading: cargandoEstado } = useQuery(FACEBOOK_ESTADO, {
    errorPolicy: "all",
  });
  const { data: paginasData, refetch: refetchPaginas } = useQuery(
    FACEBOOK_PAGINAS,
    { errorPolicy: "all" },
  );

  const [pedirUrl, { loading: pidiendoUrl }] = useLazyQuery(
    FACEBOOK_URL_DE_CONEXION,
    { fetchPolicy: "network-only" },
  );

  // MIS_ACCESOS entra acá porque conectar o registrar una página te deja como
  // su propietario: sin refrescarlo, la fila recién agregada aparece sin rol y
  // con el botón de habilitar apagado hasta recargar a mano.
  const refrescar = [
    { query: FACEBOOK_PAGINAS },
    { query: MARCAS_ACTIVAS },
    { query: FACEBOOK_ESTADO },
    { query: MIS_ACCESOS },
  ];
  const [resincronizar, { loading: resincronizando }] = useMutation(
    FACEBOOK_RESINCRONIZAR,
    { refetchQueries: refrescar },
  );
  const [setActiva] = useMutation(FACEBOOK_SET_PAGINA_ACTIVA, {
    refetchQueries: refrescar,
  });
  const [registrarPorId, { loading: registrando }] = useMutation(
    FACEBOOK_REGISTRAR_PAGINA_POR_ID,
    { refetchQueries: refrescar },
  );
  const [idManual, setIdManual] = useState("");
  const [desconectar] = useMutation(FACEBOOK_DESCONECTAR, {
    refetchQueries: refrescar,
  });

  const [error, setError] = useState<string | null>(null);

  const configurado: boolean = estado?.facebookConfigurado ?? false;
  const conexion = estado?.facebookConexion ?? null;
  const paginas: Pagina[] = paginasData?.facebookPaginas ?? [];
  const habilitadas = paginas.filter((p) => p.activa).length;

  async function conectar() {
    setError(null);
    try {
      const { data } = await pedirUrl();
      const url = data?.facebookUrlDeConexion;
      if (!url) throw new Error(t("sinUrl"));
      // Redirección completa: el diálogo de Meta no admite iframes.
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? t("errorConectar"));
    }
  }

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? t("errorOperacion"));
    }
  }

  if (!cargandoSesion && !esAdmin && !tieneAlguna) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
          <div className="mb-3 text-4xl opacity-50">🔒</div>
          <p className="font-medium text-yellow-400">{t("sinPaginas")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-white/50">
            {t("sinPaginasDetalle")}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 text-white/50">
          {esAdmin
            ? t("subtituloAdmin")
            : t("subtituloPropietario")}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <VueltaDeUploadPost />
      <AjustesPublicacionMarca />
      {redesUploadPost.length > 0 && <SeccionUploadPost redes={redesUploadPost} />}

      {sinMetaPropia ? (
        <p className="mb-3 text-xs text-white/40">{tUp("propiaMetaApagada")}</p>
      ) : (
        <>
      {metaPorUploadPost && (
        <p className="mb-3 text-xs text-white/40">{tUp("propiaMeta")}</p>
      )}

      {/* Pasos 1 y 2: solo de ADMIN, porque suman cuentas nuevas al sistema. */}
      {esAdmin && (
        <>
      <Paso
        numero={1}
        titulo={t("paso1.titulo")}
        completo={configurado}
        cargando={cargandoEstado}
      >
        {configurado ? (
          <p className="text-sm text-white/60">
            {t("paso1.listo")}
          </p>
        ) : (
          <div className="space-y-3 text-sm text-white/60">
            <p>
              {t.rich("paso1.falta", {
                code: (c) => <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">{c}</code>,
              })}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/70">
{`FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/admin/facebook/callback
FACEBOOK_TOKEN_KEY=`}
            </pre>
            <p>
              {t.rich("paso1.permisos", {
                code: (c) => <code className="text-xs">{c}</code>,
              })}
            </p>
            <p className="text-white/40">
              {t.rich("paso1.redirect", { em: (c) => <em>{c}</em> })}
            </p>
          </div>
        )}
      </Paso>

      {/* Paso 2: autorizar */}
      <Paso
        numero={2}
        titulo={t("paso2.titulo")}
        completo={!!conexion?.activa}
        deshabilitado={!configurado}
      >
        {conexion?.activa ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-[#1877F2]/20 px-3 py-1 text-[#5FA3F5]">
                {conexion.fbUserName ?? conexion.fbUserId}
              </span>
              {conexion.expiraEn && (
                <span
                  className="text-xs text-white/40"
                  title={fechaCompleta(conexion.expiraEn, locale)}
                >
                  {t("paso2.vence", { cuando: tiempoRelativo(conexion.expiraEn, Date.now(), locale) })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => accion(() => resincronizar())}
                disabled={resincronizando}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                {resincronizando ? t("paso2.sincronizando") : t("paso2.sincronizar")}
              </button>
              <button
                onClick={conectar}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
              >
                {t("paso2.reconectar")}
              </button>
            </div>
            <p className="text-xs text-white/35">
              {t("paso2.duracion")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              {t("paso2.iniciaSesion")}
            </p>
            <button
              onClick={conectar}
              disabled={!configurado || pidiendoUrl}
              className="rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1877F2]/90 disabled:opacity-40"
            >
              {pidiendoUrl ? t("paso2.preparando") : t("paso2.conectar")}
            </button>
          </div>
        )}
      </Paso>
        </>
      )}

      {/* Paso 3: habilitar paginas */}
      <Paso
        numero={3}
        titulo={t("paso3.titulo")}
        completo={habilitadas > 0}
        deshabilitado={esAdmin && !conexion?.activa}
      >
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            {t("paso3.espacio")}
          </p>
          <p className="text-sm text-white/35">
            {t.rich("paso3.propietario", {
              e: (c) => <span className="text-white/60">{c}</span>,
            })}
          </p>

          {paginas.length > 0 && (
            <div className="space-y-2">
              {paginas.map((p) => (
                <FilaPagina
                  key={p._id}
                  pagina={p}
                  rol={rolEn(p.marcaId)}
                  onToggle={(activa) =>
                    accion(() =>
                      setActiva({ variables: { pageId: p.pageId, activa } }),
                    )
                  }
                  onDesconectar={() =>
                    accion(() =>
                      desconectar({ variables: { pageId: p.pageId } }),
                    )
                  }
                />
              ))}
            </div>
          )}

          {/*
            Agregar por ID: con acceso estándar a pages_show_list el listado de
            Meta (/me/accounts) viene vacío, porque la autorización es por página
            y enumerarlas exige acceso avanzado. El ID se ve en el diálogo de
            Meta, debajo del nombre de cada página.
          */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-medium text-white/70">
              {t("porId.titulo")}
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {paginas.length === 0
                ? t("porId.sinListado")
                : t("porId.noAparece")}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                placeholder="1887745564803724"
                inputMode="numeric"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs outline-none focus:border-ng-azul/50"
              />
              <button
                onClick={() =>
                  accion(async () => {
                    await registrarPorId({
                      variables: { pageId: idManual.trim() },
                    });
                    setIdManual("");
                  })
                }
                disabled={!idManual.trim() || registrando}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/5 disabled:opacity-40"
              >
                {registrando ? t("porId.verificando") : t("porId.agregar")}
              </button>
            </div>
          </div>
        </div>
      </Paso>

      {habilitadas > 0 && (
        <div className="mt-6 rounded-xl border border-ng-azul/30 bg-ng-teal/5 p-4">
          <p className="text-sm text-ng-teal">
            {t("listo", { n: habilitadas })}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {t("listoDetalle")}
          </p>
        </div>
      )}
        </>
      )}

      {proveedores.YOUTUBE === "propio" && <CanalesYoutube />}
      {proveedores.TIKTOK === "propio" && <CuentasTiktok />}
    </DashboardLayout>
  );
}

/**
 * Publicar por Upload-Post (las redes que el backend tiene en 'upload-post'):
 * cada marca tiene su perfil allá, y en él se conectan sus cuentas, red por
 * red. La conexión propia de Facebook sigue más abajo para las estadísticas.
 */
function SeccionUploadPost({ redes }: { redes: Red[] }) {
  const t = useTranslations("redesUploadPost");
  const { activa: marca } = useMarcaActiva();
  const { esAdmin, esPropietario } = useSesion();
  const marcaId = marca?._id;
  const { data: estadoData } = useQuery(ESTADO_UPLOAD_POST, {
    variables: { marcaId },
    skip: !marcaId,
    errorPolicy: "all",
  });
  const { cuentas, cargando } = useCuentasUploadPost(marcaId);
  const [vincular, { loading: vinculando }] = useMutation(VINCULAR_PERFIL_UPLOAD_POST, {
    refetchQueries: QUERIES_UPLOAD_POST,
  });
  const [perfilNuevo, setPerfilNuevo] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mando = esPropietario(marcaId);
  const puedeVincular = esAdmin || mando;
  const perfil: string | null = estadoData?.estadoUploadPost?.perfil ?? null;

  async function guardarPerfil() {
    setError(null);
    try {
      await vincular({ variables: { marcaId, perfil: perfilNuevo.trim() } });
      setPerfilNuevo("");
      setAbierto(false);
    } catch (e: any) {
      setError(e?.message ?? t("errorOperacion"));
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold">{t("titulo")}</h2>
        {cargando && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}
      </div>
      {!marca ? (
        <p className="mt-2 text-xs text-white/40">{t("eligeMarca")}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-white/50">
            {t("descripcion", { marca: marca.nombre })}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="text-white/50">
              {perfil
                ? t.rich("perfil", {
                    perfil,
                    b: (c) => <span className="font-mono text-white/80">{c}</span>,
                  })
                : t("sinPerfil")}
            </span>
            {puedeVincular && !abierto && (
              <button
                onClick={() => setAbierto(true)}
                className="text-white/50 underline-offset-2 hover:text-white hover:underline"
              >
                {t("vincular")}
              </button>
            )}
          </div>
          {puedeVincular && abierto && (
            <div className="mt-2 flex gap-2">
              <input
                value={perfilNuevo}
                onChange={(e) => setPerfilNuevo(e.target.value)}
                placeholder={t("perfilPlaceholder")}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs outline-none focus:border-white/30"
              />
              <button
                onClick={guardarPerfil}
                disabled={!perfilNuevo.trim() || vinculando}
                className="rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
              >
                {vinculando ? t("guardando") : t("guardar")}
              </button>
              <button
                onClick={() => setAbierto(false)}
                className="rounded-lg px-2 py-1.5 text-xs text-white/40 hover:text-white/70"
              >
                {t("cancelar")}
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {redes.map((red) => (
              <FilaRedUploadPost
                key={red}
                red={red}
                marcaId={marcaId}
                cuentas={cuentas.filter((c) => c.red === red && c.activa)}
                mando={mando}
              />
            ))}
          </div>
          {!mando && (
            <p className="mt-3 text-xs text-white/40">{t("soloPropietario")}</p>
          )}
        </>
      )}
      {error && (
        <p className="mt-3 break-words rounded-lg bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}

const NOMBRE_RED: Record<Red, string> = {
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

function FilaRedUploadPost({
  red,
  marcaId,
  cuentas,
  mando,
}: {
  red: Red;
  marcaId: string | undefined;
  cuentas: CuentaUploadPost[];
  mando: boolean;
}) {
  const t = useTranslations("redesUploadPost");
  const { conectar, desconectar, abriendo, desconectando } = useUploadPost(marcaId, red);
  const [error, setError] = useState<string | null>(null);
  const nombreRed = NOMBRE_RED[red];

  async function abrir() {
    setError(null);
    try {
      if (!(await conectar())) throw new Error(t("sinUrl"));
    } catch (e: any) {
      setError(e?.message ?? t("errorConectar"));
    }
  }

  async function quitar() {
    if (!confirm(t("confirmarDesconectar", { red: nombreRed }))) return;
    setError(null);
    try {
      await desconectar();
    } catch (e: any) {
      setError(e?.message ?? t("errorOperacion"));
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <IconoRed red={red} url={cuentas[0]?.avatarUrl} />
        <div className="min-w-0 flex-1">
          {cuentas.length ? (
            cuentas.map((c) => (
              <p key={c._id} className="truncate text-sm font-medium">
                {c.nombre}
                {c.usuario && (
                  <span className="ml-1.5 text-xs font-normal text-white/40">@{c.usuario.replace(/^@+/, "")}</span>
                )}
              </p>
            ))
          ) : (
            <p className="text-sm font-medium">{nombreRed}</p>
          )}
          <p className={`text-xs ${cuentas.length ? "text-white/40" : "text-amber-400"}`}>
            {cuentas.length ? nombreRed : t("faltaConectar")}
          </p>
        </div>
        {mando &&
          (cuentas.length ? (
            <button
              onClick={quitar}
              disabled={desconectando}
              className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
            >
              {t("desconectar")}
            </button>
          ) : (
            <button
              onClick={abrir}
              disabled={abriendo}
              className="shrink-0 rounded-lg bg-marca px-3 py-1.5 text-xs font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
            >
              {abriendo ? t("abriendo") : t("conectar", { red: nombreRed })}
            </button>
          ))}
      </div>
      {error && <p className="mt-2 break-words text-xs text-red-400">{error}</p>}
    </div>
  );
}

/**
 * Upload-Post vuelve acá con `?upload_post=ok` después de conectar una cuenta:
 * se traen las cuentas que la marca tiene allá, se refrescan las listas y se
 * limpia el parámetro para que recargar no vuelva a sincronizar.
 */
function VueltaDeUploadPost() {
  const t = useTranslations("redesUploadPost");
  const { activa: marca } = useMarcaActiva();
  const marcaId = marca?._id;
  const [estado, setEstado] = useState<"nada" | "sincronizando" | "listo">("nada");
  const hecho = useRef(false);
  const client = useApolloClient();
  const [sincronizar] = useMutation(SINCRONIZAR_UPLOAD_POST);

  useEffect(() => {
    if (hecho.current || !marcaId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(PARAMETRO_VUELTA) !== "ok") return;
    hecho.current = true;
    url.searchParams.delete(PARAMETRO_VUELTA);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setEstado("sincronizando");
    // Si sincronizar falla, las cuentas se leen igual de Upload-Post al refrescar.
    sincronizar({ variables: { marcaId } })
      .catch((e) => console.warn("sincronizarUploadPost", e))
      .then(() =>
        client.refetchQueries({
          include: [...QUERIES_UPLOAD_POST, "TiktokCuentas", "YoutubeCanales"],
        }),
      )
      .finally(() => setEstado("listo"));
  }, [marcaId, sincronizar, client]);

  if (estado === "nada") return null;
  return (
    <div className="mb-6 rounded-xl border border-ng-azul/30 bg-ng-teal/5 p-4 text-sm text-ng-teal">
      {estado === "sincronizando" ? t("sincronizando") : t("conectada")}
    </div>
  );
}

function Paso({
  numero,
  titulo,
  completo,
  deshabilitado,
  cargando,
  children,
}: {
  numero: number;
  titulo: string;
  completo?: boolean;
  deshabilitado?: boolean;
  cargando?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mb-4 rounded-2xl border p-5 transition ${
        deshabilitado
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : completo
            ? "border-ng-azul/25 bg-ng-teal/[0.03]"
            : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            completo
              ? "bg-marca text-ng-tinta"
              : "border border-white/20 text-white/50"
          }`}
        >
          {completo ? "✓" : numero}
        </span>
        <h2 className="font-semibold">{titulo}</h2>
        {cargando && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}
      </div>
      <div className="pl-10">{children}</div>
    </section>
  );
}

function FilaPagina({
  pagina,
  rol,
  onToggle,
  onDesconectar,
}: {
  pagina: Pagina;
  rol: RolPagina | null;
  onToggle: (activa: boolean) => void;
  onDesconectar: () => void;
}) {
  const t = useTranslations("redesFacebook");
  const tr = useTranslations("marcoRoles");
  const [confirmando, setConfirmando] = useState(false);
  // Habilitar y desconectar cambian dónde publica todo el equipo de la página:
  // son del propietario. El backend lo impone igual.
  const mando = rol === "PROPIETARIO";
  // `tasks` solo lo devuelve /me/accounts. Vacío significa "no lo sabemos"
  // (página registrada por ID), no "sin permiso": el backend la deja habilitar
  // igual, así que bloquear el botón acá la volvería inhabilitable.
  const permisosConocidos = pagina.tasks.length > 0;
  const puedePublicar = pagina.tasks.includes("CREATE_CONTENT");
  const bloqueada = permisosConocidos && !puedePublicar;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <FotoMarca nombre={pagina.nombre} pageId={pagina.pageId} fotoUrl={pagina.fotoUrl} className="h-9 w-9" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pagina.nombre}</p>
        <p className="truncate text-xs text-white/40">
          {pagina.categoria ?? "—"}
          {bloqueada && (
            <span className="ml-2 text-yellow-400">{t("fila.sinPermiso")}</span>
          )}
        </p>
        <p className="truncate font-mono text-[10px] text-white/25">
          {pagina.pageId}
        </p>
      </div>

      {rol && (
        <span
          title={tr(`${rol}.ayuda`)}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${ESTILO_ROL[rol].clase}`}
        >
          {tr(`${rol}.etiqueta`)}
        </span>
      )}

      <button
        onClick={() => onToggle(!pagina.activa)}
        disabled={!mando || (bloqueada && !pagina.activa)}
        title={
          !mando
            ? t("fila.soloPropietario")
            : bloqueada
              ? t("fila.requierePermiso")
              : undefined
        }
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          pagina.activa
            ? "bg-marca text-ng-tinta hover:brightness-110"
            : "border border-white/15 text-white/60 hover:bg-white/5"
        }`}
      >
        {pagina.activa ? t("fila.habilitada") : t("fila.habilitar")}
      </button>

      {mando &&
        (confirmando ? (
          <span className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={onDesconectar}
              className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/25"
            >
              {t("fila.desconectar")}
            </button>
            <button
              onClick={() => setConfirmando(false)}
              className="rounded-lg px-2 py-1.5 text-xs text-white/40 transition hover:text-white/70"
            >
              {t("fila.no")}
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmando(true)}
            title={t("fila.desconectarAyuda")}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/40 transition hover:border-red-500/40 hover:text-red-400"
          >
            {t("fila.desconectar")}
          </button>
        ))}

      <LogoDePagina pagina={pagina} />
    </div>
  );
}

/**
 * Logo de la página, que se usa como marca de agua en el contenido reciclado.
 *
 * Va por página y no como archivo único del sistema: cada fan page tiene el
 * suyo, y una marca compartida firmaría el contenido con la marca equivocada.
 *
 * No hace falta subirlo con transparencia. El backend detecta si el fondo es
 * plano y lo recorta, porque casi ningún logo llega bien exportado.
 */
function LogoDePagina({ pagina }: { pagina: Pagina }) {
  const t = useTranslations("redesFacebook");
  const tSubida = useTranslations("erroresSubida");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [guardar] = useMutation(FACEBOOK_SET_LOGO_PAGINA, {
    refetchQueries: [{ query: FACEBOOK_PAGINAS }],
    onError: (e) => setError(e.message),
  });

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSubiendo(true);
    try {
      const { url } = await uploadLogoPagina(file, pagina.pageId);
      await guardar({ variables: { pageId: pagina.pageId, logoUrl: url } });
    } catch (err) {
      setError(
        err instanceof ErrorDeSubida
          ? tSubida(err.clave, err.datos)
          : err instanceof Error
            ? err.message
            : t("logo.error"),
      );
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex w-full items-center gap-3 border-t border-white/10 pt-3">
      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-[repeating-conic-gradient(#222_0_25%,#2b2b2b_0_50%)] bg-[length:12px_12px]">
        {pagina.logoUrl ? (
          // Fondo a cuadros para que se vea la transparencia del recorte.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pagina.logoUrl}
            alt=""
            className="max-h-9 max-w-[3.5rem] object-contain"
          />
        ) : (
          <span className="text-[10px] text-white/30">{t("logo.sinLogo")}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/50">{t("logo.marcaDeAgua")}</p>
        <p className="text-[11px] text-white/25">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : pagina.logoUrl ? (
            t("logo.seAplica")
          ) : (
            t("logo.sinLogoNoSe")
          )}
        </p>
      </div>

      <label className="shrink-0 cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={elegir}
          disabled={subiendo}
        />
        {subiendo ? t("logo.subiendo") : pagina.logoUrl ? t("logo.cambiar") : t("logo.subir")}
      </label>
    </div>
  );
}
