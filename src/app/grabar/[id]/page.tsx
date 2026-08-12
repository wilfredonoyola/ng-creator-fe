"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client";
import { uploadCamara } from "@/lib/upload";
import { ADJUNTAR_GRABACION } from "@/graphql/operations";
import { haySesion } from "@/lib/auth";
import { usePaginaActiva } from "@/lib/pagina-activa";

type Estado = "eligiendo" | "grabando" | "revisando" | "subiendo" | "listo";

/** Pasados estos minutos ya hay de sobra: grabar más solo hace la subida lenta. */
const AVISO_MIN = 2;

/**
 * La pantalla del teléfono: grabar o elegir un video y mandarlo a la
 * computadora donde se está armando el montaje.
 *
 * No hay nada del montaje acá: el teléfono solo deja el archivo en la sesión
 * cuyo id vino en el enlace del QR. Es un buzón con número, y todo lo demás
 * sigue viviendo en la computadora.
 *
 * Dos caminos a propósito. Grabar dentro del navegador da la guía circular
 * —ver el recorte real mientras encuadrás— pero depende de `MediaRecorder`,
 * que en Safari es frágil. Elegir un video abre el selector nativo, que en un
 * teléfono ofrece la galería y también grabar con la app del sistema: peor
 * encuadre, mejor calidad, y funciona aunque lo primero falle.
 */
export default function GrabarPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { activa, cargando } = usePaginaActiva();

  /**
   * Si el componente ya corrio en el navegador.
   *
   * `haySesion()` lee localStorage, que en el render del servidor no existe: sin
   * esta espera, la primera pantalla dibujada es SIEMPRE la de iniciar sesion,
   * aunque el telefono ya la tenga.
   */
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const [estado, setEstado] = useState<Estado>("eligiendo");
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [grabado, setGrabado] = useState<{ blob: Blob; url: string } | null>(
    null,
  );

  const camara = useRef<HTMLVideoElement>(null);
  const flujo = useRef<MediaStream | null>(null);
  const grabador = useRef<MediaRecorder | null>(null);
  const trozos = useRef<Blob[]>([]);

  const [adjuntar] = useMutation(ADJUNTAR_GRABACION);

  useEffect(() => {
    if (estado !== "grabando") return;
    const t = setInterval(() => setSegundos((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [estado]);

  // La cámara se apaga al salir: dejarla viva mantiene la luz encendida y
  // consume batería aunque la pantalla ya no la use.
  useEffect(() => {
    return () => {
      flujo.current?.getTracks().forEach((t) => t.stop());
      if (grabado?.url) URL.revokeObjectURL(grabado.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function empezar() {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        // `facingMode: user` es la cámara frontal, que es con la que uno se
        // graba hablando. `ideal` y no `exact` para que no falle en equipos que
        // no la tengan.
        video: { facingMode: { ideal: "user" }, width: { ideal: 1080 } },
        audio: true,
      });
      flujo.current = s;
      if (camara.current) camara.current.srcObject = s;

      trozos.current = [];
      const rec = new MediaRecorder(s, elegirFormato());
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) trozos.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(trozos.current, { type: rec.mimeType });
        setGrabado({ blob, url: URL.createObjectURL(blob) });
        setEstado("revisando");
        flujo.current?.getTracks().forEach((t) => t.stop());
      };
      grabador.current = rec;
      rec.start();
      setSegundos(0);
      setEstado("grabando");
    } catch (e: any) {
      // Un permiso denegado no se puede volver a pedir desde acá: hay que
      // decir dónde se habilita, o la pantalla queda muda sin explicar nada.
      setError(
        e?.name === "NotAllowedError"
          ? "No diste permiso de cámara o micrófono. Habilitalos para este sitio en la configuración del navegador y volvé a entrar."
          : e?.name === "NotFoundError"
            ? "No encontramos cámara en este dispositivo."
            : `No se pudo usar la cámara: ${e?.message ?? "error desconocido"}`,
      );
    }
  }

  function detener() {
    grabador.current?.stop();
  }

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGrabado({ blob: file, url: URL.createObjectURL(file) });
    setEstado("revisando");
    e.target.value = "";
  }

  async function enviar() {
    if (!grabado || !activa) return;
    setError(null);
    setEstado("subiendo");
    try {
      const extension = grabado.blob.type.includes("mp4") ? "mp4" : "webm";
      const archivo = new File([grabado.blob], `camara.${extension}`, {
        type: grabado.blob.type || "video/mp4",
      });
      const r = await uploadCamara(archivo);
      await adjuntar({
        variables: {
          id,
          pageId: activa.pageId,
          storagePath: r.storagePath,
          duracionSeg: null,
        },
      });
      setEstado("listo");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo enviar el video");
      setEstado("revisando");
    }
  }

  if (montado && !cargando && !haySesion()) {
    return (
      <Marco>
        <p className="text-sm text-white/70">Necesitás iniciar sesión</p>
        <p className="mt-1 text-xs text-white/40">
          Es una sola vez en este teléfono. Después volvé a escanear el código.
        </p>
        {/* Vuelve a ESTA pantalla al entrar. Sin esto se caia en el tablero y
            habia que volver a escanear el codigo, que se sentia como que el
            login no se guardaba nunca. */}
        <a
          href={`/login?volverA=${encodeURIComponent(`/grabar/${id}`)}`}
          className="mt-4 inline-block rounded-lg bg-[#0FED9D] px-5 py-2.5 text-sm font-semibold text-black"
        >
          Iniciar sesión
        </a>
      </Marco>
    );
  }

  if (estado === "listo") {
    return (
      <Marco>
        <div className="text-5xl">✓</div>
        <p className="mt-3 text-lg font-semibold text-[#0FED9D]">Video enviado</p>
        <p className="mt-1 text-sm text-white/50">
          Seguí en la computadora: ya te aparece cargado.
        </p>
        <button
          onClick={() => {
            setGrabado(null);
            setEstado("eligiendo");
          }}
          className="mt-6 text-xs text-white/40 underline"
        >
          Grabar otro
        </button>
      </Marco>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#0a0a0a] px-4 py-6">
      <h1 className="text-center text-sm font-semibold">
        Grabar para el montaje
      </h1>
      <p className="mt-1 text-center text-xs text-white/35">
        {activa ? activa.nombre : "…"}
      </p>

      {/* El círculo NO es decoración: es el recorte exacto que va a salir en el
          video. Encuadrar sobre un rectángulo y descubrir después que el
          círculo te cortó la frente es el error que esto evita. */}
      <div className="relative mx-auto mt-6 w-full max-w-[300px]">
        <div className="relative aspect-square overflow-hidden rounded-full border-2 border-[#0FED9D]/60 bg-black">
          {estado === "revisando" && grabado ? (
            <video
              src={grabado.url}
              controls
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              ref={camara}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {estado === "grabando" && (
          <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-3 py-0.5 text-[11px] font-semibold">
            ● {Math.floor(segundos / 60)}:
            {String(segundos % 60).padStart(2, "0")}
          </span>
        )}
      </div>

      {estado === "grabando" && segundos > AVISO_MIN * 60 && (
        <p className="mt-3 text-center text-[11px] text-amber-300">
          Con esto ya tenés de sobra. Grabar más hace la subida lenta.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-center text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="mt-auto space-y-3 pt-6">
        {estado === "eligiendo" && (
          <>
            <button
              onClick={empezar}
              className="w-full rounded-xl bg-[#0FED9D] py-4 text-base font-semibold text-black"
            >
              ● Grabar acá
            </button>
            <label className="block w-full cursor-pointer rounded-xl border border-white/15 py-4 text-center text-base text-white/70">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={elegirArchivo}
              />
              Elegir un video
            </label>
            <p className="text-center text-[11px] text-white/25">
              Grabar acá te muestra el recorte real. Elegir un video abre la
              cámara del teléfono, que graba mejor.
            </p>
          </>
        )}

        {estado === "grabando" && (
          <button
            onClick={detener}
            className="w-full rounded-xl bg-red-500 py-4 text-base font-semibold text-white"
          >
            ■ Detener
          </button>
        )}

        {estado === "revisando" && (
          <>
            <button
              onClick={enviar}
              className="w-full rounded-xl bg-[#0FED9D] py-4 text-base font-semibold text-black"
            >
              Usar esta
            </button>
            <button
              onClick={() => {
                if (grabado) URL.revokeObjectURL(grabado.url);
                setGrabado(null);
                setEstado("eligiendo");
              }}
              className="w-full rounded-xl border border-white/15 py-3 text-sm text-white/60"
            >
              Repetir
            </button>
          </>
        )}

        {estado === "subiendo" && (
          <div className="flex items-center justify-center gap-3 py-4">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
            <span className="text-sm text-white/60">Enviando…</span>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * El formato que el navegador sepa grabar.
 *
 * Safari entrega mp4 y el resto webm; ffmpeg maneja los dos, así que lo único
 * que importa es no pedirle uno que no soporte, porque `MediaRecorder` tira
 * excepción en vez de elegir otro.
 */
function elegirFormato(): MediaRecorderOptions {
  const candidatos = [
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mimeType of candidatos) {
    if (MediaRecorder.isTypeSupported?.(mimeType)) return { mimeType };
  }
  return {};
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-6 text-center">
      {children}
    </main>
  );
}
