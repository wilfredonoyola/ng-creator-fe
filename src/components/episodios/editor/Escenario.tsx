"use client";

import { useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play, Smartphone } from "lucide-react";
import { useHls } from "@/lib/use-hls";
import { SelectorPlataforma } from "@/components/estilos/InterfazPlataforma";
import type { Plataforma } from "@/lib/plataformas";
import { aTiempoDeSalida } from "@/lib/cortes";
import { posicionEn } from "@/lib/clip-encuadre";
import { CuadroRecorte } from "./CuadroRecorte";
import { VistaPrevia } from "./VistaPrevia";
import { useTiempo, type Reproductor } from "./reproductor";
import { reloj } from "./tipos";

type PropsVista = Omit<ComponentProps<typeof VistaPrevia>, "plataforma">;

/**
 * El centro del editor: la vista previa con reproducir y "ver como en la red".
 * En Formato y Auto-encuadre, al lado, el cuadro entero del episodio con los
 * recuadros del recorte para moverlos.
 */
export function Escenario({
  url,
  conCuadro,
  onCambiarPosiciones,
  velocidad,
  ...vista
}: PropsVista & {
  url: string;
  /** Muestra el cuadro entero con los recuadros (Formato, Auto-encuadre). */
  conCuadro: boolean;
  onCambiarPosiciones: ComponentProps<typeof CuadroRecorte>["onCambiarPosiciones"];
  /** El reloj de abajo cuenta en el tiempo del MP4, ya con la velocidad. */
  velocidad: number;
}) {
  const tr = useTranslations("editorHerramientas");
  const tRecorte = useTranslations("editorRecorte");
  const { reproductor, posiciones, desde, hasta, efectiva, cortes, formato, puedeEditar } = vista;
  useHls(reproductor.video, url);
  const [plataforma, setPlataforma] = useState<Plataforma | null>(null);
  const [verRedes, setVerRedes] = useState(false);
  const t = useTiempo(reproductor.reloj);
  const tc = Math.min(Math.max(0, t - desde), hasta - desde);
  const activa = posicionEn(posiciones, tc);
  const ts = Math.min(aTiempoDeSalida(Math.min(Math.max(t, desde), hasta), desde, cortes), efectiva);

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-3 md:p-4">
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center gap-4">
        <CuadroRecorte
          reproductor={reproductor}
          mostrar={conCuadro}
          formato={formato}
          posiciones={posiciones}
          indiceActiva={Math.max(0, posiciones.indexOf(activa))}
          onCambiarPosiciones={onCambiarPosiciones}
          puedeEditar={puedeEditar}
        />
        <div className={conCuadro ? "w-[34%] max-w-[18rem] shrink-0" : "flex w-full min-w-0 justify-center"}>
          <VistaPrevia {...vista} velocidad={velocidad} plataforma={formato === "VERTICAL" ? plataforma : null} />
        </div>
      </div>

      {verRedes && formato === "VERTICAL" && <SelectorPlataforma valor={plataforma} onCambio={setPlataforma} />}

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setVerRedes((v) => !v)}
          disabled={formato !== "VERTICAL"}
          aria-pressed={verRedes}
          aria-label={tr("escenario.verEnRed")}
          title={formato === "VERTICAL" ? tr("escenario.verEnRed") : tr("escenario.verEnRedSoloVertical")}
          className={`flex h-10 w-10 items-center justify-center rounded-ng-md transition disabled:opacity-30 ${
            verRedes || plataforma ? "bg-ng-superficie text-ng-azul" : "text-white hover:bg-ng-superficie"
          }`}
        >
          <Smartphone size={20} aria-hidden />
        </button>
        <button
          type="button"
          onClick={reproductor.alternar}
          aria-label={reproductor.sonando ? tRecorte("pausa") : tRecorte("reproducir")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ng-superficie text-white hover:bg-ng-elevada"
        >
          {reproductor.sonando ? <Pause size={20} aria-hidden fill="currentColor" /> : <Play size={20} aria-hidden fill="currentColor" />}
        </button>
        <span className="w-24 text-sm tabular-nums text-ng-secundario">
          <span className="font-semibold text-white">{reloj(ts / velocidad)}</span> / {reloj(efectiva / velocidad)}
        </span>
      </div>
    </div>
  );
}
