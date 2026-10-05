/**
 * Qué variante del HLS de Bunny pide la vista previa (ver `use-hls.ts`).
 *
 * Sin nada, hls.js arranca en la primera variante del manifiesto, que en
 * Bunny es la más baja: la agencia veía un video borroso y creía que así
 * salían los clips. Se arranca en la más alta y se le pide al ABR que no baje
 * por una estimación prudente; si de verdad no alcanza la conexión (el buffer
 * se vacía o un segmento tarda de más), igual puede bajar.
 *
 * Aparte y sin importar hls.js para poder probarla sola.
 */

export interface VarianteHls {
  width?: number;
  height?: number;
  bitrate?: number;
}

/** El índice de la variante con más píxeles (y, si empatan, más bitrate); -1 si no hay. */
export function indiceVarianteMasAlta(variantes: readonly VarianteHls[]): number {
  let mejor = -1;
  let pixeles = -1;
  let bitrate = -1;
  variantes.forEach((v, i) => {
    const px = (v.width ?? 0) * (v.height ?? 0) || (v.height ?? 0);
    const br = v.bitrate ?? 0;
    if (px > pixeles || (px === pixeles && br > bitrate)) {
      mejor = i;
      pixeles = px;
      bitrate = br;
    }
  });
  return mejor;
}

/**
 * La configuración de hls.js 1.7 para la vista previa.
 *
 * - `abrEwmaDefaultEstimate` alto (20 Mbps): hasta medir, el ABR supone una
 *   buena conexión en vez de 500 kbps, y no baja de entrada.
 * - `abrEwmaSlowVoD` más lento: una baja de velocidad corta no tira la
 *   estimación; las de verdad sí (y el ABR también mira el buffer: si se va a
 *   quedar sin video, baja igual, `maxStarvationDelay`).
 * - `capLevelToPlayerSize: false`: no se limita al tamaño del reproductor (es
 *   chico y elegiría 360p).
 * - `testBandwidth: false`: no baja un segmento de prueba en la más baja.
 *
 * `startLevel` se fija en MANIFEST_PARSED con `indiceVarianteMasAlta`.
 */
export const CONFIG_HLS_VISTA_PREVIA = {
  capLevelToPlayerSize: false,
  testBandwidth: false,
  abrEwmaDefaultEstimate: 20_000_000,
  abrEwmaDefaultEstimateMax: 20_000_000,
  abrEwmaSlowVoD: 15,
} as const;
