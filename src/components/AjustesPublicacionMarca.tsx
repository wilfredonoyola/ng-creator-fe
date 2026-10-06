"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@apollo/client";
import { useTranslations } from "next-intl";
import { GUARDAR_AJUSTES_PUBLICACION } from "@/graphql/operations";
import { HashtagsChips } from "@/components/HashtagsChips";
import { IconoRed } from "@/components/IconoRed";
import { useMarcaActiva } from "@/lib/marca-activa";
import { useSesion } from "@/lib/sesion";
import { useAjustesPublicacion } from "@/lib/ajustes-publicacion";
import { useDestinosMarca } from "@/lib/destinos";
import { REDES } from "@/lib/publicaciones";

/**
 * "Al publicar, por defecto": los hashtags que se precargan en cada clip de la
 * marca y qué cuentas salen marcadas. En cada publicación se puede quitar un
 * hashtag o una red; esto es solo el punto de partida.
 *
 * Lo cambia el propietario o un ADMIN (el backend lo impone igual); el resto lo
 * ve en solo lectura. Una cuenta que se conecta después sale marcada sola: se
 * guardan las apagadas, no las prendidas.
 */
export function AjustesPublicacionMarca() {
  const t = useTranslations("ajustesPublicacion");
  const { activa: marca } = useMarcaActiva();
  const { esAdmin, esPropietario } = useSesion();
  const marcaId = marca?._id;
  const puede = esAdmin || esPropietario(marcaId);
  const { ajustes, cargando } = useAjustesPublicacion(marcaId);
  const { destinos, cargando: cargandoDestinos } = useDestinosMarca(marca);
  const [guardarMut, { loading: guardando }] = useMutation(GUARDAR_AJUSTES_PUBLICACION, {
    refetchQueries: ["AjustesPublicacion"],
  });

  const [hashtags, setHashtags] = useState<string[]>([]);
  const [apagados, setApagados] = useState<Set<string>>(new Set());
  const [cambiado, setCambiado] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  // Lo guardado pisa lo local al cargar o al cambiar de marca, no mientras se edita.
  useEffect(() => {
    setHashtags(ajustes?.hashtags ?? []);
    setApagados(new Set(ajustes?.destinosApagados ?? []));
    setCambiado(false);
  }, [ajustes, marcaId]);

  if (!marca) return null;

  function alternar(cuentaId: string) {
    if (!puede) return;
    setApagados((s) => {
      const n = new Set(s);
      if (n.has(cuentaId)) n.delete(cuentaId);
      else n.add(cuentaId);
      return n;
    });
    setCambiado(true);
    setAviso(null);
  }

  async function guardar() {
    setAviso(null);
    try {
      await guardarMut({
        variables: { marcaId, hashtags, destinosApagados: Array.from(apagados) },
      });
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
        {(cargando || cargandoDestinos) && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
        )}
      </div>
      <p className="mt-1 text-sm text-white/50">{t("descripcion", { marca: marca.nombre })}</p>

      <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-white/45">{t("hashtags")}</h3>
      <HashtagsChips
        valor={hashtags}
        onChange={
          puede
            ? (h) => {
                setHashtags(h);
                setCambiado(true);
                setAviso(null);
              }
            : undefined
        }
      />
      <p className="mt-1 text-xs text-white/40">{t("hashtagsAyuda")}</p>

      <h3 className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wide text-white/45">{t("cuentas")}</h3>
      {destinos.length === 0 ? (
        <p className="text-xs text-white/40">{cargandoDestinos ? "…" : t("sinCuentas")}</p>
      ) : (
        <div className="space-y-2">
          {destinos.map((d) => {
            const on = !apagados.has(d.cuentaId);
            return (
              <div key={d.clave} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <IconoRed url={d.foto} red={d.red} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.nombre}</p>
                  <p className={`text-xs ${d.motivo ? "text-amber-300" : "text-white/40"}`}>
                    {REDES[d.red]?.nombre ?? d.red}
                    {d.motivo ? ` · ${t(`motivos.${d.motivo}`)}` : ""}
                  </p>
                </div>
                <label
                  className={`flex shrink-0 items-center gap-2 text-xs ${puede ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                >
                  <span className="text-white/60">{t("preseleccionada")}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={t("preseleccionadaEn", { cuenta: d.nombre })}
                    disabled={!puede}
                    onClick={() => alternar(d.cuentaId)}
                    className={`relative h-5 w-9 rounded-full transition disabled:cursor-not-allowed ${
                      on ? "bg-marca" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        on ? "left-[18px] bg-ng-tinta" : "left-0.5"
                      }`}
                    />
                  </button>
                </label>
              </div>
            );
          })}
        </div>
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
