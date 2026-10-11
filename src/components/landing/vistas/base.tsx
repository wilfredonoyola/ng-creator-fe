import { MONO } from "@/components/landing/Publica";

/**
 * Las piezas de las vistas previas de cada tarjeta de /features/<sección>: un
 * panel oscuro chico que muestra la función como se ve en Clipfine. Todo es
 * HTML y CSS, sin imágenes ni JS de cliente, y decorado (aria-hidden): lo que
 * se lee está en el título y el texto de la tarjeta.
 *
 * Los textos que llevan adentro salen de `features<Sección>.vistas.<clave>`.
 */

/** El panel de la vista previa, arriba de la tarjeta. */
export function Vista({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={`${MONO} relative flex h-[178px] flex-col justify-center gap-2.5 overflow-hidden bg-[#1C1C1A] p-4 text-[11px] leading-snug text-[#A3A29C] ${className}`}
    >
      {children}
    </div>
  );
}

/** Una fila de piezas. */
export function Fila({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex min-w-0 items-center gap-2 ${className}`}>{children}</div>;
}

type Tono = "normal" | "ok" | "amarillo" | "error" | "apagado";

const TONO: Record<Tono, string> = {
  normal: "bg-[#0A0A0A] text-white shadow-[inset_0_0_0_1px_#2E2E2B]",
  ok: "bg-[#0A0A0A] text-white shadow-[inset_0_0_0_1px_#2E6B47]",
  amarillo: "bg-[#FFD400] font-bold text-[#0A0A0A]",
  error: "bg-[#0A0A0A] text-white shadow-[inset_0_0_0_1px_#7A2A22]",
  apagado: "bg-transparent text-[#6B6A64] shadow-[inset_0_0_0_1px_#2E2E2B]",
};

/** Una pastilla: una red, un estado, un botón. `ok` y `error` llevan su marca. */
export function Chip({ children, tono = "normal" }: { children: React.ReactNode; tono?: Tono }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-[5px] text-[11px] ${TONO[tono]}`}>
      {tono === "ok" && <span className="font-bold text-[#49D17D]">✓</span>}
      {tono === "error" && <span className="font-extrabold text-[#FF4D3D]">!</span>}
      {children}
    </span>
  );
}

/** Un cuadro de video sin imagen, rayado como en la portada. `vertical` es 9:16. */
export function Cuadro({ vertical = true, className = "", marcado = false }: { vertical?: boolean; className?: string; marcado?: boolean }) {
  return (
    <span
      className={`block shrink-0 rounded-[4px] border border-[#3A3A36] bg-[repeating-linear-gradient(135deg,#2A2A27_0_6px,#232321_6px_12px)] ${
        vertical ? "h-[58px] w-[34px]" : "h-[40px] w-[70px]"
      } ${marcado ? "outline outline-2 outline-offset-2 outline-[#FFD400]" : ""} ${className}`}
    />
  );
}

/** La flecha de "pasa a". */
export function Flecha() {
  return <span className="text-base text-[#FFD400]">→</span>;
}

/** Una barra de progreso o de volumen, llena hasta `lleno` (0 a 1). */
export function Barra({ lleno, perilla = false }: { lleno: number; perilla?: boolean }) {
  return (
    <span className="relative block h-1.5 min-w-0 flex-1 rounded-full bg-[#2E2E2B]">
      <span className="absolute inset-y-0 left-0 rounded-full bg-[#FFD400]" style={{ width: `${lleno * 100}%` }} />
      {perilla && (
        <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${lleno * 100}%` }} />
      )}
    </span>
  );
}

/** Un campo de texto o un bloque oscuro con texto. */
export function Campo({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-md bg-[#0A0A0A] px-2.5 py-2 text-[11px] leading-relaxed text-[#D9D8D2] shadow-[inset_0_0_0_1px_#2E2E2B] ${className}`}>{children}</div>;
}

/** Texto resaltado en amarillo dentro de un campo. */
export function Resalta({ children }: { children: React.ReactNode }) {
  return <span className="text-[#FFD400]">{children}</span>;
}

/** Texto en coral: lo que está mal o se pasa. */
export function Alerta({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[#FF4D3D]">{children}</span>;
}

/** Un interruptor encendido o apagado. */
export function Interruptor({ encendido = true }: { encendido?: boolean }) {
  return (
    <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full ${encendido ? "bg-[#FFD400]" : "bg-[#3A3A36]"}`}>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full ${encendido ? "right-0.5 bg-[#0A0A0A]" : "left-0.5 bg-[#8A8983]"}`} />
    </span>
  );
}

/** Una onda de audio de barras. */
const ONDA = [7, 12, 9, 15, 11, 6, 14, 18, 10, 8, 13, 17, 12, 9, 6, 11, 16, 19, 14, 10, 7, 12, 15, 9, 13, 18, 11, 8, 10, 14];

export function Onda({ color = "#6B6A64", alto = 22 }: { color?: string; alto?: number }) {
  return (
    <span className="flex h-full min-w-0 flex-1 items-center gap-[2px]">
      {ONDA.map((h, i) => (
        <span key={i} className="flex-1 rounded-[1px]" style={{ height: `${(h / 20) * alto}px`, background: color }} />
      ))}
    </span>
  );
}

/** Una línea de tiempo: una pista con tramos marcados (0 a 1). */
export function Pista({ tramos = [], cortes = [] }: { tramos?: [number, number][]; cortes?: [number, number][] }) {
  return (
    <span className="relative block h-6 min-w-0 flex-1 rounded-sm bg-[#0A0A0A] shadow-[inset_0_0_0_1px_#2E2E2B]">
      {tramos.map(([a, b]) => (
        <span key={`t${a}`} className="absolute inset-y-0 rounded-sm bg-[#FFD400]/80" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} />
      ))}
      {cortes.map(([a, b]) => (
        <span
          key={`c${a}`}
          className="absolute inset-y-0 bg-[repeating-linear-gradient(135deg,#FF4D3D_0_3px,transparent_3px_6px)] opacity-80"
          style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
        />
      ))}
    </span>
  );
}

/** Una semana de calendario: cada día con sus publicaciones (a = amarillo, b = blanco, c = coral, - = gris). */
export function Semana({ dias }: { dias: { nombre: string; eventos: string }[] }) {
  const COLOR: Record<string, string> = { a: "bg-[#FFD400]", b: "bg-white", c: "bg-[#FF4D3D]", "-": "bg-[#2C2C29]" };
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {dias.map((d) => (
        <div key={d.nombre} className="flex min-h-[92px] flex-col gap-1 rounded-[5px] bg-[#0A0A0A] p-1.5 shadow-[inset_0_0_0_1px_#2E2E2B]">
          <span className="text-[10px] font-semibold">{d.nombre}</span>
          {d.eventos.split("").map((e, i) => (
            <span key={i} className={`h-4 rounded-[3px] ${COLOR[e] ?? COLOR["-"]}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Un avatar redondo con una inicial. */
export function Avatar({ letra, color = "#FFD400" }: { letra: string; color?: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0A0A0A]" style={{ background: color }}>
      {letra}
    </span>
  );
}

/** Un número grande dentro de la vista (un puntaje, una métrica). */
export function Cifra({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`font-[family-name:var(--font-archivo)] text-[28px] font-extrabold leading-none text-white ${className}`}>{children}</span>;
}
