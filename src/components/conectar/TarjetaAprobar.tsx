"use client";

import { useTranslations } from "next-intl";
import { Eye, ShieldCheck } from "lucide-react";

/**
 * Lo que se le pregunta a quien conecta ChatGPT o Claude (/conectar): qué
 * va a poder ver la app y los botones. La usa también la guía de la wiki, así
 * la pantalla que se muestra ahí es esta misma, en el idioma de quien la lee.
 */
export function TarjetaAprobar({
  app,
  vuelveA,
  enviando = null,
  onDecidir,
}: {
  app: string;
  vuelveA: string;
  enviando?: "si" | "no" | null;
  /** Sin esto los botones no hacen nada (la guía de la wiki). */
  onDecidir?: (si: boolean) => void;
}) {
  const t = useTranslations("conectar");
  return (
    <>
      <h1 className="text-center text-xl font-bold">{t("aprobar.titulo", { app })}</h1>
      <p className="mt-2 text-center text-sm text-white/60">{t("aprobar.texto", { app })}</p>
      <ul className="mt-5 space-y-2.5 text-sm">
        {(["marcas", "metricas", "ayuda"] as const).map((k) => (
          <li key={k} className="flex gap-2.5">
            <Eye size={16} className="mt-0.5 shrink-0 text-marca" aria-hidden />
            {t(`aprobar.puede.${k}`)}
          </li>
        ))}
        <li className="flex gap-2.5 text-white/60">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-ng-teal" aria-hidden />
          {t("aprobar.noPuede")}
        </li>
      </ul>
      <p className="mt-5 text-xs text-white/40">{t("aprobar.vuelveA", { host: vuelveA })}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onDecidir?.(false)}
          disabled={!!enviando}
          className="rounded-ng-md border border-white/15 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/5 disabled:opacity-50"
        >
          {enviando === "no" ? t("aprobar.cancelando") : t("aprobar.cancelar")}
        </button>
        <button
          type="button"
          onClick={() => onDecidir?.(true)}
          disabled={!!enviando}
          className="rounded-ng-md bg-marca py-2.5 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-50"
        >
          {enviando === "si" ? t("aprobar.permitiendo") : t("aprobar.permitir")}
        </button>
      </div>
      <p className="mt-4 text-center text-xs text-white/40">{t("aprobar.revocar")}</p>
    </>
  );
}
