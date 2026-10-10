import { useCallback, useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import { ACTUALIZAR_CLIP_EPISODIO } from "@/graphql/operations";
import { buscarCruces, type CruceClip } from "@/components/episodios/TomarClip";
import { inputDelBorrador, type Borrador } from "./borrador";

/** Cuánto se espera después del último cambio para guardar. */
const ESPERA_MS = 1000;

/** El reintento después de un error: 2 s, 4 s, 8 s… hasta 30 s. */
const reintentoEn = (intentos: number) => Math.min(30_000, 2000 * 2 ** intentos);

export interface EstadoGuardado {
  guardando: boolean;
  /** Hay cambios que todavía no llegaron al servidor. */
  sinGuardar: boolean;
  error: string | null;
}

/**
 * El guardado automático del editor: no hay botón Guardar.
 *
 * - Cada cambio se guarda un segundo después del último (`programar`).
 * - Los guardados van de a uno, en orden: si llega un cambio mientras se
 *   guarda, se guarda después, y siempre el último.
 * - Si falla, se avisa y se reintenta solo, cada vez más espaciado.
 * - Al cerrar la pestaña con algo pendiente, se guarda y el navegador avisa;
 *   al salir del editor dentro de la app, se guarda lo pendiente.
 * - Un tramo nuevo que pisa otro clip (#70) espera el "Guardar igual".
 */
export function useGuardado({
  clipId,
  episodioId,
  marcaId,
  habilitado,
  errorGenerico,
}: {
  clipId: string;
  episodioId: string;
  marcaId: string | null;
  /** Sin permiso para operar, no se guarda nada. */
  habilitado: boolean;
  errorGenerico: string;
}) {
  const cliente = useApolloClient();
  const [actualizar] = useMutation(ACTUALIZAR_CLIP_EPISODIO);
  const [estado, setEstado] = useState<EstadoGuardado>({ guardando: false, sinGuardar: false, error: null });
  const [cruces, setCruces] = useState<CruceClip[] | null>(null);

  /** El último borrador que se pidió guardar, y el último que guardó el servidor. */
  const ultimo = useRef<Borrador | null>(null);
  const guardado = useRef<Borrador | null>(null);
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reintento = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentos = useRef(0);
  const enVuelo = useRef(false);
  // El tramo que está guardado, y los cruces que ya se aceptaron con "Guardar
  // igual": no se vuelve a preguntar a cada ajuste fino, solo si aparece un
  // clip nuevo en el cruce.
  const tramoGuardado = useRef<{ desdeSeg: number; hastaSeg: number } | null>(null);
  const crucesAceptados = useRef(new Set<string>());

  const pendiente = () => ultimo.current !== null && ultimo.current !== guardado.current;

  const limpiar = (r: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (r.current) clearTimeout(r.current);
    r.current = null;
  };

  /** Guarda el último borrador si hace falta. Corre siempre dentro de la cola. */
  const guardarPendiente = useCallback(
    async (sinRevisar: boolean): Promise<boolean> => {
      const borrador = ultimo.current;
      if (!marcaId || !borrador) return true;
      if (borrador === guardado.current) {
        // Deshacer hasta lo que ya estaba guardado: no hay nada que mandar.
        setEstado((e) => (e.sinGuardar ? { ...e, sinGuardar: false } : e));
        return true;
      }
      const antes = tramoGuardado.current;
      const tramoNuevo = !antes || antes.desdeSeg !== borrador.desdeSeg || antes.hastaSeg !== borrador.hastaSeg;
      if (tramoNuevo && !sinRevisar) {
        const encontrados = await buscarCruces(cliente, {
          episodioId,
          marcaId,
          desdeSeg: borrador.desdeSeg,
          hastaSeg: borrador.hastaSeg,
          excluirClipId: clipId,
        });
        // Llegó un cambio más nuevo mientras se revisaba: lo guarda la vuelta que sigue.
        if (ultimo.current !== borrador) return false;
        if (encontrados.some((c) => !crucesAceptados.current.has(c.clipId))) {
          setCruces(encontrados);
          return false;
        }
      }
      setCruces(null);
      enVuelo.current = true;
      setEstado((e) => ({ ...e, guardando: true }));
      try {
        await actualizar({ variables: { id: clipId, marcaId, input: inputDelBorrador(borrador) } });
        guardado.current = borrador;
        tramoGuardado.current = { desdeSeg: borrador.desdeSeg, hastaSeg: borrador.hastaSeg };
        intentos.current = 0;
        limpiar(reintento);
        setEstado({ guardando: false, sinGuardar: ultimo.current !== borrador, error: null });
        return true;
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : errorGenerico;
        setEstado({ guardando: false, sinGuardar: true, error: mensaje });
        // Se reintenta solo; un cambio nuevo también lo vuelve a intentar.
        limpiar(reintento);
        reintento.current = setTimeout(() => void vaciar().catch(() => undefined), reintentoEn(intentos.current++));
        throw e;
      } finally {
        enVuelo.current = false;
      }
    },
    // `vaciar` se define abajo y usa esta misma función: va por referencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [marcaId, clipId, episodioId, actualizar, cliente, errorGenerico],
  );

  /**
   * Guarda ya lo pendiente, sin esperar. Devuelve false si quedó esperando el
   * aviso de cruces. Rechaza si el servidor no lo pudo guardar.
   */
  const vaciar = useCallback(
    (sinRevisar = false): Promise<boolean> => {
      limpiar(temporizador);
      const vuelta = cola.current.then(() => guardarPendiente(sinRevisar));
      cola.current = vuelta.catch(() => undefined);
      return vuelta;
    },
    [guardarPendiente],
  );

  /** Un cambio del borrador. El primero es el que vino del servidor: no se guarda. */
  const programar = useCallback(
    (b: Borrador) => {
      if (guardado.current === null) {
        guardado.current = b;
        ultimo.current = b;
        tramoGuardado.current = { desdeSeg: b.desdeSeg, hastaSeg: b.hastaSeg };
        return;
      }
      if (!habilitado || b === ultimo.current) return;
      ultimo.current = b;
      setEstado((e) => (e.sinGuardar ? e : { ...e, sinGuardar: b !== guardado.current }));
      limpiar(temporizador);
      temporizador.current = setTimeout(() => void vaciar().catch(() => undefined), ESPERA_MS);
    },
    [habilitado, vaciar],
  );

  /** "Guardar igual": se acepta el cruce y se guarda el tramo como está. */
  const guardarIgual = useCallback(() => {
    cruces?.forEach((c) => crucesAceptados.current.add(c.clipId));
    setCruces(null);
    void vaciar(true).catch(() => undefined);
  }, [cruces, vaciar]);

  // Cerrar la pestaña o recargar con algo pendiente: se intenta guardar y el
  // navegador pregunta si salir igual.
  useEffect(() => {
    const antesDeSalir = (e: BeforeUnloadEvent) => {
      if (!pendiente() && !enVuelo.current) return;
      void vaciar().catch(() => undefined);
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", antesDeSalir);
    return () => window.removeEventListener("beforeunload", antesDeSalir);
  }, [vaciar]);

  // Salir del editor dentro de la app (volver al episodio): lo pendiente se
  // guarda igual. La mutación sigue aunque la página ya no esté.
  useEffect(
    () => () => {
      limpiar(reintento);
      if (pendiente()) void vaciar().catch(() => undefined);
    },
    [vaciar],
  );

  return {
    estado,
    programar,
    vaciar,
    cruces,
    guardarIgual,
    descartarCruces: () => setCruces(null),
    tramoGuardado,
  };
}
