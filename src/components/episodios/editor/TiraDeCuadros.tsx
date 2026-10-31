"use client";

import { Film } from "lucide-react";
import { useCuadrosDelVideo } from "@/lib/cuadros-video";

/**
 * El archivo entero de un video como una tira de cuadros, de punta a punta de
 * su caja: cada cuadro ocupa su parte del tiempo y, si sobra lugar, se repite
 * (como en CapCut). Si el navegador no puede sacar los cuadros, un color
 * sólido con un ícono.
 */
export function TiraDeCuadros({ url, duracionSeg, className = "" }: { url: string; duracionSeg: number; className?: string }) {
  const r = useCuadrosDelVideo(url, duracionSeg);
  if (r.estado !== "listo") {
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center bg-ng-azul/25 ${r.estado === "cargando" ? "animate-pulse" : ""} ${className}`}
      >
        {r.estado === "falla" && <Film className="h-3.5 w-3.5 text-white/50" />}
      </div>
    );
  }
  return (
    <div aria-hidden className={`flex overflow-hidden bg-black ${className}`}>
      {r.cuadros.map((c) => (
        <div
          key={c.seg}
          className="h-full min-w-0 flex-1 border-r border-black/40 last:border-r-0"
          style={{ backgroundImage: `url(${c.src})`, backgroundSize: "auto 100%", backgroundRepeat: "repeat-x", backgroundPosition: "left center" }}
        />
      ))}
    </div>
  );
}
