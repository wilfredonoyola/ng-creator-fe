"use client";

/**
 * Un interruptor de encendido con su texto al lado, en vez de una casilla:
 * el de Ajustes de publicación y Revisión, para usarlo en todos lados.
 * Todo el renglón se puede tocar.
 */
export function Interruptor({
  valor,
  onCambio,
  etiqueta,
  deshabilitado = false,
  className = "",
}: {
  valor: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  deshabilitado?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      disabled={deshabilitado}
      onClick={() => onCambio(!valor)}
      className={`group inline-flex shrink-0 items-center gap-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span className={valor ? "text-white" : "text-white/60"}>{etiqueta}</span>
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          valor ? "bg-marca" : "bg-white/15 group-enabled:group-hover:bg-white/25"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full shadow transition-all ${
            valor ? "left-[18px] bg-ng-tinta" : "left-0.5 bg-white"
          }`}
        />
      </span>
    </button>
  );
}
