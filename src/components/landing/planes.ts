/**
 * Los planes de la landing para agencias, en dólares por mes. `anual` es el
 * precio mensual con cobro anual. El tope es de horas de video al mes, sumando
 * todos los clientes de la cuenta. Los mismos números van en los términos
 * (legalTerminos, s3): un cambio va en los dos lados.
 *
 * Aparte de Precios.tsx porque la página (del servidor) también los usa.
 */
export const PLANES = [
  { clave: "starter", mensual: 19, anual: 15, horas: 10, destacado: false },
  { clave: "agency", mensual: 59, anual: 49, horas: 30, destacado: true },
  { clave: "agencyPro", mensual: 149, anual: 119, horas: 80, destacado: false },
] as const;

/** Lo que trae la prueba: sin tarjeta, con todas las funciones. */
export const PRUEBA_HORAS = 3;
