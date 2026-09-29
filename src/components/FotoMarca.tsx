"use client";

import { useState } from "react";

/**
 * La foto de una marca o página, que no se rompe.
 *
 * La `fotoUrl` que guardamos de Facebook es una URL firmada de su CDN que
 * vence a los días (parámetro `oe`), así que tarde o temprano sale rota. Se
 * prueba en orden: el logo propio de la marca (en Bunny, no vence), la foto de
 * la página por la Graph API (`/{pageId}/picture`, que siempre redirige a la
 * foto vigente), la guardada, y si todas fallan, la inicial.
 */
export function FotoMarca({
  nombre,
  logoUrl,
  pageId,
  fotoUrl,
  className = "h-7 w-7",
}: {
  nombre?: string | null;
  logoUrl?: string | null;
  pageId?: string | null;
  fotoUrl?: string | null;
  className?: string;
}) {
  const fuentes = [
    logoUrl,
    pageId ? `https://graph.facebook.com/${pageId}/picture?type=normal` : null,
    fotoUrl,
  ].filter((u): u is string => !!u);
  const [fallidas, setFallidas] = useState(0);
  const src = fuentes[fallidas];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={src}
        src={src}
        alt=""
        onError={() => setFallidas((n) => n + 1)}
        className={`shrink-0 rounded-full bg-white/10 object-cover ${className}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-marca text-xs font-bold text-white ${className}`}
    >
      {nombre?.[0]?.toUpperCase() ?? "?"}
    </span>
  );
}
