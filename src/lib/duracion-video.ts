/**
 * Cuánto dura el video, en segundos.
 *
 * `MediaRecorder` no escribe la duración en el encabezado del webm, así que el
 * navegador devuelve `Infinity` hasta que alguien recorre el archivo. El rodeo
 * conocido es pedirle que salte a un punto imposible: al chocar con el final,
 * el reproductor ya sabe dónde termina.
 *
 * Devuelve null si no se puede medir, y con un tope de tiempo por si el
 * navegador nunca contesta. La duración es un aviso, no un requisito: vale
 * mucho más mandar el video sin ella que dejar la subida esperando.
 */
export function medirDuracion(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";

    let resuelto = false;
    const terminar = (valor: number | null) => {
      if (resuelto) return;
      resuelto = true;
      v.src = "";
      resolve(valor);
    };

    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) {
        terminar(v.duration);
        return;
      }
      v.ontimeupdate = () => {
        v.ontimeupdate = null;
        terminar(Number.isFinite(v.duration) ? v.duration : null);
      };
      v.currentTime = 1e101;
    };
    v.onerror = () => terminar(null);
    setTimeout(() => terminar(null), 3000);

    v.src = url;
  });
}

/** La duración de un archivo elegido, sin subirlo. Null si el navegador no la sabe leer. */
export async function duracionDeArchivo(archivo: File): Promise<number | null> {
  const url = URL.createObjectURL(archivo);
  try {
    return await medirDuracion(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
