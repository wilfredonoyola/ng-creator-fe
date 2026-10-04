"use client";

import { useEffect, useRef, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client";
import QRCode from "qrcode";
import { useTranslations } from "next-intl";
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
/** Tres fallos seguidos son nueve segundos: ya no es un bache de red. */
const FALLOS_PARA_AVISAR = 3;

/** Cuánto se espera antes de dar la vuelta por perdida. */
const ESPERA_MAX_MS = 20 * 60 * 1000;

export function GrabarConTelefono({
  marcaId,
  onVideo,
}: {
  marcaId: string;
  onVideo: (
    storagePath: string,
    duracionSeg: number | null,
    publicUrl: string | null,
  ) => void;
}) {
  const tr = useTranslations("montajeTelefono");
  const [qr, setQr] = useState<string | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const cliente = useApolloClient();
  const [crear] = useMutation(CREAR_SESION_GRABACION);
  const avisado = useRef(false);

  /** Fallos seguidos del sondeo, para no gritar por uno suelto. */
  const fallos = useRef(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cansado, setCansado] = useState(false);

  /**
   * `onVideo` en un ref, no en las dependencias del sondeo.
   *
   * El padre la recrea en cada render, así que como dependencia reiniciaba el
   * intervalo con cada cambio del montaje. Y esta pantalla invita justamente a
   * eso —"el video aparece acá solo"—: quien movía el slider o escribía un
   * texto mientras esperaba, volvía a poner el reloj en cero antes de que
   * llegara a los tres segundos, y el sondeo no se disparaba nunca.
   */
  const alLlegar = useRef(onVideo);
  useEffect(() => {
    alLlegar.current = onVideo;
  });

  async function abrir() {
    setError(null);
    setAviso(null);
    setCansado(false);
    setCreando(true);
    try {
      const { data } = await crear({ variables: { marcaId } });
      const id = data?.crearSesionGrabacion?._id;
      if (!id) throw new Error(tr("errores.sinSesion"));
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
      setError(e?.message ?? tr("errores.generar"));
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
    fallos.current = 0;
    let vueltas = 0;

    const t = setInterval(async () => {
      // Dejar de preguntar despues de un rato. La sesion dura 6 horas, pero una
      // pestaña sondeando toda la tarde no le sirve a nadie: si en veinte
      // minutos no llego el video, lo mas probable es que la grabacion haya
      // quedado en la nada.
      if (++vueltas * 3000 > ESPERA_MAX_MS) {
        setCansado(true);
        setSesionId(null);
        setQr(null);
        return;
      }
      try {
        const { data } = await cliente.query({
          query: SESION_GRABACION,
          variables: { id: sesionId },
          fetchPolicy: "network-only",
        });
        fallos.current = 0;
        setAviso(null);
        const ruta = data?.sesionGrabacion?.storagePath;
        if (ruta && !avisado.current) {
          avisado.current = true;
          // La duracion la midio el telefono. Puede venir en null si el
          // navegador no supo medirla: es un aviso, no un requisito.
          //
          // La `publicUrl` la arma el servidor y ya venia en la respuesta; solo
          // que antes se descartaba, y con ella la unica forma de ver la toma
          // antes de generar el video.
          alLlegar.current(
            ruta,
            data.sesionGrabacion.duracionSeg ?? null,
            data.sesionGrabacion.publicUrl ?? null,
          );
          setQr(null);
          setSesionId(null);
        }
      } catch (e: any) {
        // Un sondeo perdido no rompe nada y se reintenta al siguiente. Pero
        // callarse SIEMPRE era el problema: con la sesion vencida o sin acceso
        // fallaban todos, y "Esperando la grabación…" giraba para siempre
        // mientras el telefono ya habia mandado todo.
        if (++fallos.current >= FALLOS_PARA_AVISAR) {
          setAviso(e?.message ?? tr("errores.consultar"));
        }
      }
    }, 3000);
    return () => clearInterval(t);
  }, [sesionId, cliente, tr]);

  if (!qr) {
    return (
      <>
        <button
          onClick={abrir}
          disabled={creando}
          className="w-full rounded-lg border border-white/15 py-2.5 text-xs text-white/70 transition hover:bg-white/5 disabled:opacity-40"
        >
          {creando ? tr("generando") : tr("grabar")}
        </button>
        {cansado && (
          <p className="mt-1 text-[11px] text-white/40">
            {tr("cansado")}
          </p>
        )}
        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt={tr("altQr")}
        className="mx-auto w-40 rounded-lg"
      />
      <p className="mt-2 text-xs text-white/70">
        {tr("escanea")}
      </p>
      <p className="mt-1 text-[11px] text-white/35">
        {tr("noCierres")}
      </p>
      {aviso ? (
        <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] text-amber-300">
          {tr("avisoConsulta", { aviso })}
        </p>
      ) : (
        <p className="mt-2 flex items-center justify-center gap-2 text-[11px] text-white/40">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ng-azul border-t-transparent" />
          {tr("esperando")}
        </p>
      )}
      <button
        onClick={() => {
          setQr(null);
          setSesionId(null);
        }}
        className="mt-2 text-[11px] text-white/30 underline"
      >
        {tr("cancelar")}

      </button>
    </div>
  );
}
