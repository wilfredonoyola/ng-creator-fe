import { useCallback, useReducer, useRef } from "react";

/** Cuántos pasos se pueden deshacer. */
const TOPE = 100;

/**
 * Los cambios que llegan seguidos (arrastrar un recuadro, tipear un texto) son
 * un solo paso: si no, deshacer volvería letra por letra o píxel por píxel.
 */
const AGRUPAR_MS = 700;

interface Estado<T> {
  pasado: T[];
  presente: T | null;
  futuro: T[];
}

type Accion<T> =
  | { tipo: "iniciar"; valor: T }
  | { tipo: "cambiar"; cambio: (prev: T) => T; agrupar: boolean }
  | { tipo: "deshacer" }
  | { tipo: "rehacer" };

function reducir<T>(e: Estado<T>, a: Accion<T>): Estado<T> {
  switch (a.tipo) {
    case "iniciar":
      return { pasado: [], presente: a.valor, futuro: [] };
    case "cambiar": {
      if (e.presente === null) return e;
      const nuevo = a.cambio(e.presente);
      if (nuevo === e.presente) return e;
      return {
        pasado: a.agrupar && e.pasado.length ? e.pasado : [...e.pasado, e.presente].slice(-TOPE),
        presente: nuevo,
        futuro: [],
      };
    }
    case "deshacer": {
      if (!e.pasado.length || e.presente === null) return e;
      return { pasado: e.pasado.slice(0, -1), presente: e.pasado[e.pasado.length - 1], futuro: [e.presente, ...e.futuro] };
    }
    case "rehacer": {
      if (!e.futuro.length || e.presente === null) return e;
      return { pasado: [...e.pasado, e.presente], presente: e.futuro[0], futuro: e.futuro.slice(1) };
    }
  }
}

/**
 * Un valor con deshacer y rehacer. `cambiar` recibe el valor anterior y
 * devuelve el nuevo, como un setState; deshacer y rehacer también son
 * cambios del valor (quien lo guarda solo, los guarda).
 */
export function useHistorial<T>() {
  const [estado, despachar] = useReducer(reducir as (e: Estado<T>, a: Accion<T>) => Estado<T>, {
    pasado: [],
    presente: null,
    futuro: [],
  });
  const ultimo = useRef(0);

  const iniciar = useCallback((valor: T) => despachar({ tipo: "iniciar", valor }), []);
  const cambiar = useCallback((cambio: (prev: T) => T) => {
    const ahora = Date.now();
    const agrupar = ahora - ultimo.current < AGRUPAR_MS;
    ultimo.current = ahora;
    despachar({ tipo: "cambiar", cambio, agrupar });
  }, []);
  // Después de deshacer, el cambio siguiente es un paso nuevo.
  const deshacer = useCallback(() => {
    ultimo.current = 0;
    despachar({ tipo: "deshacer" });
  }, []);
  const rehacer = useCallback(() => {
    ultimo.current = 0;
    despachar({ tipo: "rehacer" });
  }, []);

  return {
    valor: estado.presente,
    iniciar,
    cambiar,
    deshacer,
    rehacer,
    puedeDeshacer: estado.pasado.length > 0,
    puedeRehacer: estado.futuro.length > 0,
  };
}

/** ¿El foco está en algo donde se escribe? Ahí Cmd+Z es del campo, no del editor. */
export function escribiendo(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof HTMLElement)) return false;
  if (objetivo.isContentEditable) return true;
  const tag = objetivo.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const tipo = (objetivo as HTMLInputElement).type;
  // Los que no son de tipear (casillas, deslizadores, colores) dejan pasar el atajo.
  return !["checkbox", "radio", "range", "color", "button", "submit"].includes(tipo);
}
