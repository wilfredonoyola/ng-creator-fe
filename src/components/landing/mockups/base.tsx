import { CONDENSADA, MONO, RAYADO } from "@/components/landing/Publica";

/**
 * Lo común de las maquetas de /features: el panel oscuro de la maqueta de la
 * portada (src/app/page.tsx), los íconos de las redes y piezas chicas que se
 * repiten. Todo es HTML y CSS, sin imágenes ni JS de cliente.
 */

export { CONDENSADA, MONO, RAYADO };

/** Un cuadro de video sin imagen: el rayado de la portada. */
export const CUADRO = `${RAYADO} border border-[#33332F]`;

/**
 * El panel de la maqueta. Para los lectores de pantalla es una sola imagen
 * con su descripción: el texto de adentro es decorado y no se lee.
 */
export function Maqueta({ alt, children, className = "" }: { alt: string; children: React.ReactNode; className?: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`${MONO} min-w-0 overflow-hidden rounded-xl border border-[#2E2E2B] bg-[#1C1C1A] p-4 text-[11px] text-[#A3A29C] sm:p-5 ${className}`}
    >
      <div aria-hidden className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

/** Un bloque interno de la maqueta, más oscuro. */
export function Bloque({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-[#2E2E2B] bg-[#0A0A0A] p-3 ${className}`}>{children}</div>;
}

/** Un interruptor encendido o apagado. */
export function Interruptor({ encendido = true }: { encendido?: boolean }) {
  return (
    <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full ${encendido ? "bg-[#FFD400]" : "bg-[#3A3A36]"}`}>
      <span className={`absolute top-0.5 h-3 w-3 rounded-full ${encendido ? "right-0.5 bg-[#0A0A0A]" : "left-0.5 bg-[#8A8983]"}`} />
    </span>
  );
}

/** Una pastilla para elegir entre opciones, como en el editor. */
export function Opcion({ children, activa = false }: { children: React.ReactNode; activa?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${
        activa ? "bg-[#FFD400] font-bold text-[#0A0A0A]" : "text-[#D9D8D2] shadow-[inset_0_0_0_1px_#33332F]"
      }`}
    >
      {children}
    </span>
  );
}

/** El título de un bloque. */
export function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[.08em] text-[#8A8983]">{children}</span>;
}

export type Red = "TikTok" | "Instagram" | "YouTube" | "Facebook";
export const REDES: readonly Red[] = ["TikTok", "YouTube", "Instagram", "Facebook"];

/** El ícono de cada red, el mismo de la portada. */
export function IconoRed({ red, tamano = 14, color = "#FFFFFF" }: { red: Red; tamano?: number; color?: string }) {
  switch (red) {
    case "TikTok":
      return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
          <path d="M14 2h3.2c.3 2.4 1.8 4 4.3 4.2v3.3c-1.6 0-3-.5-4.3-1.3v7.1A6.3 6.3 0 1 1 10.9 9v3.4a3 3 0 1 0 3.1 3z" />
        </svg>
      );
    case "Instagram":
      return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill={color} stroke="none" />
        </svg>
      );
    case "YouTube":
      return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24">
          <rect x="1.5" y="5" width="21" height="14" rx="4.5" fill={color} />
          <path d="M10 9v6l5.2-3z" fill="#1C1C1A" />
        </svg>
      );
    case "Facebook":
      return (
        <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
          <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.3H7.5V14h2.7v8z" />
        </svg>
      );
  }
}

/** Una onda de audio de barras, para las líneas de tiempo. */
export const ONDA = [7, 12, 9, 15, 11, 6, 14, 18, 10, 8, 13, 17, 12, 9, 6, 11, 16, 19, 14, 10, 7, 12, 15, 9, 13, 18, 11, 8, 10, 14, 17, 12, 9, 6, 11, 15, 10, 13, 8, 7];

export function Onda({ color = "#4A4A45", alto = 20 }: { color?: string; alto?: number }) {
  return (
    <div className="flex h-full items-center gap-[2px]">
      {ONDA.map((h, i) => (
        <span key={i} className="flex-1 rounded-[1px]" style={{ height: `${(h / 20) * alto}px`, background: color }} />
      ))}
    </div>
  );
}

/** Una persona recortada: cabeza y hombros, con o sin contorno de sticker. */
export function Silueta({ color = "#8A8983", contorno = false, className = "" }: { color?: string; contorno?: boolean; className?: string }) {
  const borde = contorno ? { stroke: "#FFFFFF", strokeWidth: 5, paintOrder: "stroke" as const, strokeLinejoin: "round" as const } : {};
  return (
    <svg viewBox="0 0 60 64" className={className}>
      <circle cx="30" cy="20" r="12" fill={color} {...borde} />
      <path d="M6 64c0-15 10.5-25 24-25s24 10 24 25z" fill={color} {...borde} />
    </svg>
  );
}
