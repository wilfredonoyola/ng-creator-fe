"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import {
  AJUSTAR_MARCA_ADMIN,
  ARCHIVAR_CLIENTE_SUPERADMIN,
  CLIENTES_SUPERADMIN,
  MARCAS_ACTIVAS,
} from "@/graphql/operations";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";
import { entrarComo } from "@/lib/suplantar";

type Rol = "PROPIETARIO" | "EDITOR" | "REVISOR" | "LECTOR" | "PROVEEDOR";

type Miembro = {
  usuarioId: string;
  email: string;
  nombre?: string | null;
  rol: Rol;
  activo: boolean;
  ultimoAccesoEn?: string | null;
};

/** Cómo se llama cada red en pantalla (RedSocial del backend). */
const NOMBRE_RED: Record<string, string> = {
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
};

type Cliente = {
  propietarios: string[];
  miembros: number;
  equipo: Miembro[];
  pasos: { marcaConfigurada: boolean; primerEpisodio: boolean; redes: string[] };
  episodios: number;
  clips: number;
  horasProcesadas: number;
  costoUsd: number;
  tokensIa: number;
  ultimoAccesoEn?: string | null;
  ultimoEpisodioEn?: string | null;
  soporteAbiertos: number;
  prueba?: {
    desde: string;
    diasEnPrueba: number;
    topeEpisodios: number;
    episodiosUsados: number;
    agotada: boolean;
  } | null;
  marca: {
    _id: string;
    nombre: string;
    archivadaEn?: string | null;
    demo: boolean;
    createdAt: string;
    prueba?: { topeEpisodios: number; episodiosUsados: number } | null;
  };
};

const FILTROS = ["activos", "enPrueba", "pruebaAgotada", "demo", "archivados", "todos"] as const;
type Filtro = (typeof FILTROS)[number];

const COLUMNAS = ["agencia", "correos", "episodios", "horas", "tokens", "gasto", "prueba", "ultimoAcceso", "tickets"] as const;
type Columna = (typeof COLUMNAS)[number];
/** Las de números se alinean a la derecha y arrancan de mayor a menor. */
const NUMERICAS: ReadonlySet<Columna> = new Set(["episodios", "horas", "tokens", "gasto", "prueba", "ultimoAcceso", "tickets"]);

function pasaFiltro(c: Cliente, f: Filtro): boolean {
  switch (f) {
    case "activos":
      return !c.marca.archivadaEn;
    case "archivados":
      return !!c.marca.archivadaEn;
    case "demo":
      return c.marca.demo;
    case "enPrueba":
      return !!c.prueba && !c.prueba.agotada && !c.marca.archivadaEn;
    case "pruebaAgotada":
      return !!c.prueba?.agotada;
    default:
      return true;
  }
}

function valorDe(c: Cliente, col: Columna): string | number {
  switch (col) {
    case "agencia":
      return c.marca.nombre.toLowerCase();
    case "correos":
      return (c.propietarios[0] ?? "").toLowerCase();
    case "episodios":
      return c.episodios;
    case "horas":
      return c.horasProcesadas;
    case "tokens":
      return c.tokensIa;
    case "gasto":
      return c.costoUsd;
    case "prueba":
      return c.prueba ? c.prueba.diasEnPrueba : -1;
    case "ultimoAcceso":
      return c.ultimoAccesoEn ? new Date(c.ultimoAccesoEn).getTime() : 0;
    case "tickets":
      return c.soporteAbiertos;
  }
}

const usd = (n: number) => `$${n.toFixed(2)}`;
const horas = (n: number) => n.toFixed(1);

/** La tabla tal como se ve (filtro y orden), para abrirla en una planilla. */
function descargarCsv(clientes: Cliente[]) {
  const celda = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const filas = [
    ["agencia", "correos", "personas", "episodios", "clips", "horas", "tokens_ia", "gasto_usd", "dias_en_prueba", "episodios_usados", "tope", "prueba_agotada", "ultimo_acceso", "tickets_abiertos", "demo", "apagado", "creada"],
    ...clientes.map((c) => [
      c.marca.nombre,
      c.propietarios.join(" "),
      c.miembros,
      c.episodios,
      c.clips,
      horas(c.horasProcesadas),
      c.tokensIa,
      c.costoUsd.toFixed(2),
      c.prueba?.diasEnPrueba ?? "",
      c.prueba?.episodiosUsados ?? "",
      c.prueba?.topeEpisodios ?? "",
      c.prueba ? (c.prueba.agotada ? "si" : "no") : "",
      c.ultimoAccesoEn ?? "",
      c.soporteAbiertos,
      c.marca.demo ? "si" : "no",
      c.marca.archivadaEn ? "si" : "no",
      c.marca.createdAt,
    ]),
  ];
  const csv = filas.map((f) => f.map(celda).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `clientes-clipfine-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Los clientes de Clipfine (cada marca) en una tabla: quién es el dueño, cuánto
 * usa y cuánto nos cuesta, cómo va su prueba y si tiene tickets abiertos. Al
 * tocar una fila se abre su panel: renombrar, marcar como demo, ajustar el
 * cupo de episodios (habilitar más videos) y apagar o prender la cuenta.
 */
export default function ClientesSuperadmin() {
  const t = useTranslations("superadmin.clientes");
  const locale = useLocale();
  const ahora = useAhora(60_000);
  const { data, loading, error } = useQuery<{ clientesSuperadmin: Cliente[] }>(CLIENTES_SUPERADMIN, {
    fetchPolicy: "cache-and-network",
  });
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("activos");
  const [orden, setOrden] = useState<{ col: Columna; desc: boolean }>({ col: "ultimoAcceso", desc: true });
  const [elegidoId, setElegidoId] = useState<string | null>(null);

  // `?marca=<id>` (desde Usuarios) abre ese cliente, aunque esté en otro filtro.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("marca");
    if (id) {
      setElegidoId(id);
      setFiltro("todos");
    }
  }, []);

  const todos = useMemo(() => data?.clientesSuperadmin ?? [], [data]);
  const clientes = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = todos.filter((c) => {
      if (!pasaFiltro(c, filtro)) return false;
      if (!q) return true;
      return c.marca.nombre.toLowerCase().includes(q) || c.propietarios.some((p) => p.toLowerCase().includes(q));
    });
    const signo = orden.desc ? -1 : 1;
    return [...filtrados].sort((a, b) => {
      const va = valorDe(a, orden.col);
      const vb = valorDe(b, orden.col);
      if (va < vb) return -signo;
      if (va > vb) return signo;
      return a.marca.nombre.localeCompare(b.marca.nombre);
    });
  }, [todos, busqueda, filtro, orden]);

  const elegido = todos.find((c) => c.marca._id === elegidoId) ?? null;
  const cuenta = (f: Filtro) => todos.filter((c) => pasaFiltro(c, f)).length;

  function ordenarPor(col: Columna) {
    setOrden((o) => (o.col === col ? { col, desc: !o.desc } : { col, desc: NUMERICAS.has(col) }));
  }

  const totales = useMemo(
    () => ({
      episodios: clientes.reduce((s, c) => s + c.episodios, 0),
      horas: clientes.reduce((s, c) => s + c.horasProcesadas, 0),
      tokens: clientes.reduce((s, c) => s + c.tokensIa, 0),
      gasto: clientes.reduce((s, c) => s + c.costoUsd, 0),
      tickets: clientes.reduce((s, c) => s + c.soporteAbiertos, 0),
    }),
    [clientes],
  );

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={t("buscar")}
          aria-label={t("buscar")}
          className="w-full max-w-sm rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
        />
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                filtro === f ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {t(`filtros.${f}`)} · {cuenta(f)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => descargarCsv(clientes)}
          disabled={clientes.length === 0}
          className="ml-auto rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
        >
          {t("exportarCsv")}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {elegido && <PanelCliente key={elegido.marca._id} cliente={elegido} onCerrar={() => setElegidoId(null)} />}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : clientes.length === 0 ? (
        <p className="text-sm text-white/40">{t("vacio")}</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-white/40">{t("ayudaTabla")}</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs text-white/50">
                <tr>
                  {COLUMNAS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      aria-sort={orden.col === col ? (orden.desc ? "descending" : "ascending") : "none"}
                      className={`whitespace-nowrap px-3 py-2 font-medium ${NUMERICAS.has(col) ? "text-right" : ""}`}
                    >
                      <button type="button" onClick={() => ordenarPor(col)} className="inline-flex items-center gap-1 hover:text-white">
                        {t(`columnas.${col}`)}
                        <span aria-hidden className={orden.col === col ? "text-marca" : "text-white/20"}>
                          {orden.col === col && !orden.desc ? "▲" : "▼"}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const archivada = !!c.marca.archivadaEn;
                  const activo = c.marca._id === elegidoId;
                  return (
                    <tr
                      key={c.marca._id}
                      onClick={() => setElegidoId(activo ? null : c.marca._id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setElegidoId(activo ? null : c.marca._id);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={activo}
                      className={`cursor-pointer border-b border-white/5 align-top transition last:border-0 hover:bg-white/[0.04] focus:bg-white/[0.04] focus:outline-none ${
                        activo ? "bg-marca/10" : ""
                      } ${archivada ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{c.marca.nombre}</span>
                          {c.marca.demo && <span className="rounded-full bg-marca px-1.5 py-0.5 text-[10px] font-bold uppercase text-ng-tinta">{t("demo")}</span>}
                          {archivada && <span className="rounded-full border border-red-400/40 px-1.5 py-0.5 text-[10px] text-red-300">{t("apagado")}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-white/40" title={fechaCompleta(c.marca.createdAt, locale)}>
                          {t("resumen", { miembros: c.miembros, episodios: c.episodios })}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/70">
                        {c.propietarios.length > 0 ? c.propietarios.map((p) => <div key={p}>{p}</div>) : <span className="text-white/40">{t("sinPropietario")}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.episodios}
                        <div className="text-xs text-white/40">{t("clips", { n: c.clips })}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{horas(c.horasProcesadas)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{c.tokensIa.toLocaleString(locale)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{usd(c.costoUsd)}</td>
                      <td className="px-3 py-2.5 text-right">
                        {c.prueba ? (
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                c.prueba.agotada ? "border border-red-400/40 text-red-300" : "bg-marca/15 text-marca"
                              }`}
                            >
                              {c.prueba.agotada ? t("prueba.agotada") : t("prueba.enPrueba")}
                            </span>
                            <span className="whitespace-nowrap text-xs text-white/50">
                              {t("prueba.detalle", { dias: c.prueba.diasEnPrueba, usados: c.prueba.episodiosUsados, tope: c.prueba.topeEpisodios })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">{t("prueba.sinTope")}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-white/60" title={c.ultimoAccesoEn ? fechaCompleta(c.ultimoAccesoEn, locale) : undefined}>
                        {c.ultimoAccesoEn ? tiempoRelativo(c.ultimoAccesoEn, ahora, locale) : t("nunca")}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.soporteAbiertos > 0 ? (
                          <span className="rounded-full bg-marca px-2 py-0.5 text-xs font-bold text-ng-tinta">{c.soporteAbiertos}</span>
                        ) : (
                          <span className="text-white/30">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-white/10 bg-white/[0.03] text-xs text-white/60">
                <tr>
                  <td className="px-3 py-2 font-medium" colSpan={2}>
                    {t("totales", { n: clientes.length })}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.episodios}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{horas(totales.horas)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totales.tokens.toLocaleString(locale)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{usd(totales.gasto)}</td>
                  <td />
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{totales.tickets}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function PanelCliente({ cliente, onCerrar }: { cliente: Cliente; onCerrar: () => void }) {
  const t = useTranslations("superadmin.clientes");
  const locale = useLocale();
  const { marca } = cliente;
  const archivada = !!marca.archivadaEn;
  const [nombre, setNombre] = useState(marca.nombre);
  const [demo, setDemo] = useState(marca.demo);
  const [sinTope, setSinTope] = useState(!marca.prueba);
  const [tope, setTope] = useState(String(marca.prueba?.topeEpisodios ?? 25));
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const refetchQueries = [{ query: CLIENTES_SUPERADMIN }, { query: MARCAS_ACTIVAS }];
  const [ajustar, { loading: guardando }] = useMutation(AJUSTAR_MARCA_ADMIN, { refetchQueries });
  const [archivar, { loading: archivando }] = useMutation(ARCHIVAR_CLIENTE_SUPERADMIN, { refetchQueries });

  const topeNum = Number(tope);
  const topeValido = sinTope || (Number.isInteger(topeNum) && topeNum >= 0 && topeNum <= 1000);
  const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
  const nombreValido = nombreLimpio.length >= 2 && nombreLimpio.length <= 60;
  const cambio =
    nombreLimpio !== marca.nombre ||
    demo !== marca.demo ||
    sinTope !== !marca.prueba ||
    (!sinTope && topeNum !== marca.prueba?.topeEpisodios);

  async function guardar() {
    setMensaje(null);
    try {
      await ajustar({
        variables: {
          marcaId: marca._id,
          nombre: nombreLimpio !== marca.nombre ? nombreLimpio : null,
          demo,
          sinTope,
          topeEpisodios: sinTope ? null : topeNum,
        },
      });
      setMensaje({ ok: true, texto: t("guardado") });
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : t("error") });
    }
  }

  async function alternarArchivo() {
    if (!archivada && !window.confirm(t("confirmarApagar", { nombre: marca.nombre }))) return;
    setMensaje(null);
    try {
      await archivar({ variables: { marcaId: marca._id, archivada: !archivada } });
    } catch (err) {
      setMensaje({ ok: false, texto: err instanceof Error ? err.message : t("error") });
    }
  }

  return (
    <div className={`mb-4 rounded-xl border p-4 ${archivada ? "border-white/10 bg-white/[0.02]" : "border-marca/40 bg-white/[0.03]"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value.slice(0, 60))}
          aria-label={t("nombre")}
          className="min-w-0 flex-1 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm font-medium outline-none transition focus:border-ng-azul sm:max-w-sm"
        />
        {marca.demo && <span className="rounded-full bg-marca px-2 py-0.5 text-[11px] font-bold uppercase text-ng-tinta">{t("demo")}</span>}
        {archivada && <span className="rounded-full border border-red-400/40 px-2 py-0.5 text-[11px] text-red-300">{t("apagado")}</span>}
        <button type="button" onClick={onCerrar} className="ml-auto rounded-lg px-2 py-1 text-sm text-white/50 hover:bg-white/5 hover:text-white">
          {t("cerrar")}
        </button>
      </div>

      <p className="mt-2 text-xs text-white/45">
        {cliente.propietarios.length > 0 ? cliente.propietarios.join(", ") : t("sinPropietario")}
        {" · "}
        {t("resumen", { miembros: cliente.miembros, episodios: cliente.episodios })}
        {" · "}
        {t("desde", { fecha: fechaCompleta(marca.createdAt, locale) })}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <EquipoCliente equipo={cliente.equipo} />
        <PasosCliente pasos={cliente.pasos} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} className="accent-[#FFD400]" />
          {t("esDemo")}
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-white/60">{t("cupo")}</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={tope}
            disabled={sinTope}
            onChange={(e) => setTope(e.target.value)}
            aria-label={t("cupo")}
            className="w-20 rounded-ng-md border border-white/10 bg-ng-hondo/70 px-2 py-1.5 text-sm outline-none transition focus:border-ng-azul disabled:opacity-40"
          />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sinTope} onChange={(e) => setSinTope(e.target.checked)} className="accent-[#FFD400]" />
            {t("sinTope")}
          </label>
          {marca.prueba && (
            <span className="text-xs text-white/40">
              {t("usados", { usados: marca.prueba.episodiosUsados, tope: marca.prueba.topeEpisodios })}
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={alternarArchivo}
            disabled={archivando}
            className={`rounded-lg border px-3 py-2 text-sm transition disabled:opacity-40 ${
              archivada ? "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10" : "border-red-400/30 text-red-300 hover:bg-red-400/10"
            }`}
          >
            {archivada ? t("prender") : t("apagar")}
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={!cambio || !topeValido || !nombreValido || guardando}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
          >
            {guardando ? t("guardando") : t("guardar")}
          </button>
        </div>
      </div>
      {mensaje && <p className={`mt-2 text-xs ${mensaje.ok ? "text-emerald-400" : "text-red-400"}`}>{mensaje.texto}</p>}
    </div>
  );
}

/** Quiénes tienen acceso a la marca, con un botón para entrar como cada uno. */
function EquipoCliente({ equipo }: { equipo: Miembro[] }) {
  const t = useTranslations("superadmin.clientes.equipo");
  const tUsuarios = useTranslations("superadmin.usuarios");
  const tRol = useTranslations("marcoRoles");
  const locale = useLocale();
  const ahora = useAhora(60_000);

  return (
    <section className="rounded-lg border border-white/10 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{t("titulo", { n: equipo.length })}</h3>
      {equipo.length === 0 ? (
        <p className="mt-2 text-xs text-white/40">{t("vacio")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {equipo.map((m) => (
            <li key={m.usuarioId} className={`flex items-center gap-3 py-2 ${m.activo ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {m.nombre || m.email}
                  <span className="ml-2 text-xs text-white/45">{tRol(`${m.rol}.etiqueta`)}</span>
                </p>
                <p className="truncate text-xs text-white/40">
                  {m.nombre ? `${m.email} · ` : ""}
                  {m.ultimoAccesoEn ? tUsuarios("entro", { cuando: tiempoRelativo(m.ultimoAccesoEn, ahora, locale) }) : tUsuarios("nuncaEntro")}
                </p>
              </div>
              {m.activo && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(tUsuarios("confirmarEntrar", { email: m.email }))) entrarComo({ id: m.usuarioId, email: m.email });
                  }}
                  className="shrink-0 rounded-lg border border-marca/50 px-3 py-1.5 text-xs text-marca transition hover:bg-marca/10"
                >
                  {tUsuarios("entrarComo")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Los primeros pasos de la marca, como los ve su dueño en el menú. */
function PasosCliente({ pasos }: { pasos: Cliente["pasos"] }) {
  const t = useTranslations("superadmin.clientes.pasos");
  const filas = [
    { clave: "configurada", hecho: pasos.marcaConfigurada, detalle: null },
    { clave: "episodio", hecho: pasos.primerEpisodio, detalle: null },
    {
      clave: "redes",
      hecho: pasos.redes.length > 0,
      detalle: pasos.redes.length > 0 ? pasos.redes.map((r) => NOMBRE_RED[r] ?? r).join(", ") : t("sinRedes"),
    },
  ] as const;

  return (
    <section className="rounded-lg border border-white/10 p-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{t("titulo")}</h3>
      <ul className="mt-2 space-y-2">
        {filas.map((f) => (
          <li key={f.clave} className="flex items-start gap-2 text-sm">
            <span aria-hidden className={f.hecho ? "text-marca" : "text-white/30"}>
              {f.hecho ? "✓" : "○"}
            </span>
            <span className={f.hecho ? "" : "text-white/60"}>
              {t(f.clave)}
              {f.detalle && <span className="block text-xs text-white/40">{f.detalle}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
