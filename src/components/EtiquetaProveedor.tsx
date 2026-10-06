"use client";

import { useTranslations } from "next-intl";

/**
 * Por dónde sale una publicación: "vía Upload-Post" o "conexión propia". Va al
 * lado del estado para que dos publicaciones en la misma red (una por cada
 * camino) no parezcan duplicadas. Sin proveedor (backend viejo) no muestra nada.
 */
export function EtiquetaProveedor({
  proveedor,
  className = "",
}: {
  proveedor?: string | null;
  className?: string;
}) {
  const t = useTranslations("proveedorPublicacion");
  if (proveedor !== "upload-post" && proveedor !== "propio") return null;
  return (
    <span className={`shrink-0 whitespace-nowrap text-[10px] text-white/40 ${className}`}>
      {proveedor === "upload-post" ? t("uploadPost") : t("propio")}
    </span>
  );
}
