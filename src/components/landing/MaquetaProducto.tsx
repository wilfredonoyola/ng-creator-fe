import { Sparkles } from "lucide-react";

/**
 * Lo que se ve del producto en la portada: un episodio y los clips que la IA
 * sacó de él. Dibujado con HTML en vez de una captura para que se vea nítido
 * en cualquier pantalla y no quede viejo cuando cambie la interfaz; los
 * datos son los del Programa #18 de Atlanta Sin Filtro, que existe.
 */
const CLIPS = [
  { puntaje: 85, titulo: "¿Cuál es tu mayor fantasía?", motivo: "Humor", dur: "0:31" },
  { puntaje: 75, titulo: "El nombre más feo del mundo", motivo: "Humor", dur: "0:20" },
  { puntaje: 75, titulo: "La última vez que lloré", motivo: "Emoción", dur: "0:29" },
];

export function MaquetaProducto() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.28), rgba(139,92,246,0.14) 45%, transparent 70%)" }}
      />
      <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta/90 p-4 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-gradient-to-br from-[#1e293b] to-[#0b0f1a] text-[10px] text-white/40">
            2:24:04
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Atlanta Sin Filtro · Programa #18</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ng-teal">
              <Sparkles size={12} aria-hidden /> 11 clips sugeridos por la IA
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {CLIPS.map((c, i) => (
            <li
              key={c.titulo}
              className={`rounded-ng-lg border p-3 ${i === 0 ? "border-ng-azul/60 brillo-marca" : "border-white/10"} bg-ng-superficie/60`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-ng-tenue">
                    #{i + 1} · {c.motivo} · {c.dur}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">“{c.titulo}”</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold leading-none">{c.puntaje}</p>
                  <div className="mt-1 h-1 w-10 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-marca" style={{ width: `${c.puntaje}%` }} />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
