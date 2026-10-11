"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { GUARDAR_AJUSTES_REVISION } from "@/graphql/operations";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { useRevisionMarca, type AlVencerRevision } from "@/lib/revision";

const OPCIONES: AlVencerRevision[] = ["NO_PUBLICAR", "PUBLICAR_IGUAL"];

/** Lo que hace falta del equipo para saber quién revisa y quién programa. */
export interface MiembroRevision {
  usuarioId: string;
  rol: string;
  revisor?: boolean | null;
  nombre?: string | null;
  email: string;
}

/**
 * Quién revisa y si la revisión sirve de algo con el equipo de hoy:
 * - `sinEditores`: no hay editores que no sean revisores, y lo que programa un
 *   revisor queda aprobado solo. La revisión no frena nada todavía.
 * - `soloPropietario`: hay editores, pero todo le llega al propietario.
 */
export function estadoRevisores(miembros: MiembroRevision[]) {
  const nombre = (m: MiembroRevision) => m.nombre?.trim() || m.email.split("@")[0];
  const revisores = miembros.filter((m) => m.rol === "PROPIETARIO" || m.revisor);
  const programan = miembros.filter((m) => m.rol === "EDITOR" && !m.revisor);
  return {
    nombres: revisores.map(nombre),
    sinEditores: programan.length === 0,
    soloPropietario: revisores.every((m) => m.rol === "PROPIETARIO"),
  };
}

/**
 * "Revisión antes de publicar" (ng-creator-be#175): si los clips de la marca se
 * aprueban antes de salir y qué pasa si llega la hora sin revisión. Quiénes
 * revisan se marca en cada fila del equipo, abajo.
 *
 * Lo cambia el propietario o un ADMIN (el backend lo impone igual); el resto lo
 * ve en solo lectura.
 */
export function AjustesRevisionMarca({
  miembros,
  verEquipo,
}: {
  /** null mientras carga: no se avisa nada hasta saber quién está. */
  miembros: MiembroRevision[] | null;
  verEquipo: () => void;
}) {
  const t = useTranslations("revisionClip.ajustes");
  const { activa: marca } = useMarcaActiva();
  const { esAdmin, esPropietario } = useSesion();
  const marcaId = marca?._id;
  const puede = esAdmin || esPropietario(marcaId);
  const { ajustes, cargando } = useRevisionMarca(marcaId);
  const [guardarMut, { loading: guardando }] = useMutation(GUARDAR_AJUSTES_REVISION, {
    refetchQueries: ["AjustesRevision"],
  });

  const [activa, setActiva] = useState(false);
  const [alVencer, setAlVencer] = useState<AlVencerRevision>("NO_PUBLICAR");
  const [cambiado, setCambiado] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    setActiva(!!ajustes?.activa);
    setAlVencer(ajustes?.alVencer ?? "NO_PUBLICAR");
    setCambiado(false);
  }, [ajustes, marcaId]);

  if (!marca) return null;

  async function guardar() {
    setAviso(null);
    try {
      await guardarMut({ variables: { marcaId, activa, alVencer } });
      setCambiado(false);
      setAviso({ tono: "ok", texto: t("guardado") });
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : t("errorGuardar") });
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
      <p className="mt-1 text-sm text-white/50">{t("descripcion", { marca: marca.nombre })}</p>

      <label
        className={`mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3 ${
          puede ? "cursor-pointer" : "cursor-not-allowed opacity-70"
        }`}
      >
        <span className="text-sm font-medium">{t("activa")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={activa}
          aria-label={t("activa")}
          disabled={!puede}
          onClick={() => {
            setActiva((v) => !v);
            setCambiado(true);
            setAviso(null);
          }}
          className={`relative h-5 w-9 shrink-0 rounded-full transition disabled:cursor-not-allowed ${
            activa ? "bg-marca" : "bg-white/15"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
              activa ? "left-[18px] bg-ng-tinta" : "left-0.5"
            }`}
          />
        </button>
      </label>

      {activa && (
        <>
          <h3 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-white/45">{t("alVencer")}</h3>
          <div className="space-y-2">
            {OPCIONES.map((o) => {
              const clave = o === "NO_PUBLICAR" ? "noPublicar" : "publicarIgual";
              return (
                <label
                  key={o}
                  className={`flex gap-3 rounded-xl border p-3 ${
                    alVencer === o ? "border-marca/50 bg-marca/[0.06]" : "border-white/10 bg-black/20"
                  } ${puede ? "cursor-pointer" : "cursor-not-allowed opacity-70"}`}
                >
                  <input
                    type="radio"
                    name="alVencer"
                    value={o}
                    checked={alVencer === o}
                    disabled={!puede}
                    onChange={() => {
                      setAlVencer(o);
                      setCambiado(true);
                      setAviso(null);
                    }}
                    className="mt-1 accent-[#FFD400]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{t(clave)}</span>
                    <span className="block text-xs text-white/45">{t(`${clave}Ayuda`)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          <h3 className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-white/45">{t("revisores")}</h3>
          <p className="text-xs text-white/45">{t("revisoresAyuda")}</p>
          {miembros && <ChequeoRevisores miembros={miembros} verEquipo={verEquipo} />}
        </>
      )}

      {puede ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando || !cambiado}
            className="rounded-lg bg-marca px-4 py-2 text-sm font-medium text-ng-tinta transition hover:brightness-110 disabled:opacity-40"
          >
            {guardando ? t("guardando") : t("guardar")}
          </button>
          {aviso && (
            <p className={`text-xs ${aviso.tono === "ok" ? "text-ng-teal" : "text-red-400"}`}>{aviso.texto}</p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/40">{t("soloPropietario")}</p>
      )}
    </section>
  );
}

/**
 * Antes de guardar: quién va a revisar, y un aviso si con el equipo de hoy la
 * revisión no frena nada o todo cae en una sola persona.
 */
function ChequeoRevisores({ miembros, verEquipo }: { miembros: MiembroRevision[]; verEquipo: () => void }) {
  const t = useTranslations("revisionClip.ajustes.chequeo");
  const { nombres, sinEditores, soloPropietario } = estadoRevisores(miembros);
  const aviso = sinEditores ? "sinEditores" : soloPropietario ? "soloPropietario" : null;
  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-sm ${
        aviso ? "border-amber-400/30 bg-amber-400/[0.06]" : "border-ng-teal/30 bg-ng-teal/[0.06]"
      }`}
    >
      <p className="font-medium">
        {aviso ? "⚠️ " : "✓ "}
        {t("revisan", { n: nombres.length, nombres: nombres.join(", ") })}
      </p>
      {aviso && <p className="mt-1 text-xs text-white/60">{t(aviso)}</p>}
      {aviso === "soloPropietario" && (
        <button type="button" onClick={verEquipo} className="mt-2 text-xs font-medium text-marca hover:underline">
          {t("marcarRevisores")}
        </button>
      )}
    </div>
  );
}
