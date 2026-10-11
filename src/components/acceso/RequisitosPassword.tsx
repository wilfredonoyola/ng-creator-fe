"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff } from "lucide-react";

/**
 * Lo que exige el User Pool `ng-creator-prod`.
 *
 * Está acá repetido a propósito, para poder mostrarlo mientras se escribe:
 * Cognito solo dice qué falta *después* de rechazar el intento, y adivinar
 * cuál de las cinco reglas falló es lo que hace abandonar el alta. Si algún
 * día cambia la política del pool, manda igual el mensaje de Cognito, que es
 * la fuente real; esta lista solo puede quedar de más o de menos exigente.
 *
 * La usan /login (primer ingreso y recuperación) y /registro.
 */
export const REQUISITOS = [
  { clave: "largo", cumple: (v: string) => v.length >= 8 },
  { clave: "mayuscula", cumple: (v: string) => /[A-Z]/.test(v) },
  { clave: "minuscula", cumple: (v: string) => /[a-z]/.test(v) },
  { clave: "numero", cumple: (v: string) => /\d/.test(v) },
  { clave: "simbolo", cumple: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

/** Si la contraseña cumple todas las reglas. */
export const passwordValida = (v: string) => REQUISITOS.every((r) => r.cumple(v));

/**
 * Los requisitos como pastillas que se tildan mientras escribe: entran en una
 * o dos líneas en vez de cinco. Cuando cumple todas quedan en una sola,
 * "Contraseña segura", que es lo único que hace falta saber a esa altura.
 */
export function RequisitosPassword({ valor }: { valor: string }) {
  const t = useTranslations("requisitosPassword");
  if (passwordValida(valor)) {
    return (
      <p className="mb-6 flex items-center gap-1.5 text-xs font-medium text-ng-teal" aria-live="polite">
        <Check size={14} strokeWidth={3} aria-hidden />
        {t("segura")}
      </p>
    );
  }
  return (
    <ul className="mb-6 flex flex-wrap gap-1.5" aria-label={t("titulo")}>
      {REQUISITOS.map((r) => {
        const ok = r.cumple(valor);
        return (
          <li
            key={r.clave}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors ${
              ok ? "bg-ng-teal/15 text-ng-teal" : "bg-white/5 text-white/50"
            }`}
          >
            {ok && <Check size={11} strokeWidth={3} aria-hidden />}
            {!ok && <span className="sr-only">{t("falta")} </span>}
            {t(r.clave)}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Una contraseña con el ojo para verla. Con el ojo no hace falta pedir que la
 * repita: el error de tipeo que cubría el segundo campo se ve antes de mandar.
 */
export function CampoPassword({
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useTranslations("requisitosPassword");
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input {...props} type={visible ? "text" : "password"} className="w-full rounded-ng-md border border-white/10 bg-ng-hondo/70 py-2.5 pl-3 pr-11 text-sm outline-none transition focus:border-ng-azul" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={t(visible ? "ocultar" : "mostrar")}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-ng-md text-white/45 transition hover:text-white focus-visible:text-white focus-visible:outline-none"
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
