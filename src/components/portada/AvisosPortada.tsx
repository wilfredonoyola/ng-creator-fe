"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Loader2, OctagonAlert } from "lucide-react";
import type { AvisoPortada } from "@/lib/portada-marca";

/**
 * La revisión de una portada (ng-creator-be#249): lo que no se va a leer o ver
 * en la grilla del perfil. Los graves (rojo) no dejan programar; los demás
 * (ámbar) se pueden dejar así. Con `onElegirCapa`, tocar un aviso de una capa
 * la elige en el editor.
 */
export function AvisosPortada({
  avisos,
  revisando,
  conTodoBien,
  onElegirCapa,
  className = "",
}: {
  avisos: AvisoPortada[];
  revisando?: boolean;
  /** Decir que está todo bien cuando no hay avisos (si ya se revisó). */
  conTodoBien?: boolean;
  onElegirCapa?: (capaId: string) => void;
  className?: string;
}) {
  const t = useTranslations("avisosPortada");
  if (!avisos.length && !revisando && !conTodoBien) return null;
  // Los graves primero.
  const ordenados = [...avisos].sort((a, b) => Number(b.grave) - Number(a.grave));
  return (
    <div className={`space-y-1 ${className}`} aria-live="polite">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/45">
        {t("titulo")}
        {revisando && <Loader2 className="h-3 w-3 animate-spin" aria-label={t("revisando")} />}
      </p>
      {ordenados.length ? (
        <ul className="space-y-1">
          {ordenados.map((a, i) => {
            const Icono = a.grave ? OctagonAlert : AlertTriangle;
            const color = a.grave ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-400/25 bg-amber-400/10 text-amber-200";
            const contenido = (
              <>
                <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{t(`codigos.${a.codigo}`)}</span>
              </>
            );
            const capaId = a.capaId;
            return (
              <li key={`${a.codigo}-${a.capaId ?? ""}-${i}`}>
                {capaId && onElegirCapa ? (
                  <button
                    type="button"
                    onClick={() => onElegirCapa(capaId)}
                    title={t("verCapa")}
                    className={`flex w-full items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs hover:brightness-125 ${color}`}
                  >
                    {contenido}
                  </button>
                ) : (
                  <p className={`flex items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${color}`}>{contenido}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        !revisando && (
          <p className="flex items-center gap-1.5 text-xs text-emerald-300/80">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {t("todoBien")}
          </p>
        )
      )}
    </div>
  );
}
