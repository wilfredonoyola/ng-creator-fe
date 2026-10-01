import type { ReactNode } from "react";
import { Mic } from "lucide-react";

/**
 * El auto-encuadre (#105) en la landing: la mesa de cuatro como la graba la
 * camara, el recorte sobre quien habla, y debajo los tres planos que salen
 * (quien habla, dividido cuando discuten, la reaccion de otro). Dibujado con
 * HTML, como MaquetaProducto: siluetas, no caras de gente real.
 */
const MESA = [
  { cx: 20, tono: "bg-sky-400/70" },
  { cx: 41, tono: "bg-violet-400/70" },
  { cx: 63, tono: "bg-teal-400/70" },
  { cx: 87, tono: "bg-amber-400/70" },
];

const TAMANOS = {
  chico: ["h-5 w-5", "mt-0.5 h-5 w-9"],
  mesa: ["h-7 w-7", "mt-0.5 h-8 w-12"],
  grande: ["h-9 w-9", "mt-1 h-10 w-16"],
};

function Persona({ tono, tamano = "chico" }: { tono: string; tamano?: keyof typeof TAMANOS }) {
  const [cabeza, cuerpo] = TAMANOS[tamano];
  return (
    <div className="flex flex-col items-center">
      <div className={`${cabeza} rounded-full ${tono}`} />
      <div className={`${cuerpo} rounded-t-full ${tono} opacity-60`} />
    </div>
  );
}

/** Un clip vertical, con lo que muestra y un rotulo abajo. */
function Plano({ rotulo, detalle, children, activo = false }: { rotulo: string; detalle: string; children: ReactNode; activo?: boolean }) {
  return (
    <figure className="min-w-0">
      <div
        className={`relative aspect-[9/16] overflow-hidden rounded-ng-lg border bg-gradient-to-b from-[#1e293b] to-[#0b0f1a] ${
          activo ? "border-ng-azul/60 brillo-marca" : "border-white/10"
        }`}
      >
        {children}
        <div className="absolute inset-x-1.5 bottom-[7%] rounded bg-black/50 px-1 py-0.5 text-center text-[8px] font-bold uppercase leading-tight text-white sm:text-[9px]">
          sí se <span className="text-yellow-300">puede</span>
        </div>
      </div>
      <figcaption className="mt-2 text-center">
        <p className="text-xs font-semibold">{rotulo}</p>
        <p className="text-[11px] text-ng-tenue">{detalle}</p>
      </figcaption>
    </figure>
  );
}

export function MaquetaAutoEncuadre() {
  const [a, b, c, d] = MESA;
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(20,184,166,0.22), rgba(59,130,246,0.14) 45%, transparent 70%)" }}
      />
      <div className="rounded-ng-xl border border-white/10 bg-ng-tarjeta/90 p-4 shadow-2xl backdrop-blur">
        <p className="text-[11px] text-ng-tenue">Lo que grabó la cámara · 16:9</p>
        {/* La mesa, con el recorte vertical sobre quien habla. */}
        <div className="relative mt-2 aspect-video overflow-hidden rounded-ng-lg border border-white/10 bg-gradient-to-b from-[#1e293b] to-[#0b0f1a]">
          <div className="absolute inset-x-0 bottom-0 h-[22%] bg-white/5" />
          {MESA.map((p) => (
            <div key={p.cx} className="absolute bottom-[22%] -translate-x-1/2" style={{ left: `${p.cx}%` }}>
              <Persona tono={p.tono} tamano="mesa" />
            </div>
          ))}
          <div className="absolute bottom-[22%] top-[12%] w-[19%] -translate-x-1/2 rounded-md border-2 border-ng-celeste shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" style={{ left: `${c.cx}%` }}>
            <span className="absolute -top-0.5 left-1/2 flex -translate-x-1/2 -translate-y-full items-center gap-1 whitespace-nowrap rounded-full bg-ng-celeste px-2 py-0.5 text-[10px] font-semibold text-ng-hondo">
              <Mic size={10} aria-hidden /> Habla
            </span>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-ng-tenue">Lo que arma solo · 9:16</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Plano rotulo="Quien habla" detalle="por la voz y los labios" activo>
            <div className="absolute inset-x-0 bottom-[18%] flex justify-center">
              <Persona tono={c.tono} tamano="grande" />
            </div>
          </Plano>
          <Plano rotulo="Dividido" detalle="cuando discuten">
            <div className="absolute inset-x-0 top-0 flex h-1/2 items-end justify-center gap-2 border-b border-white/15 pb-1">
              <Persona tono={a.tono} />
              <Persona tono={b.tono} />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-start justify-center gap-2 pt-3">
              <Persona tono={c.tono} />
              <Persona tono={d.tono} />
            </div>
          </Plano>
          <Plano rotulo="Reacción" detalle="en las tomas largas">
            <div className="absolute inset-x-0 bottom-[18%] flex justify-center">
              <Persona tono={d.tono} tamano="grande" />
            </div>
            <span className="absolute left-1.5 top-1.5 rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] text-white/80">2 s</span>
          </Plano>
        </div>
      </div>
    </div>
  );
}
