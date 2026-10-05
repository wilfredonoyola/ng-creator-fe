"use client";

import { useTranslations } from "next-intl";

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
 * Los requisitos, que se tildan mientras escribe. Vale más que un párrafo de
 * reglas: muestra cuál falta, no la lista entera.
 */
export function RequisitosPassword({ valor }: { valor: string }) {
  const t = useTranslations("requisitosPassword");
  return (
    <ul className="mb-4 space-y-1">
      {REQUISITOS.map((r) => {
        const ok = r.cumple(valor);
        return (
          <li
            key={r.clave}
            className={`flex items-center gap-2 text-[11px] transition-colors ${ok ? "text-ng-teal" : "text-white/35"}`}
          >
            <span className="w-3 shrink-0 text-center">{ok ? "✓" : "·"}</span>
            {t(r.clave)}
          </li>
        );
      })}
    </ul>
  );
}
