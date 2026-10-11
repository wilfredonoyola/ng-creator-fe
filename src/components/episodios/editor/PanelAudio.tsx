"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import { Check, Info, Pause, Play, Plus, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { ACTUALIZAR_SONIDO, BORRAR_SONIDO, SONIDOS } from "@/graphql/operations";
import {
  idEfecto,
  MAXIMO_EFECTOS,
  VOLUMEN_EFECTO_MAX,
  VOLUMEN_MUSICA_POR_DEFECTO,
  VOLUMEN_VOZ_MAX,
  type EfectoClip,
  type MusicaClip,
  type Sonido,
} from "@/lib/sonidos";
import { ListaSonidos } from "@/components/sonidos/ListaSonidos";
import { SubirSonido } from "@/components/sonidos/SubirSonido";
import { useEscucha } from "@/components/sonidos/useEscucha";
import { Interruptor, Seccion } from "./ui";
import { useTiempo, type Reproductor } from "./reproductor";
import { relojFino } from "./tipos";

const decimas = (n: number) => Math.round(n * 10) / 10;

/**
 * Audio (Tanda 2): el volumen de la voz, la música de fondo y los efectos.
 *
 * - La música y los efectos salen de la biblioteca: la de Clipfine más lo que
 *   subió la marca (eso se renombra y se borra acá).
 * - "Agregar en el cabezal" pone el efecto en el segundo donde está parado el
 *   video, en el tiempo original del clip (como los textos y las imágenes).
 * - Escuchar un sonido pausa el video, y darle play al video corta la escucha.
 */
export function PanelAudio({
  reproductor,
  desde,
  hasta,
  marcaId,
  volumenClip,
  onVolumenClip,
  musica,
  onMusica,
  efectos,
  onEfectos,
  efectoElegido,
  onElegirEfecto,
  puedeEditar,
}: {
  reproductor: Reproductor;
  desde: number;
  hasta: number;
  marcaId: string | null;
  volumenClip: number;
  onVolumenClip: (v: number) => void;
  musica: MusicaClip | null;
  onMusica: (m: MusicaClip | null) => void;
  efectos: EfectoClip[];
  onEfectos: (e: EfectoClip[]) => void;
  efectoElegido: string | null;
  onElegirEfecto: (id: string | null) => void;
  puedeEditar: boolean;
}) {
  const t = useTranslations("editorAudio");
  const { sonando: videoSonando, alternar: alternarVideo } = reproductor;
  const escucha = useEscucha(() => {
    if (reproductor.video.current && !reproductor.video.current.paused) alternarVideo();
  });
  const { parar } = escucha;
  useEffect(() => {
    if (videoSonando) parar();
  }, [videoSonando, parar]);

  const [eligiendoMusica, setEligiendoMusica] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [volumenAntes, setVolumenAntes] = useState(1);

  const sonidosQ = useQuery<{ sonidos: Sonido[] }>(SONIDOS, { variables: { marcaId: marcaId ?? "" }, skip: !marcaId });
  const [actualizar] = useMutation(ACTUALIZAR_SONIDO);
  const [borrar] = useMutation(BORRAR_SONIDO);
  const todos = sonidosQ.data?.sonidos ?? [];
  const deMusica = todos.filter((s) => s.tipo === "MUSICA");
  const deEfectos = todos.filter((s) => s.tipo === "EFECTO");
  const duracion = hasta - desde;

  const editable = (s: Sonido) => puedeEditar && Boolean(s.marcaId);
  const guardarSonido = async (s: Sonido, c: { titulo: string; categoria: string }) => {
    if (!marcaId) return;
    await actualizar({ variables: { id: s._id, marcaId, titulo: c.titulo, categoria: c.categoria } });
  };
  const borrarSonido = async (s: Sonido) => {
    if (!marcaId) return;
    await borrar({ variables: { id: s._id, marcaId } });
    await sonidosQ.refetch();
  };

  function elegirMusica(s: Sonido) {
    onMusica({
      sonidoId: s._id,
      url: s.url,
      titulo: s.titulo,
      volumen: musica?.volumen ?? VOLUMEN_MUSICA_POR_DEFECTO,
      bajarAlHablar: musica?.bajarAlHablar ?? true,
    });
    setEligiendoMusica(false);
  }

  function agregarEfecto(s: Sonido) {
    if (efectos.length >= MAXIMO_EFECTOS) return;
    // El cabezal, en el tiempo original del clip (el de la línea de tiempo).
    const enSeg = decimas(Math.min(Math.max(0, reproductor.reloj.get() - desde), Math.max(0, duracion - 0.1)));
    const nuevo: EfectoClip = { id: idEfecto(), sonidoId: s._id, url: s.url, titulo: s.titulo, enSeg, duracionSeg: s.duracionSeg, volumen: 1 };
    onEfectos([...efectos, nuevo]);
    onElegirEfecto(nuevo.id);
  }

  const cambiarEfecto = (id: string, cambio: Partial<EfectoClip>) => onEfectos(efectos.map((e) => (e.id === id ? { ...e, ...cambio } : e)));
  const silenciada = volumenClip === 0;
  const lleno = efectos.length >= MAXIMO_EFECTOS;
  const ordenados = [...efectos].sort((a, b) => a.enSeg - b.enSeg);

  return (
    <div className="space-y-6">
      {/* La voz */}
      <Seccion titulo={t("voz.titulo")}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (silenciada) onVolumenClip(volumenAntes || 1);
              else {
                setVolumenAntes(volumenClip);
                onVolumenClip(0);
              }
            }}
            disabled={!puedeEditar}
            aria-pressed={silenciada}
            title={silenciada ? t("voz.activar") : t("voz.silenciar")}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
              silenciada ? "bg-ng-azul text-ng-tinta" : "bg-ng-superficie text-white hover:bg-ng-elevada"
            }`}
          >
            {silenciada ? <VolumeX size={15} aria-hidden /> : <Volume2 size={15} aria-hidden />}
            {silenciada ? t("voz.silenciada") : t("voz.silenciar")}
          </button>
          <Deslizador
            etiqueta={t("voz.volumen")}
            valor={volumenClip}
            maximo={VOLUMEN_VOZ_MAX}
            onCambio={onVolumenClip}
            deshabilitado={!puedeEditar}
          />
        </div>
      </Seccion>

      {/* La música de fondo */}
      <Seccion
        titulo={t("musica.titulo")}
        extra={
          musica && puedeEditar && !eligiendoMusica ? (
            <button type="button" onClick={() => setEligiendoMusica(true)} className="text-xs font-medium text-ng-celeste hover:underline">
              {t("musica.cambiar")}
            </button>
          ) : null
        }
      >
        {musica && (
          <div className="space-y-3 rounded-ng-md border border-ng-azul/40 bg-ng-azul/5 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => escucha.alternar(`clip-${musica.sonidoId}`, musica.url)}
                aria-label={escucha.sonando === `clip-${musica.sonidoId}` ? t("pausar") : t("escuchar")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ng-elevada text-white hover:bg-white/15"
              >
                {escucha.sonando === `clip-${musica.sonidoId}` ? <Pause size={14} fill="currentColor" aria-hidden /> : <Play size={14} fill="currentColor" aria-hidden />}
              </button>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{musica.titulo}</p>
              {puedeEditar && (
                <button type="button" onClick={() => onMusica(null)} aria-label={t("musica.quitar")} title={t("musica.quitar")} className="p-1 text-ng-tenue hover:text-red-400">
                  <X size={16} aria-hidden />
                </button>
              )}
            </div>
            <Deslizador
              etiqueta={t("musica.volumen")}
              valor={musica.volumen}
              maximo={1}
              onCambio={(volumen) => onMusica({ ...musica, volumen })}
              deshabilitado={!puedeEditar}
            />
            <Interruptor
              etiqueta={t("musica.bajarAlHablar")}
              ayuda={t("musica.bajarAlHablarAyuda")}
              valor={musica.bajarAlHablar}
              onCambio={(bajarAlHablar) => onMusica({ ...musica, bajarAlHablar })}
              deshabilitado={!puedeEditar}
            />
          </div>
        )}
        {(!musica || eligiendoMusica) && (
          <>
            {eligiendoMusica && (
              <button type="button" onClick={() => setEligiendoMusica(false)} className="text-xs text-ng-secundario hover:text-white">
                {t("cerrarBiblioteca")}
              </button>
            )}
            <ListaSonidos
              sonidos={deMusica}
              cargando={sonidosQ.loading}
              escucha={escucha}
              elegido={musica?.sonidoId}
              editable={editable}
              onGuardar={guardarSonido}
              onBorrar={borrarSonido}
              vacio={t("musica.vacia")}
              altoMaximo="max-h-72"
              acciones={(s) =>
                puedeEditar ? (
                  musica?.sonidoId === s._id ? (
                    <span className="flex items-center gap-1 px-1 text-xs font-semibold text-ng-azul">
                      <Check size={14} aria-hidden />
                      {t("musica.elegida")}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => elegirMusica(s)}
                      className="shrink-0 rounded-lg bg-ng-elevada px-2.5 py-1 text-xs font-semibold text-white hover:bg-ng-azul hover:text-ng-tinta"
                    >
                      {t("musica.usar")}
                    </button>
                  )
                ) : null
              }
            />
          </>
        )}
      </Seccion>

      {/* Los efectos */}
      <Seccion titulo={t("efectos.titulo", { n: efectos.length, max: MAXIMO_EFECTOS })}>
        {ordenados.length > 0 ? (
          <ul className="space-y-1.5">
            {ordenados.map((ef) => (
              <li
                key={ef.id}
                className={`space-y-1.5 rounded-ng-md px-2.5 py-2 ${efectoElegido === ef.id ? "bg-ng-azul/10 ring-1 ring-ng-azul/60" : "bg-ng-superficie"}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onElegirEfecto(ef.id);
                      reproductor.irAlEpisodio(desde + ef.enSeg);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                    title={t("efectos.ir")}
                  >
                    <span className="mr-1.5 tabular-nums text-ng-azul">{relojFino(ef.enSeg)}</span>
                    {ef.titulo}
                  </button>
                  {puedeEditar && (
                    <button
                      type="button"
                      onClick={() => {
                        onEfectos(efectos.filter((x) => x.id !== ef.id));
                        if (efectoElegido === ef.id) onElegirEfecto(null);
                      }}
                      aria-label={t("efectos.quitar", { titulo: ef.titulo })}
                      title={t("efectos.quitar", { titulo: ef.titulo })}
                      className="p-1 text-ng-tenue hover:text-red-400"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                </div>
                <Deslizador
                  etiqueta={t("efectos.volumen")}
                  valor={ef.volumen}
                  maximo={VOLUMEN_EFECTO_MAX}
                  onCambio={(volumen) => cambiarEfecto(ef.id, { volumen })}
                  deshabilitado={!puedeEditar}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ng-tenue">{t("efectos.sinEfectos")}</p>
        )}
        {puedeEditar && (
          <p className="text-xs text-ng-secundario">
            {lleno ? t("efectos.lleno", { max: MAXIMO_EFECTOS }) : t.rich("efectos.ayuda", { cabezal: () => <Cabezal reproductor={reproductor} desde={desde} /> })}
          </p>
        )}
        <ListaSonidos
          sonidos={deEfectos}
          cargando={sonidosQ.loading}
          escucha={escucha}
          editable={editable}
          onGuardar={guardarSonido}
          onBorrar={borrarSonido}
          vacio={t("efectos.vacia")}
          altoMaximo="max-h-72"
          acciones={(s) =>
            puedeEditar ? (
              <button
                type="button"
                onClick={() => agregarEfecto(s)}
                disabled={lleno}
                aria-label={t("efectos.agregar", { titulo: s.titulo })}
                title={t("efectos.agregar", { titulo: s.titulo })}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-ng-elevada px-2 py-1 text-xs font-semibold text-white hover:bg-ng-azul hover:text-ng-tinta disabled:opacity-40"
              >
                <Plus size={13} aria-hidden />
                {t("efectos.enElCabezal")}
              </button>
            ) : null
          }
        />
      </Seccion>

      {/* Subir */}
      {puedeEditar && marcaId && (
        <Seccion titulo={t("subir.titulo")}>
          {subiendo ? (
            <SubirSonido
              destino={{ marcaId }}
              onSubido={(s) => {
                setSubiendo(false);
                void sonidosQ.refetch();
                if (s.tipo === "MUSICA" && !musica) elegirMusica(s);
              }}
              onCancelar={() => setSubiendo(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setSubiendo(true)}
              className="flex w-full items-center justify-center gap-2 rounded-ng-md border border-dashed border-white/20 px-3 py-2 text-sm text-ng-secundario hover:border-white/40 hover:text-white"
            >
              <Upload size={16} aria-hidden />
              {t("subir.boton")}
            </button>
          )}
        </Seccion>
      )}

      <p className="flex items-start gap-1.5 text-xs text-ng-tenue">
        <Info size={14} className="mt-px shrink-0" aria-hidden />
        <span>{t("licencia")}</span>
      </p>
    </div>
  );
}

/** El tiempo del cabezal, en el tiempo original del clip. Se redibuja solo él. */
function Cabezal({ reproductor, desde }: { reproductor: Reproductor; desde: number }) {
  const t = useTiempo(reproductor.reloj);
  return <span className="font-semibold tabular-nums text-white">{relojFino(t - desde)}</span>;
}

/** Un deslizador de volumen en porcentaje (1 = 100 %). */
function Deslizador({
  etiqueta,
  valor,
  maximo,
  onCambio,
  deshabilitado,
}: {
  etiqueta: string;
  valor: number;
  maximo: number;
  onCambio: (v: number) => void;
  deshabilitado?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ng-secundario">
      <span className="sr-only">{etiqueta}</span>
      <input
        type="range"
        min={0}
        max={Math.round(maximo * 100)}
        step={5}
        value={Math.round(valor * 100)}
        onChange={(e) => onCambio(Number(e.target.value) / 100)}
        disabled={deshabilitado}
        aria-label={etiqueta}
        className="min-w-0 flex-1 accent-ng-azul disabled:opacity-40"
      />
      <span className="w-10 shrink-0 text-right tabular-nums text-white">{Math.round(valor * 100)}%</span>
    </label>
  );
}
