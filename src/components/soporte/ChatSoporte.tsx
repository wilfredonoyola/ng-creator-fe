"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, MessageCircle, RotateCcw, Send, UserRound, X } from "lucide-react";
import { CONTACTO } from "@/lib/legal";
import { conSesion, derivar, escribir, guardada, leer, olvidar, type MensajeChat } from "@/lib/chat-soporte";

/**
 * Las pantallas donde la burbuja estorba: el editor (ocupa todo, con sus
 * controles abajo a la derecha), grabar, montaje, el reporte para imprimir y
 * el superadmin.
 */
const SIN_BURBUJA = [/^\/episodios\/[^/]+\/clips\/[^/]+$/, /^\/grabar/, /^\/montaje/, /^\/metricas\/reporte/, /^\/superadmin/, /^\/onboarding/];

/** Con la barra de abajo del panel (NavInferior, en el teléfono), la burbuja va más arriba. */
const PUBLICAS = [/^\/$/, /^\/features/, /^\/ayuda/, /^\/app$/, /^\/privacidad/, /^\/terminos/, /^\/login/, /^\/registro/];

/**
 * El chat de soporte: una burbuja abajo a la derecha en el sitio y en el panel.
 * Contesta un asistente con la wiki; si no alcanza, "Hablar con el equipo" le
 * pasa la conversación a support@ por correo (ng-creator-be#186). La
 * conversación queda en el navegador, así sigue al cambiar de página.
 */
export function ChatSoporte() {
  const t = useTranslations("chatSoporte");
  const pathname = usePathname() ?? "/";
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ofrecerEquipo, setOfrecerEquipo] = useState(false);
  const [pidiendoCorreo, setPidiendoCorreo] = useState(false);
  const [correo, setCorreo] = useState("");
  const [derivada, setDerivada] = useState<string | null>(null);
  const [cargada, setCargada] = useState(false);
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  // La conversación de antes, la primera vez que se abre.
  useEffect(() => {
    if (!abierto || cargada) return;
    setCargada(true);
    void leer().then((c) => {
      if (!c) return;
      setMensajes(c.mensajes);
      if (c.derivada) setOfrecerEquipo(true);
    });
  }, [abierto, cargada]);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "end" });
  }, [mensajes, pensando, pidiendoCorreo, derivada]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  if (SIN_BURBUJA.some((r) => r.test(pathname))) return null;
  const publica = PUBLICAS.some((r) => r.test(pathname));

  /** Lo que dice el backend (ya traducido), o el genérico si ni llegó: "Failed to fetch" no le sirve a nadie. */
  const mensajeDe = (err: unknown) => (err instanceof Error && !(err instanceof TypeError) ? err.message : t("error"));

  async function mandar(pregunta: string) {
    const q = pregunta.trim();
    if (!q || pensando) return;
    setError(null);
    setTexto("");
    setMensajes((m) => [...m, { rol: "PERSONA", texto: q }]);
    setPensando(true);
    try {
      const r = await escribir(q, pathname);
      setMensajes((m) => [...m, { rol: "ASISTENTE", texto: r.respuesta }]);
      if (r.sugiereDerivar) setOfrecerEquipo(true);
    } catch (err) {
      setError(mensajeDe(err));
      setOfrecerEquipo(true);
    } finally {
      setPensando(false);
    }
  }

  async function pasarAlEquipo(e?: React.FormEvent) {
    e?.preventDefault();
    if (!mensajes.length) return;
    if (!conSesion() && !pidiendoCorreo) {
      setPidiendoCorreo(true);
      return;
    }
    setError(null);
    setPensando(true);
    try {
      const r = await derivar(conSesion() ? undefined : correo.trim());
      setDerivada(r.correo);
      setPidiendoCorreo(false);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setPensando(false);
    }
  }

  function empezarDeNuevo() {
    olvidar();
    setMensajes([]);
    setOfrecerEquipo(false);
    setPidiendoCorreo(false);
    setDerivada(null);
    setError(null);
    campo.current?.focus();
  }

  const abajo = publica
    ? "bottom-[max(1rem,env(safe-area-inset-bottom))]"
    : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-5";

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label={t("abrir")}
          title={t("abrir")}
          className={`fixed right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-[#FFD400] pl-4 pr-5 font-semibold text-[#0A0A0A] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5 ${abajo}`}
        >
          <MessageCircle size={22} aria-hidden />
          <span className="hidden text-[15px] sm:inline">{t("burbuja")}</span>
        </button>
      )}

      {abierto && (
        <section
          role="dialog"
          aria-label={t("titulo")}
          className={`fixed inset-x-2 z-50 flex max-h-[min(640px,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#141413] font-sans text-white shadow-[0_16px_48px_rgba(0,0,0,0.5)] sm:inset-x-auto sm:right-5 sm:w-[380px] ${abajo}`}
        >
          <header className="flex items-start gap-3 border-b border-white/10 bg-[#0A0A0A] px-4 py-3">
            <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFD400]">
              <MessageCircle size={18} color="#0A0A0A" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold">{t("titulo")}</h2>
              <p className="text-xs leading-snug text-white/55">{t("subtitulo")}</p>
            </div>
            {mensajes.length > 0 && (
              <button
                type="button"
                onClick={empezarDeNuevo}
                aria-label={t("nueva")}
                title={t("nueva")}
                className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
              >
                <RotateCcw size={16} aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label={t("cerrar")}
              className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            <Burbuja rol="ASISTENTE" texto={t("saludo")} />
            {mensajes.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {(["sugerencia1", "sugerencia2", "sugerencia3"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => void mandar(t(k))}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-left text-xs text-white/80 hover:border-[#FFD400] hover:text-white"
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m, i) => (
              <Burbuja key={i} rol={m.rol} texto={m.texto} />
            ))}
            {pensando && (
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Loader2 size={14} className="animate-spin" aria-hidden /> {t("pensando")}
              </p>
            )}
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            {derivada ? (
              <p className="rounded-lg bg-[#3DDC97]/10 px-3 py-2 text-sm text-[#3DDC97]">{t("derivada", { correo: derivada })}</p>
            ) : pidiendoCorreo ? (
              <form onSubmit={(e) => void pasarAlEquipo(e)} className="space-y-2 rounded-lg border border-white/10 p-3">
                <label htmlFor="chat-correo" className="block text-xs text-white/70">
                  {t("pedirCorreo")}
                </label>
                <input
                  id="chat-correo"
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={t("correoEjemplo")}
                  autoComplete="email"
                  className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#FFD400]"
                />
                <button
                  type="submit"
                  disabled={pensando}
                  className="w-full rounded-md bg-[#FFD400] py-2 text-sm font-semibold text-[#0A0A0A] disabled:opacity-50"
                >
                  {t("enviarAlEquipo")}
                </button>
              </form>
            ) : (
              ofrecerEquipo &&
              guardada() && (
                <button
                  type="button"
                  onClick={() => void pasarAlEquipo()}
                  disabled={pensando}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#FFD400]/60 py-2 text-sm font-semibold text-[#FFD400] hover:bg-[#FFD400]/10 disabled:opacity-50"
                >
                  <UserRound size={16} aria-hidden /> {t("hablarConEquipo")}
                </button>
              )
            )}
            <div ref={fin} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void mandar(texto);
            }}
            className="border-t border-white/10 bg-[#0A0A0A] p-3"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={campo}
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, 1000))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void mandar(texto);
                  }
                }}
                rows={1}
                placeholder={t("escribir")}
                aria-label={t("escribir")}
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-[#FFD400]"
              />
              <button
                type="submit"
                disabled={!texto.trim() || pensando}
                aria-label={t("enviar")}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg bg-[#FFD400] text-[#0A0A0A] disabled:opacity-40"
              >
                <Send size={18} aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-white/40">
              {t.rich("alCorreo", {
                correo: () => (
                  <a href={`mailto:${CONTACTO}`} className="text-[#FFD400] hover:underline">
                    {CONTACTO}
                  </a>
                ),
              })}
            </p>
          </form>
        </section>
      )}
    </>
  );
}

function Burbuja({ rol, texto }: MensajeChat) {
  const persona = rol === "PERSONA";
  return (
    <div className={`flex ${persona ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          persona ? "rounded-br-md bg-[#FFD400] text-[#0A0A0A]" : "rounded-bl-md bg-white/[0.07] text-white/90"
        }`}
      >
        {persona ? <p className="whitespace-pre-wrap">{texto}</p> : <TextoAsistente texto={texto} />}
      </div>
    </div>
  );
}

/**
 * Lo poco de Markdown que usa el asistente: párrafos, listas, **negrita** y
 * [links](url). Se arma con elementos, sin HTML: el texto viene de un modelo.
 */
function TextoAsistente({ texto }: { texto: string }) {
  const bloques = texto.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {bloques.map((b, i) => {
        const lineas = b.split("\n");
        const lista = lineas.every((l) => /^\s*(\d+\.|[-*])\s+/.test(l));
        if (lista) {
          const ordenada = /^\s*\d+\./.test(lineas[0]);
          const Lista = ordenada ? "ol" : "ul";
          return (
            <Lista key={i} className={`space-y-1 pl-5 ${ordenada ? "list-decimal" : "list-disc"}`}>
              {lineas.map((l, j) => (
                <li key={j}>
                  <EnLinea texto={l.replace(/^\s*(\d+\.|[-*])\s+/, "")} />
                </li>
              ))}
            </Lista>
          );
        }
        return (
          <p key={i}>
            {lineas.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <EnLinea texto={l} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function EnLinea({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g);
  return (
    <>
      {partes.map((p, i) => {
        const negrita = p.match(/^\*\*([^*]+)\*\*$/);
        if (negrita) return <strong key={i} className="font-semibold text-white">{negrita[1]}</strong>;
        const link = p.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link && /^(https:\/\/(www\.)?clipfine\.io\/|\/)/.test(link[2])) {
          return (
            <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="font-medium text-[#FFD400] underline underline-offset-2">
              {link[1]}
            </a>
          );
        }
        return <Fragment key={i}>{link ? link[1] : p}</Fragment>;
      })}
    </>
  );
}
