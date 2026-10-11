import { MaquetaApp } from "./MaquetaApp";
import { MaquetaAudio } from "./MaquetaAudio";
import { MaquetaClipsSubidos } from "./MaquetaClipsSubidos";
import { MaquetaCalidad } from "./MaquetaCalidad";
import { MaquetaEdicion } from "./MaquetaEdicion";
import { MaquetaEquipo } from "./MaquetaEquipo";
import { MaquetaIa } from "./MaquetaIa";
import { MaquetaImagenes } from "./MaquetaImagenes";
import { MaquetaImportar } from "./MaquetaImportar";
import { MaquetaMarca } from "./MaquetaMarca";
import { MaquetaMetricas } from "../MaquetaMetricas";
import { MaquetaPublicar } from "./MaquetaPublicar";
import { MaquetaRevision } from "./MaquetaRevision";
import { MaquetaTextos } from "./MaquetaTextos";

/** La maqueta de cada sección de /features, por el id de la sección. */
export const MAQUETAS = {
  ia: MaquetaIa,
  edicion: MaquetaEdicion,
  audio: MaquetaAudio,
  textos: MaquetaTextos,
  imagenes: MaquetaImagenes,
  marca: MaquetaMarca,
  calidad: MaquetaCalidad,
  importar: MaquetaImportar,
  "subir-clips": MaquetaClipsSubidos,
  publicar: MaquetaPublicar,
  revision: MaquetaRevision,
  // La misma de la landing: lo que se ve en /metricas, con datos de ejemplo.
  metricas: MaquetaMetricas,
  equipo: MaquetaEquipo,
  app: MaquetaApp,
} as const;
