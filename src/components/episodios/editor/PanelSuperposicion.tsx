"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { PanelImagenes } from "@/components/episodios/PanelImagenes";
import { PanelVideos } from "@/components/episodios/PanelVideos";
import type { EstadoRecorte, ImagenClip } from "@/lib/clip-encuadre";
import type { TramoDelClip, VideoClip } from "@/lib/videos-clip";
import type { EstiloClip } from "./tipos";
import { Interruptor, Seccion } from "./ui";

/**
 * Superposición: las imágenes encima del video (hasta tres, con o sin fondo),
 * los videos (hasta tres, con o sin sonido) y el Brand Kit de la marca (logo y llamada a la acción al final).
 */
export function PanelSuperposicion({
  imagenes,
  estados,
  lentas,
  onReintentar,
  onCambiarImagenes,
  elegida,
  onElegir,
  onSubir,
  videos,
  onCambiarVideos,
  videoElegido,
  onElegirVideo,
  onSubirVideo,
  tramo,
  duracion,
  estilo,
  plantillaActiva,
  onPlantillaActiva,
  puedeEditar,
}: {
  imagenes: ImagenClip[];
  estados: (EstadoRecorte | null)[];
  lentas: boolean[];
  onReintentar: (i: number) => void;
  onCambiarImagenes: (im: ImagenClip[]) => void;
  elegida: number | null;
  onElegir: (i: number | null) => void;
  onSubir: (file: File) => Promise<void>;
  videos: VideoClip[];
  onCambiarVideos: (v: VideoClip[]) => void;
  videoElegido: number | null;
  onElegirVideo: (i: number | null) => void;
  onSubirVideo: (file: File, onAvance: (porcentaje: number) => void) => Promise<void>;
  /** El clip en el episodio con sus cortes (los videos pasan sus tiempos a la salida). */
  tramo: TramoDelClip;
  duracion: number;
  estilo: EstiloClip;
  plantillaActiva: boolean;
  onPlantillaActiva: (v: boolean) => void;
  puedeEditar: boolean;
}) {
  const tr = useTranslations("editorHerramientas");
  const tClip = useTranslations("editorClip");
  const link = (c: React.ReactNode) => (
    <Link href="/admin/plantilla#logo" className="text-ng-celeste hover:underline">
      {c}
    </Link>
  );
  const conPlantilla = Boolean(estilo.plantilla && (estilo.plantilla.logoActivo || estilo.plantilla.ctaActivo));
  const conLogo = Boolean(estilo.plantilla?.logoActivo && estilo.logoUrl);
  const conLlamada = Boolean(estilo.plantilla?.ctaActivo && estilo.plantilla.ctaTexto.trim());

  return (
    <div className="space-y-6">
      <Seccion>
        <PanelImagenes
          imagenes={imagenes}
          estados={estados}
          lentas={lentas}
          onReintentar={onReintentar}
          onCambiar={onCambiarImagenes}
          elegida={elegida}
          onElegir={onElegir}
          onSubir={onSubir}
          duracion={duracion}
          deshabilitado={!puedeEditar}
        />
        <p className="text-xs text-ng-tenue">{tr("superposicion.ayuda")}</p>
      </Seccion>

      <Seccion>
        <PanelVideos
          videos={videos}
          onCambiar={onCambiarVideos}
          elegido={videoElegido}
          onElegir={onElegirVideo}
          onSubir={onSubirVideo}
          tramo={tramo}
          deshabilitado={!puedeEditar}
        />
        <p className="text-xs text-ng-tenue">{tr("superposicion.ayudaVideos")}</p>
      </Seccion>

      <Seccion titulo={tClip("pestanas.marca.titulo")}>
        {conPlantilla ? (
          <>
            <Interruptor
              etiqueta={tClip(conLogo && conLlamada ? "marca.ambos" : conLogo ? "marca.logo" : conLlamada ? "marca.llamada" : "marca.brandKit")}
              ayuda={tClip.rich("marca.seConfigura", { link })}
              valor={plantillaActiva}
              onCambio={onPlantillaActiva}
              deshabilitado={!puedeEditar}
            />
          </>
        ) : (
          <p className="text-xs text-white/50">{tClip.rich("marca.sinBrandKit", { link })}</p>
        )}
      </Seccion>
    </div>
  );
}
