"use client";

import { useState } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useSesion } from "@/lib/sesion";
import { fechaCompleta, tiempoRelativo } from "@/lib/time";
import {
  FACEBOOK_ESTADO,
  FACEBOOK_PAGINAS,
  FACEBOOK_PAGINAS_ACTIVAS,
  FACEBOOK_URL_DE_CONEXION,
  FACEBOOK_RESINCRONIZAR,
  FACEBOOK_SET_PAGINA_ACTIVA,
  FACEBOOK_REGISTRAR_PAGINA_POR_ID,
  FACEBOOK_DESCONECTAR,
} from "@/graphql/operations";

interface Pagina {
  _id: string;
  pageId: string;
  nombre: string;
  categoria?: string | null;
  fotoUrl?: string | null;
  tasks: string[];
  activa: boolean;
  ultimaSincronizacionEn?: string | null;
}

export default function AdminFacebookPage() {
  const { esAdmin, cargando: cargandoSesion } = useSesion();

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

  const refrescar = [
    { query: FACEBOOK_PAGINAS },
    { query: FACEBOOK_PAGINAS_ACTIVAS },
    { query: FACEBOOK_ESTADO },
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
  const [desconectar, { loading: desconectando }] = useMutation(
    FACEBOOK_DESCONECTAR,
    { refetchQueries: refrescar },
  );

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
      if (!url) throw new Error("El backend no devolvió la URL de autorización");
      // Redirección completa: el diálogo de Meta no admite iframes.
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? "No se pudo iniciar la conexión");
    }
  }

  async function accion(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "La operación falló");
    }
  }

  if (!cargandoSesion && !esAdmin) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-8 text-center">
          <div className="mb-3 text-4xl opacity-50">🔒</div>
          <p className="font-medium text-yellow-400">Solo para administradores</p>
          <p className="mt-1 text-sm text-white/50">
            Esta sección administra dónde publica todo el equipo.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Integración con Facebook</h1>
        <p className="mt-1 text-white/50">
          Conectá una cuenta y elegí en qué páginas se puede publicar.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Paso 1: credenciales del backend */}
      <Paso
        numero={1}
        titulo="Credenciales de la app de Meta"
        completo={configurado}
        cargando={cargandoEstado}
      >
        {configurado ? (
          <p className="text-sm text-white/60">
            El backend tiene cargadas las credenciales de la app.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-white/60">
            <p>
              Falta configurar la app de Meta en el backend. Creá una app de tipo
              Business en developers.facebook.com y cargá en el{" "}
              <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">.env</code>:
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-white/70">
{`FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/admin/facebook/callback
FACEBOOK_TOKEN_KEY=`}
            </pre>
            <p>
              Permisos a solicitar:{" "}
              <code className="text-xs">pages_show_list</code>,{" "}
              <code className="text-xs">pages_read_engagement</code>,{" "}
              <code className="text-xs">pages_manage_posts</code>. Opcional:{" "}
              <code className="text-xs">read_insights</code> (alcance e
              impresiones del historial; sin él Revival rankea igual, pero solo
              con reacciones, comentarios y compartidos).
            </p>
            <p className="text-white/40">
              La redirect URI debe estar registrada <em>exactamente igual</em> en
              la app, o Meta rechaza el login.
            </p>
          </div>
        )}
      </Paso>

      {/* Paso 2: autorizar */}
      <Paso
        numero={2}
        titulo="Autorizar la cuenta"
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
                  title={fechaCompleta(conexion.expiraEn)}
                >
                  el token vence {tiempoRelativo(conexion.expiraEn)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => accion(() => resincronizar())}
                disabled={resincronizando}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                {resincronizando ? "Sincronizando…" : "↻ Sincronizar páginas"}
              </button>
              <button
                onClick={conectar}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
              >
                Reconectar
              </button>
              <button
                onClick={() => accion(() => desconectar())}
                disabled={desconectando}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {desconectando ? "…" : "Desconectar"}
              </button>
            </div>
            <p className="text-xs text-white/35">
              El token de Facebook dura unos 60 días. Cuando venza hay que
              reconectar; las páginas habilitadas y sus vínculos se conservan.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/60">
              Iniciá sesión con la cuenta que administra las fan pages.
            </p>
            <button
              onClick={conectar}
              disabled={!configurado || pidiendoUrl}
              className="rounded-lg bg-[#1877F2] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1877F2]/90 disabled:opacity-40"
            >
              {pidiendoUrl ? "Preparando…" : "Conectar con Facebook"}
            </button>
          </div>
        )}
      </Paso>

      {/* Paso 3: habilitar paginas */}
      <Paso
        numero={3}
        titulo="Habilitar páginas como destino"
        completo={habilitadas > 0}
        deshabilitado={!conexion?.activa}
      >
        <div className="space-y-4">
          <p className="text-sm text-white/50">
            Cada página habilitada es un espacio de trabajo propio: su cola de
            revisión y su numeración de expedientes son independientes.
            Conectar no habilita — marcá explícitamente dónde se puede publicar.
          </p>

          {paginas.length > 0 && (
            <div className="space-y-2">
              {paginas.map((p) => (
                <FilaPagina
                  key={p._id}
                  pagina={p}
                  onToggle={(activa) =>
                    accion(() =>
                      setActiva({ variables: { id: p._id, activa } }),
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
              Agregar una página por su ID
            </p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {paginas.length === 0
                ? "Meta no devuelve el listado de páginas mientras la app tenga acceso estándar. Pegá el ID que aparece en el diálogo de autorización, debajo del nombre de la página."
                : "Si una página que autorizaste no aparece arriba, agregala con su ID."}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                placeholder="1887745564803724"
                inputMode="numeric"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs outline-none focus:border-[#0FED9D]/50"
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
                {registrando ? "Verificando…" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      </Paso>

      {habilitadas > 0 && (
        <div className="mt-6 rounded-xl border border-[#0FED9D]/30 bg-[#0FED9D]/5 p-4">
          <p className="text-sm text-[#0FED9D]">
            Listo: {habilitadas} página{habilitadas !== 1 ? "s" : ""} habilitada
            {habilitadas !== 1 ? "s" : ""}.
          </p>
          <p className="mt-1 text-xs text-white/50">
            Ya aparecen en el switch de la barra lateral y como destino al
            publicar un video aprobado.
          </p>
        </div>
      )}
    </DashboardLayout>
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
            ? "border-[#0FED9D]/25 bg-[#0FED9D]/[0.03]"
            : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            completo
              ? "bg-[#0FED9D] text-black"
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
  onToggle,
}: {
  pagina: Pagina;
  onToggle: (activa: boolean) => void;
}) {
  // `tasks` solo lo devuelve /me/accounts. Vacío significa "no lo sabemos"
  // (página registrada por ID), no "sin permiso": el backend la deja habilitar
  // igual, así que bloquear el botón acá la volvería inhabilitable.
  const permisosConocidos = pagina.tasks.length > 0;
  const puedePublicar = pagina.tasks.includes("CREATE_CONTENT");
  const bloqueada = permisosConocidos && !puedePublicar;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      {pagina.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pagina.fotoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-sm font-bold">
          {pagina.nombre[0]?.toUpperCase()}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{pagina.nombre}</p>
        <p className="truncate text-xs text-white/40">
          {pagina.categoria ?? "—"}
          {bloqueada && (
            <span className="ml-2 text-yellow-400">sin permiso para publicar</span>
          )}
        </p>
        <p className="truncate font-mono text-[10px] text-white/25">
          {pagina.pageId}
        </p>
      </div>

      <button
        onClick={() => onToggle(!pagina.activa)}
        disabled={bloqueada && !pagina.activa}
        title={
          bloqueada
            ? "Requiere permiso CREATE_CONTENT sobre la página"
            : undefined
        }
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          pagina.activa
            ? "bg-[#0FED9D] text-black hover:bg-[#0FED9D]/90"
            : "border border-white/15 text-white/60 hover:bg-white/5"
        }`}
      >
        {pagina.activa ? "Habilitada" : "Habilitar"}
      </button>
    </div>
  );
}
