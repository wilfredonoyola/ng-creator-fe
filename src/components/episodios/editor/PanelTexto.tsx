"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { GaleriaEstilos } from "@/components/estilos/GaleriaEstilos";
import { PanelTextos } from "@/components/episodios/PanelTextos";
import { ESTILO_TEXTO_POR_DEFECTO, temaValido, type EstiloTexto } from "@/lib/estilos-texto";
import type { Texto } from "@/lib/clip-encuadre";
import type { EstiloClip } from "./tipos";
import { Seccion } from "./ui";

/**
 * Texto: el gancho y los demás textos encima del video, y el estilo con que
 * salen (también el de los subtítulos). Moverlos se hace en el video; cuándo
 * aparecen, con sus bordes en la línea de tiempo.
 */
export function PanelTexto({
  textos,
  onCambiarTextos,
  elegido,
  onElegir,
  duracion,
  estilo,
  estiloTexto,
  onCambiarEstiloTexto,
  nombreEstilo,
  nombreMarca,
  puedeEditar,
}: {
  textos: Texto[];
  onCambiarTextos: (t: Texto[]) => void;
  elegido: number | null;
  onElegir: (i: number | null) => void;
  duracion: number;
  estilo: EstiloClip;
  /** El del clip; null = el de la marca. */
  estiloTexto: EstiloTexto | null;
  onCambiarEstiloTexto: (e: EstiloTexto | null) => void;
  /** El nombre del estilo que manda sobre la letra y los colores (si no es KARAOKE). */
  nombreEstilo?: string;
  nombreMarca?: string;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const tClip = useTranslations("editorClip");
  return (
    <div className="space-y-6">
      <Seccion>
        {nombreEstilo && <p className="mb-3 text-xs text-white/45">{tClip("textosConEstilo", { estilo: nombreEstilo })}</p>}
        <PanelTextos
          textos={textos}
          onCambiar={onCambiarTextos}
          elegido={elegido}
          onElegir={onElegir}
          duracion={duracion}
          colorMarca={estilo.colorResaltado}
          deshabilitado={!puedeEditar}
        />
        <p className="text-xs text-ng-tenue">{tr("texto.ayuda")}</p>
      </Seccion>

      <Seccion titulo={tClip("pestanas.estilo.titulo")}>
        <GaleriaEstilos
          enPanel
          tema={temaValido(estilo.tema)}
          valor={estiloTexto}
          onElegir={onCambiarEstiloTexto}
          deLaMarca={estilo.estiloTexto ?? ESTILO_TEXTO_POR_DEFECTO}
          nombreMarca={nombreMarca}
          deshabilitado={!puedeEditar}
        />
        <p className="text-xs text-white/40">
          {tClip.rich("estiloAyuda", {
            link: (c) => (
              <Link href="/admin/plantilla" className="text-ng-celeste hover:underline">
                {c}
              </Link>
            ),
          })}
        </p>
      </Seccion>
    </div>
  );
}
