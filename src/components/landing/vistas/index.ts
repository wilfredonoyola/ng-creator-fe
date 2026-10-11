import type { IdSeccion } from "@/components/landing/funciones";
import { VISTAS_IA } from "./ia";
import { VISTAS_EDICION } from "./edicion";
import { VISTAS_AUDIO } from "./audio";
import { VISTAS_TEXTOS } from "./textos";
import { VISTAS_IMAGENES } from "./imagenes";
import { VISTAS_MARCA } from "./marca";
import { VISTAS_CALIDAD } from "./calidad";
import { VISTAS_IMPORTAR } from "./importar";
import { VISTAS_PUBLICAR } from "./publicar";
import { VISTAS_REVISION } from "./revision";
import { VISTAS_METRICAS } from "./metricas";
import { VISTAS_EQUIPO } from "./equipo";
import { VISTAS_APP } from "./app";

/**
 * La vista previa de cada tarjeta de /features/<sección>, por sección y por
 * clave de la función. Una tarjeta sin vista muestra solo su ícono.
 */
export const VISTAS: Partial<Record<IdSeccion, Record<string, () => JSX.Element>>> = {
  ia: VISTAS_IA,
  edicion: VISTAS_EDICION,
  audio: VISTAS_AUDIO,
  textos: VISTAS_TEXTOS,
  imagenes: VISTAS_IMAGENES,
  marca: VISTAS_MARCA,
  calidad: VISTAS_CALIDAD,
  importar: VISTAS_IMPORTAR,
  publicar: VISTAS_PUBLICAR,
  revision: VISTAS_REVISION,
  metricas: VISTAS_METRICAS,
  equipo: VISTAS_EQUIPO,
  app: VISTAS_APP,
};
