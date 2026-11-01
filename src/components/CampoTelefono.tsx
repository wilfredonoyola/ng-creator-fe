"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { codigoDe, paisPorDefecto, paises, separarTelefono, validarTelefono, type CountryCode } from "@/lib/telefono";

export interface ValorTelefono {
  /** En formato internacional (+50370000000) si es válido; si no, null. */
  numero: string | null;
  /** Escribió algo (para decidir si mostrar el error). */
  escrito: boolean;
  problema: "invalido" | "fijo" | null;
}

/**
 * El teléfono con selector de país (ng-creator-be#289): el país con su
 * bandera y su código, y el número sin el código. Se valida como en el
 * backend: válido para ese país y celular (para WhatsApp o SMS).
 *
 * `inicial` es el número guardado (+50370000000), si hay. Cada cambio llama
 * a `onCambio` con el número internacional (o null) y el problema.
 */
export function CampoTelefono({
  inicial,
  onCambio,
  className = "",
  autoFocus,
  claseCampo,
}: {
  inicial?: string | null;
  onCambio: (v: ValorTelefono) => void;
  className?: string;
  autoFocus?: boolean;
  claseCampo: string;
}) {
  const t = useTranslations("campoTelefono");
  const locale = useLocale();
  const separado = separarTelefono(inicial);
  // En el servidor no se sabe el país del navegador: arranca en SV y se ajusta al montar.
  const [pais, setPais] = useState<CountryCode>(separado?.pais ?? "SV");
  const [nacional, setNacional] = useState(separado?.nacional ?? "");
  const sinGuardado = !separado;
  useEffect(() => {
    if (sinGuardado) setPais(paisPorDefecto());
  }, [sinGuardado]);
  const lista = useMemo(() => paises(locale), [locale]);

  const r = nacional.trim() ? validarTelefono(pais, nacional) : null;
  const problema = r && "problema" in r ? r.problema : null;

  function avisar(p: CountryCode, n: string) {
    const v = n.trim() ? validarTelefono(p, n) : null;
    onCambio({
      numero: v && "numero" in v ? v.numero : null,
      escrito: !!n.trim(),
      problema: v && "problema" in v ? v.problema : null,
    });
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <select
          value={pais}
          onChange={(e) => {
            const p = e.target.value as CountryCode;
            setPais(p);
            avisar(p, nacional);
          }}
          aria-label={t("pais")}
          className={`${claseCampo} w-28 shrink-0 sm:w-32`}
        >
          {lista.map((x) => (
            <option key={x.pais} value={x.pais}>
              {x.etiqueta}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-white/40">
            {codigoDe(pais)}
          </span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={nacional}
            autoFocus={autoFocus}
            onChange={(e) => {
              const n = e.target.value.slice(0, 20);
              setNacional(n);
              avisar(pais, n);
            }}
            placeholder={t("numero")}
            aria-label={t("numero")}
            aria-invalid={!!problema}
            className={claseCampo}
            style={{ paddingLeft: `${0.75 + codigoDe(pais).length * 0.55}rem` }}
          />
        </div>
      </div>
      {problema && <p className="mt-1 text-xs text-amber-300">{t(problema)}</p>}
    </div>
  );
}
