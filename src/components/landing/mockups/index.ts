import { MaquetaApp } from "./MaquetaApp";
import { MaquetaCalidad } from "./MaquetaCalidad";
import { MaquetaEdicion } from "./MaquetaEdicion";
import { MaquetaEquipo } from "./MaquetaEquipo";
import { MaquetaIa } from "./MaquetaIa";
import { MaquetaImagenes } from "./MaquetaImagenes";
import { MaquetaImportar } from "./MaquetaImportar";
import { MaquetaMarca } from "./MaquetaMarca";
import { MaquetaMetricas } from "../MaquetaMetricas";
import { MaquetaPublicar } from "./MaquetaPublicar";
import { MaquetaTextos } from "./MaquetaTextos";

/** La maqueta de cada sección de /features, por el id de la sección. */
export const MAQUETAS = {
  ia: MaquetaIa,
  edicion: MaquetaEdicion,
  textos: MaquetaTextos,
  imagenes: MaquetaImagenes,
  marca: MaquetaMarca,
  calidad: MaquetaCalidad,
  importar: MaquetaImportar,
  publicar: MaquetaPublicar,
  // La misma de la landing: lo que se ve en /metricas, con datos de ejemplo.
  metricas: MaquetaMetricas,
  equipo: MaquetaEquipo,
  app: MaquetaApp,
} as const;
