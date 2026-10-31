"use client";

import { useTranslations } from "next-intl";
import { CLASE_ETIQUETA_REVISION, type EtiquetaRevision as Etiqueta } from "@/lib/revision";

/** "Por revisar", "Cambios pedidos", "Vencido, sin revisar" o "Salió sin revisar" (ng-creator-be#175). */
export function EtiquetaRevision({ etiqueta, chica }: { etiqueta: Etiqueta | null; chica?: boolean }) {
  const t = useTranslations("revisionClip.etiquetas");
  if (!etiqueta) return null;
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 ${chica ? "text-[10px]" : "text-[11px]"} ${CLASE_ETIQUETA_REVISION[etiqueta]}`}
    >
      {t(etiqueta)}
    </span>
  );
}
