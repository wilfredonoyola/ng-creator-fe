import { Play, Sparkles } from "lucide-react";

/**
 * La app dibujada en un teléfono, con HTML como la maqueta de la portada: dos
 * pantallas que existen hoy en la app (el clip con su puntaje y lo que se
 * dice, y la lista de episodios).
 */
export function MaquetaTelefono({ pantalla = "clip", className = "" }: { pantalla?: "clip" | "episodios"; className?: string }) {
  return (
    <div className={`relative mx-auto w-[260px] shrink-0 ${className}`}>
      <div
        aria-hidden
        className="absolute -inset-12 -z-10 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.26), rgba(139,92,246,0.14) 45%, transparent 70%)" }}
      />
      <div className="rounded-[42px] border border-white/15 bg-[#05070d] p-2.5 shadow-2xl">
        <div className="relative h-[520px] overflow-hidden rounded-[34px] bg-ng-hondo">
          <div aria-hidden className="absolute left-1/2 top-2 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
          {pantalla === "clip" ? <PantallaClip /> : <PantallaEpisodios />}
        </div>
      </div>
    </div>
  );
}

function PantallaClip() {
  return (
    <div className="flex h-full flex-col px-3 pb-3 pt-10">
      <div className="relative aspect-[9/16] max-h-[300px] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-[#1e293b] via-[#111827] to-[#0b0f1a]">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Play size={18} className="ml-0.5 text-white" aria-hidden />
          </span>
        </div>
        <p className="absolute inset-x-3 bottom-8 text-center text-[15px] font-extrabold uppercase leading-tight text-white [text-shadow:0_2px_6px_rgba(0,0,0,.9)]">
          ¿Cuál es tu <span className="text-[#FACC15]">mayor</span> fantasía?
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-ng-tarjeta px-3 py-2">
        <span className="text-[11px] text-ng-secundario">Potencial viral</span>
        <span className="text-lg font-bold">85</span>
      </div>
      <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-ng-tenue">Lo que se dice</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ng-secundario">
        “Bueno, ahora sí, la pregunta que todos esperaban… <span className="text-white">¿cuál es tu mayor fantasía?</span>”
      </p>
    </div>
  );
}

const EPISODIOS = [
  { nombre: "Programa #18", estado: "11 clips", listo: true },
  { nombre: "Programa #17", estado: "9 clips", listo: true },
  { nombre: "Programa #19", estado: "Transcribiendo…", listo: false },
];

function PantallaEpisodios() {
  return (
    <div className="flex h-full flex-col px-4 pb-4 pt-11">
      <p className="text-[11px] text-ng-tenue">Atlanta Sin Filtro</p>
      <p className="text-xl font-bold">Proyectos</p>
      <ul className="mt-4 space-y-2.5">
        {EPISODIOS.map((e) => (
          <li key={e.nombre} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ng-tarjeta p-2.5">
            <div className="h-10 w-16 shrink-0 rounded-md bg-gradient-to-br from-[#1e293b] to-[#0b0f1a]" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{e.nombre}</p>
              <p className={`mt-0.5 flex items-center gap-1 text-[11px] ${e.listo ? "text-ng-teal" : "text-ng-celeste"}`}>
                {e.listo && <Sparkles size={10} aria-hidden />} {e.estado}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex justify-around border-t border-white/10 pt-3 text-[10px] text-ng-tenue">
        <span>Inicio</span>
        <span className="text-ng-celeste">Proyectos</span>
        <span>Perfil</span>
      </div>
    </div>
  );
}
