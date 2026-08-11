"use client";

import { normalizarPalabra, palabrasDe, type Texto } from "@/lib/montaje";

/**
 * Editor de un titular.
 *
 * Las palabras a destacar se eligen tocándolas, no escribiendo marcas dentro
 * del texto (`*RICKY*`): así no hay una sintaxis que aprender ni que se pueda
 * escribir mal, y se ve al instante cuáles están marcadas.
 *
 * Los controles finos (peso, interlineado, posición X) no están a propósito.
 * Esto tiene que resolverse en un par de minutos, y cada perilla de más es una
 * decisión que alguien tiene que tomar en cada video.
 */
export function ControlesTexto({
  titulo,
  texto,
  onCambio,
}: {
  titulo: string;
  texto: Texto;
  onCambio: (t: Texto) => void;
}) {
  const palabras = palabrasDe(texto.contenido);
  const marcadas = new Set(texto.destacadas.map(normalizarPalabra));

  function alternar(palabra: string) {
    const clave = normalizarPalabra(palabra);
    const quedan = texto.destacadas.filter(
      (p) => normalizarPalabra(p) !== clave,
    );
    onCambio({
      ...texto,
      destacadas: marcadas.has(clave) ? quedan : [...quedan, palabra],
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-white/35">
        {titulo}
      </h3>

      <textarea
        value={texto.contenido}
        onChange={(e) => onCambio({ ...texto, contenido: e.target.value })}
        rows={2}
        placeholder="Escribí el titular…"
        className="w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none transition focus:border-[#0FED9D]/50"
      />

      {palabras.length > 0 && (
        <div className="mt-2">
          <p className="mb-1.5 text-[11px] text-white/35">
            Tocá una palabra para destacarla
          </p>
          <div className="flex flex-wrap gap-1.5">
            {palabras.map((palabra) => {
              const activa = marcadas.has(normalizarPalabra(palabra));
              return (
                <button
                  key={palabra}
                  onClick={() => alternar(palabra)}
                  style={activa ? { backgroundColor: texto.colorDestacado } : {}}
                  className={`rounded px-2 py-1 text-[11px] font-semibold uppercase transition ${
                    activa
                      ? "text-white"
                      : "border border-white/10 text-white/50 hover:bg-white/5"
                  }`}
                >
                  {palabra}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-[11px] text-white/40">
          Tamaño
          <input
            type="range"
            min={28}
            max={120}
            step={2}
            value={texto.tamano}
            onChange={(e) =>
              onCambio({ ...texto, tamano: Number(e.target.value) })
            }
            className="w-24 accent-[#0FED9D]"
          />
          <span className="w-8 text-white/60">{texto.tamano}</span>
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-white/40">
          Alto
          <input
            type="range"
            min={0.03}
            max={0.97}
            step={0.005}
            value={texto.centroY}
            onChange={(e) =>
              onCambio({ ...texto, centroY: Number(e.target.value) })
            }
            className="w-24 accent-[#0FED9D]"
          />
        </label>

        <label className="flex items-center gap-1.5 text-[11px] text-white/40">
          Destacado
          <input
            type="color"
            value={texto.colorDestacado}
            onChange={(e) =>
              onCambio({ ...texto, colorDestacado: e.target.value })
            }
            className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent"
          />
        </label>
      </div>
    </div>
  );
}
