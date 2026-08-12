"use client";

import { useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import QRCode from "qrcode";
import {
  CREAR_SESION_GRABACION,
  SESION_GRABACION,
} from "@/graphql/operations";

/**
 * El puente: un QR que abre la pantalla de grabar en el teléfono, y la espera
 * hasta que el video llegue.
 *
 * El QR lleva un ENLACE, no una credencial. El teléfono necesita sesión igual
 * —una sola vez y queda guardada—, y así no hace falta abrir un endpoint que
 * acepte subidas sin autenticar, que es la clase de puerta que después nadie
 * recuerda que quedó abierta.
 *
 * Lo que viaja es un id de sesión, no el montaje: el montaje sigue viviendo en
 * la memoria de esta pestaña. El teléfono solo deja un archivo en ese buzón.
 */
export function GrabarConTelefono({
  pageId,
  onVideo,
}: {
  pageId: string;
  onVideo: (storagePath: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const cliente = useApolloClient();
  const [crear] = useMutation(CREAR_SESION_GRABACION);
  const avisado = useRef(false);

  async function abrir() {
    setError(null);
    setCreando(true);
    try {
      const { data } = await crear({ variables: { pageId } });
      const id = data?.crearSesionGrabacion?._id;
      if (!id) throw new Error("El servidor no devolvió la sesión");
      setSesionId(id);
      avisado.current = false;
      setQr(
        await QRCode.toDataURL(`${window.location.origin}/grabar/${id}`, {
          margin: 1,
          width: 320,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        }),
      );
    } catch (e: any) {
      setError(e?.message ?? "No se pudo generar el código");
    } finally {
      setCreando(false);
    }
  }

  /**
   * Pregunta cada 3 segundos si ya llegó. Sondeo y no WebSocket: el backend no
   * tiene subscriptions montadas, y para una espera humana —alguien agarrando
   * el teléfono y grabando— tres segundos no se notan.
   */
  useEffect(() => {
    if (!sesionId) return;
    const t = setInterval(async () => {
      try {
        const { data } = await cliente.query({
          query: SESION_GRABACION,
          variables: { id: sesionId },
          fetchPolicy: "network-only",
        });
        const ruta = data?.sesionGrabacion?.storagePath;
        if (ruta && !avisado.current) {
          avisado.current = true;
          onVideo(ruta);
          setQr(null);
          setSesionId(null);
        }
      } catch {
        // Un sondeo perdido no rompe nada: se reintenta al siguiente.
      }
    }, 3000);
    return () => clearInterval(t);
  }, [sesionId, pageId, cliente, onVideo]);

  if (!qr) {
    return (
      <>
        <button
          onClick={abrir}
          disabled={creando}
          className="w-full rounded-lg border border-white/15 py-2.5 text-xs text-white/70 transition hover:bg-white/5 disabled:opacity-40"
        >
          {creando ? "Generando código…" : "📱 Grabar con el teléfono"}
        </button>
        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt="Código para abrir en el teléfono"
        className="mx-auto w-40 rounded-lg"
      />
      <p className="mt-2 text-xs text-white/70">
        Escaneá con la cámara del teléfono
      </p>
      <p className="mt-1 text-[11px] text-white/35">
        Grabás ahí y el video aparece acá solo. No cierres esta pestaña.
      </p>
      <p className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/40">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0FED9D] border-t-transparent" />
        Esperando la grabación…
      </p>
      <button
        onClick={() => {
          setQr(null);
          setSesionId(null);
        }}
        className="mt-2 text-[11px] text-white/30 underline"
      >
        Cancelar
      </button>
    </div>
  );
}
