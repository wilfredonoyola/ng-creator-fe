"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useLocale, useTranslations } from "next-intl";
import { CAMBIAR_ESTADO_TICKET_SUPERADMIN, CLIENTES_SUPERADMIN, TICKETS_SOPORTE_SUPERADMIN } from "@/graphql/operations";
import { fechaCompleta, tiempoRelativo, useAhora } from "@/lib/time";

type EstadoTicket = "DERIVADA" | "EN_PROGRESO" | "CERRADA";

type Ticket = {
  _id: string;
  correo?: string | null;
  nombre?: string | null;
  estado: EstadoTicket | "ABIERTA";
  derivadaEn?: string | null;
  createdAt: string;
  updatedAt: string;
  pagina?: string | null;
  marcas: string[];
  mensajes: { rol: "PERSONA" | "ASISTENTE"; texto: string; fecha: string }[];
};

type Tickets = { abiertos: Ticket[]; enProgreso: Ticket[]; cerrados: Ticket[] };

/** Cada pestaña con el estado del backend que muestra. */
const PESTANAS = [
  { clave: "abiertos", estado: "DERIVADA" },
  { clave: "enProgreso", estado: "EN_PROGRESO" },
  { clave: "cerrados", estado: "CERRADA" },
] as const;
type Pestana = (typeof PESTANAS)[number]["clave"];

/**
 * Los tickets de soporte: las conversaciones del chat que la persona le pasó
 * al equipo ("Hablar con el equipo", que además manda el correo a
 * miguel@clipfine.io). Se leen enteras, se responden por correo y se mueven
 * de abierto a en progreso y a cerrado.
 */
export default function SoporteSuperadmin() {
  const t = useTranslations("superadmin.soporte");
  const [pestana, setPestana] = useState<Pestana>("abiertos");
  const [marcaId, setMarcaId] = useState("");
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  const { data: clientes } = useQuery<{ clientesSuperadmin: { marca: { _id: string; nombre: string } }[] }>(CLIENTES_SUPERADMIN, {
    fetchPolicy: "cache-first",
  });
  const { data, loading, error } = useQuery<Tickets>(TICKETS_SOPORTE_SUPERADMIN, {
    variables: { marcaId: marcaId || null },
    fetchPolicy: "cache-and-network",
  });

  const marcas = [...(clientes?.clientesSuperadmin ?? [])].map((c) => c.marca).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const tickets = data?.[pestana] ?? [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-2xl text-white/50">{t("subtitulo")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" className="flex flex-wrap gap-1.5">
          {PESTANAS.map((p) => (
            <button
              key={p.clave}
              role="tab"
              aria-selected={pestana === p.clave}
              onClick={() => setPestana(p.clave)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                pestana === p.clave ? "border-marca bg-marca/15 text-white" : "border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {t(`pestanas.${p.clave}`)} · {data?.[p.clave].length ?? "…"}
            </button>
          ))}
        </div>
        <select
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value)}
          aria-label={t("filtroCliente")}
          className="ml-auto max-w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 px-3 py-2 text-sm outline-none transition focus:border-ng-azul"
        >
          <option value="">{t("todosLosClientes")}</option>
          {marcas.map((m) => (
            <option key={m._id} value={m._id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-white/40">{t("cargando")}</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-white/40">{t(`vacio.${pestana}`)}</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((tk) => (
            <FilaTicket
              key={tk._id}
              ticket={tk}
              abierto={abiertoId === tk._id}
              onAlternar={() => setAbiertoId(abiertoId === tk._id ? null : tk._id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function FilaTicket({ ticket, abierto, onAlternar }: { ticket: Ticket; abierto: boolean; onAlternar: () => void }) {
  const t = useTranslations("superadmin.soporte");
  const locale = useLocale();
  const ahora = useAhora(60_000);
  const [error, setError] = useState<string | null>(null);
  const [cambiar, { loading }] = useMutation(CAMBIAR_ESTADO_TICKET_SUPERADMIN, {
    refetchQueries: [TICKETS_SOPORTE_SUPERADMIN, CLIENTES_SUPERADMIN],
  });

  const fecha = ticket.derivadaEn ?? ticket.createdAt;
  const ultimo = [...ticket.mensajes].reverse().find((m) => m.rol === "PERSONA");
  const asunto = t("asuntoCorreo", { marcas: ticket.marcas.join(", ") || "Clipfine" });

  async function mover(estado: EstadoTicket) {
    setError(null);
    try {
      await cambiar({ variables: { id: ticket._id, estado } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  const acciones: { estado: EstadoTicket; clave: "enProgreso" | "cerrar" | "reabrir" }[] =
    ticket.estado === "EN_PROGRESO"
      ? [
          { estado: "CERRADA", clave: "cerrar" },
          { estado: "DERIVADA", clave: "reabrir" },
        ]
      : ticket.estado === "CERRADA"
        ? [{ estado: "DERIVADA", clave: "reabrir" }]
        : [
            { estado: "EN_PROGRESO", clave: "enProgreso" },
            { estado: "CERRADA", clave: "cerrar" },
          ];

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03]">
      <button type="button" onClick={onAlternar} aria-expanded={abierto} className="block w-full p-4 text-left">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium">{ticket.nombre || ticket.correo || t("sinCorreo")}</span>
          {ticket.nombre && ticket.correo && <span className="text-xs text-white/50">{ticket.correo}</span>}
          {ticket.marcas.map((m) => (
            <span key={m} className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-white/70">
              {m}
            </span>
          ))}
          <span className="ml-auto text-xs text-white/40" title={fechaCompleta(fecha, locale)}>
            {tiempoRelativo(fecha, ahora, locale)}
          </span>
        </div>
        {ultimo && <p className="mt-1.5 line-clamp-2 text-sm text-white/60">{ultimo.texto}</p>}
        <p className="mt-1 text-xs text-white/35">{t("mensajes", { n: ticket.mensajes.length })}</p>
      </button>

      {abierto && (
        <div className="border-t border-white/10 p-4">
          {ticket.pagina && <p className="mb-3 text-xs text-white/40">{t("pagina", { pagina: ticket.pagina })}</p>}
          <ol className="space-y-2">
            {ticket.mensajes.map((m, i) => (
              <li key={i} className={`flex ${m.rol === "PERSONA" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.rol === "PERSONA" ? "bg-marca/15 text-white" : "border border-white/10 bg-white/[0.03] text-white/80"
                  }`}
                >
                  <p className="mb-0.5 text-[11px] text-white/40" title={fechaCompleta(m.fecha, locale)}>
                    {m.rol === "PERSONA" ? t("persona") : t("asistente")} · {tiempoRelativo(m.fecha, ahora, locale)}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ticket.correo && (
              <a
                href={`mailto:${ticket.correo}?subject=${encodeURIComponent(asunto)}`}
                className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-ng-tinta transition hover:brightness-110"
              >
                {t("responder")}
              </a>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              {acciones.map((a) => (
                <button
                  key={a.estado}
                  type="button"
                  onClick={() => mover(a.estado)}
                  disabled={loading}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:opacity-40"
                >
                  {t(`acciones.${a.clave}`)}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </li>
  );
}
