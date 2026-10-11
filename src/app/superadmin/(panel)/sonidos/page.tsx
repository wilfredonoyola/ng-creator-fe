"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { ACTUALIZAR_SONIDO_GLOBAL, BORRAR_SONIDO_GLOBAL, SONIDOS_GLOBALES } from "@/graphql/operations";
import type { Sonido, TipoSonido } from "@/lib/sonidos";
import { ListaSonidos, type CambiosSonido } from "@/components/sonidos/ListaSonidos";
import { SubirSonido } from "@/components/sonidos/SubirSonido";
import { useEscucha } from "@/components/sonidos/useEscucha";

const TIPOS: TipoSonido[] = ["MUSICA", "EFECTO"];

/**
 * La biblioteca de sonidos de Clipfine (Tanda 2, be#173): la música y los
 * efectos que ven todas las marcas en el editor. Se sube con `global=true` y
 * siempre con la fuente y la licencia anotadas.
 */
export default function SonidosSuperadmin() {
  const t = useTranslations("superadmin.sonidos");
  const tb = useTranslations("bibliotecaSonidos");
  const [tipo, setTipo] = useState<TipoSonido>("MUSICA");
  const [subiendo, setSubiendo] = useState(false);
  const escucha = useEscucha();
  const { data, loading, error, refetch } = useQuery<{ sonidosGlobales: Sonido[] }>(SONIDOS_GLOBALES, {
    fetchPolicy: "cache-and-network",
  });
  const [actualizar] = useMutation(ACTUALIZAR_SONIDO_GLOBAL);
  const [borrar] = useMutation(BORRAR_SONIDO_GLOBAL);

  const todos = data?.sonidosGlobales ?? [];
  const delTipo = todos.filter((s) => s.tipo === tipo);

  async function guardar(s: Sonido, c: CambiosSonido) {
    await actualizar({ variables: { id: s._id, titulo: c.titulo, categoria: c.categoria, fuente: c.fuente } });
  }

  async function quitar(s: Sonido) {
    await borrar({ variables: { id: s._id } });
    await refetch();
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("titulo")}</h1>
        <p className="mt-1 max-w-3xl text-white/50">{t("subtitulo")}</p>
      </div>

      <div className="mb-6 rounded-xl border border-ng-azul/30 bg-ng-azul/5 p-4 text-sm text-white/80">{t("ayuda")}</div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-400">{error.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex gap-1">
            {TIPOS.map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setTipo(x)}
                aria-pressed={tipo === x}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${tipo === x ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}
              >
                {tb(`tipos.${x}`)} <span className="text-white/40">· {todos.filter((s) => s.tipo === x).length}</span>
              </button>
            ))}
          </div>
          <ListaSonidos
            sonidos={delTipo}
            cargando={loading}
            escucha={escucha}
            editable={() => true}
            conFuente
            fuenteObligatoria
            onGuardar={guardar}
            onBorrar={quitar}
            vacio={t("vacio")}
          />
        </section>

        <aside className="space-y-3">
          <h2 className="font-semibold">{t("subir")}</h2>
          {subiendo ? (
            <SubirSonido
              destino={{ global: true }}
              conFuente
              tipoInicial={tipo}
              onSubido={(s) => {
                setSubiendo(false);
                setTipo(s.tipo);
                void refetch();
              }}
              onCancelar={() => setSubiendo(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSubiendo(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-3 text-sm text-white/70 hover:border-white/40 hover:text-white"
            >
              <Upload size={16} aria-hidden />
              {t("subirBoton")}
            </button>
          )}
        </aside>
      </div>
    </>
  );
}
