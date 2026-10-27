"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApolloClient, useQuery } from "@apollo/client";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Image as IconoImagen,
  Loader2,
  Redo2,
  RotateCw,
  Square,
  Trash2,
  Type,
  Undo2,
  X,
  Film,
  Heading,
  BadgeCheck,
} from "lucide-react";
import { DISENO_PORTADA_MARCA, PLANTILLA_CLIP_MARCA, VISTA_DISENO_PORTADA } from "@/graphql/operations";
import { FUENTES_ESTILO, temaValido, type FuenteEstilo, type Tema } from "@/lib/estilos-texto";
import { ESTILOS_PORTADA, FUENTES_PORTADA, useAvisosPortada, type AvisoPortada } from "@/lib/portada-marca";
import { ErrorDeSubida, FORMATOS_IMAGEN_CLIP, uploadImagenClip } from "@/lib/upload";
import { esMejora, useRecortesImagen, type RecorteLocal } from "@/lib/use-recortes-imagen";
import {
  MAXIMO_CAPAS_PORTADA,
  capaNueva,
  claveDiseno,
  disenoParaEnviar,
  entre,
  franjaDeGrilla,
  lienzoDe,
  medirTexto,
  nuevoIdCapa,
  type CapaPortada,
  type CaraDeCuadro,
  type DisenoPortada,
  type FondoPortada,
  type TipoFondoPortada,
} from "@/lib/diseno-portada";
import { AvisosPortada } from "./AvisosPortada";
import { DibujoDiseno, cajaDeCapa, useAspectos, type RecursosDibujo } from "./DibujoDiseno";

/**
 * El editor de portadas (ng-creator-be#244), a pantalla completa: un lienzo
 * con capas que se eligen, mueven, escalan y giran con el mouse o el dedo, y
 * un panel con el fondo, lo que se agrega y lo de la capa elegida. Deshacer y
 * rehacer con los botones o Ctrl+Z / Ctrl+Shift+Z.
 *
 * Lo mismo sirve para el diseño de la marca (Brand Kit) y para la portada de
 * una publicación (Programar, calendario): quien lo abre dice qué hacer con el
 * diseño al guardar. La vista es en vivo en el navegador; "Ver cómo queda"
 * pide el dibujo exacto al backend.
 *
 * Debajo del lienzo (be#249): la zona de la grilla del perfil y la revisión
 * de la portada. Con un clip se revisa sola al cambiar; sin clip (Brand Kit),
 * la trae "Ver cómo queda".
 */
export function EditorPortada({
  marcaId,
  inicial,
  clipId,
  seg,
  texto,
  cuadroUrl,
  cuadroLimpio,
  cara,
  tituloEjemplo,
  titulo,
  textoGuardar,
  onGuardar,
  onCerrar,
}: {
  marcaId: string;
  /** El diseño con que abre; sin él, el de la marca. */
  inicial?: DisenoPortada | null;
  /** Para "Ver cómo queda" sobre un clip; sin él, sobre el último clip listo. */
  clipId?: string | null;
  seg?: number | null;
  /** El título escrito para la portada (vacío = el gancho del clip). */
  texto?: string | null;
  /** El cuadro del clip que se ve en vivo (fondo CUADRO y capas de cuadro). */
  cuadroUrl?: string | null;
  /**
   * `cuadroUrl` es un cuadro limpio del clip (`cuadrosPortada`): se le quita
   * el fondo y se mejora con IA en vivo (be#255). El poster del MP4 no se puede.
   */
  cuadroLimpio?: boolean;
  /** La cara de ese cuadro, para "Centrar en la cara" en vivo (be#249). */
  cara?: CaraDeCuadro | null;
  /** Lo que se ve en las capas del título. */
  tituloEjemplo: string;
  titulo: string;
  textoGuardar: string;
  onGuardar: (d: DisenoPortada) => Promise<void> | void;
  onCerrar: () => void;
}) {
  const t = useTranslations("editorPortada");
  const marcaQ = useQuery(DISENO_PORTADA_MARCA, { variables: { marcaId }, skip: !!inicial, fetchPolicy: "network-only" });
  const estiloQ = useQuery(PLANTILLA_CLIP_MARCA, { variables: { marcaId } });
  const deMarca = marcaQ.data?.disenoPortadaMarca as DisenoPortada | undefined;
  const arranque = inicial ?? (deMarca ? disenoParaEnviar(deMarca) : null);
  const tema = temaValido(estiloQ.data?.estiloClipMarca?.tema);
  const logoUrl: string | null = estiloQ.data?.estiloClipMarca?.logoUrl ?? null;

  // Sin scroll de la página de atrás mientras está abierto.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  // En un portal: quien lo abre puede estar dentro de otro modal o de algo con transform.
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[70] flex flex-col bg-[#0b0c10] text-white">
      {arranque ? (
        <Editor
          marcaId={marcaId}
          inicial={arranque}
          clipId={clipId}
          seg={seg}
          texto={texto}
          cuadroUrl={cuadroUrl}
          cuadroLimpio={cuadroLimpio}
          cara={cara}
          tituloEjemplo={tituloEjemplo}
          titulo={titulo}
          textoGuardar={textoGuardar}
          tema={tema}
          logoUrl={logoUrl}
          onGuardar={onGuardar}
          onCerrar={onCerrar}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-white/60">
          {marcaQ.error ? (
            <>
              <p>{t("errorCargar")}</p>
              <button onClick={onCerrar} className="rounded-lg border border-white/15 px-3 py-1.5 hover:bg-white/5">
                {t("cerrar")}
              </button>
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" aria-label={t("cargando")} />
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

// ---- Deshacer y rehacer ----

interface Historial {
  pasado: DisenoPortada[];
  actual: DisenoPortada;
  futuro: DisenoPortada[];
  /** Los cambios seguidos con la misma clave (un arrastre, un deslizador) son un solo paso. */
  clave: string | null;
  en: number;
}

function useHistorial(inicial: DisenoPortada) {
  const [h, setH] = useState<Historial>({ pasado: [], actual: inicial, futuro: [], clave: null, en: 0 });
  const cambiar = useCallback((f: (d: DisenoPortada) => DisenoPortada, juntar?: string) => {
    setH((prev) => {
      const nuevo = f(prev.actual);
      if (nuevo === prev.actual) return prev;
      const ahora = Date.now();
      const junta = !!juntar && prev.clave === juntar && ahora - prev.en < 1500;
      return {
        pasado: junta ? prev.pasado : [...prev.pasado, prev.actual].slice(-100),
        actual: nuevo,
        futuro: [],
        clave: juntar ?? null,
        en: ahora,
      };
    });
  }, []);
  const deshacer = useCallback(() => {
    setH((prev) =>
      prev.pasado.length
        ? { pasado: prev.pasado.slice(0, -1), actual: prev.pasado[prev.pasado.length - 1], futuro: [prev.actual, ...prev.futuro], clave: null, en: 0 }
        : prev,
    );
  }, []);
  const rehacer = useCallback(() => {
    setH((prev) =>
      prev.futuro.length
        ? { pasado: [...prev.pasado, prev.actual], actual: prev.futuro[0], futuro: prev.futuro.slice(1), clave: null, en: 0 }
        : prev,
    );
  }, []);
  return { diseno: h.actual, cambiar, deshacer, rehacer, puedeDeshacer: h.pasado.length > 0, puedeRehacer: h.futuro.length > 0 };
}

// ---- Gestos sobre el lienzo ----

type Gesto =
  | { tipo: "mover"; id: string; px: number; py: number; x0: number; y0: number; clave: string }
  | { tipo: "escalar"; id: string; cx: number; cy: number; d0: number; capa0: CapaPortada; clave: string }
  | { tipo: "lado"; id: string; eje: "ancho" | "alto"; cx: number; cy: number; clave: string }
  | { tipo: "girar"; id: string; cx: number; cy: number; clave: string };

/** El paso de las flechas del teclado, en fracción del lienzo. */
const PASO_FLECHA = 0.005;

function Editor({
  marcaId,
  inicial,
  clipId,
  seg,
  texto,
  cuadroUrl,
  cuadroLimpio,
  cara,
  tituloEjemplo,
  titulo,
  textoGuardar,
  tema,
  logoUrl,
  onGuardar,
  onCerrar,
}: {
  marcaId: string;
  inicial: DisenoPortada;
  clipId?: string | null;
  seg?: number | null;
  texto?: string | null;
  cuadroUrl?: string | null;
  cuadroLimpio?: boolean;
  cara?: CaraDeCuadro | null;
  tituloEjemplo: string;
  titulo: string;
  textoGuardar: string;
  tema: Tema;
  logoUrl: string | null;
  onGuardar: (d: DisenoPortada) => Promise<void> | void;
  onCerrar: () => void;
}) {
  const t = useTranslations("editorPortada");
  const tSubida = useTranslations("erroresSubida");
  const { diseno, cambiar, deshacer, rehacer, puedeDeshacer, puedeRehacer } = useHistorial(inicial);
  const [elegida, setElegida] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<"capa" | "fondo" | "reemplazo" | null>(null);
  const [guia, setGuia] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [zonaGrilla, setZonaGrilla] = useState(false);
  const claveInicial = useRef(claveDiseno(inicial));
  const cambiado = claveDiseno(diseno) !== claveInicial.current;
  const capa = diseno.capas.find((c) => c.id === elegida) ?? null;
  // Lo último, para los manejadores de la ventana (gestos y teclado).
  const disenoRef = useRef(diseno);
  disenoRef.current = diseno;
  const elegidaRef = useRef(elegida);
  elegidaRef.current = elegida;

  // Los recortes (quitar fondo, contorno) y lo mejorado con IA, en vivo como en
  // el editor de clips (be#255): de las imágenes subidas, del cuadro del clip
  // (solo si es un cuadro limpio) y del fondo. Mientras no está, la original.
  const cuadroRecortable = cuadroLimpio && cuadroUrl ? cuadroUrl : null;
  const opcionesDeCapa = useCallback(
    (c: CapaPortada) => {
      const url = c.tipo !== "IMAGEN" ? null : c.cuadro ? cuadroRecortable : c.url;
      return url ? { url, sinFondo: !!c.sinFondo, contorno: !!c.contorno, mejorar: !!c.mejorar } : null;
    },
    [cuadroRecortable],
  );
  const urlFondo = diseno.fondo.tipo === "CUADRO" ? cuadroRecortable : diseno.fondo.tipo === "IMAGEN" ? diseno.fondo.url : null;
  const opcionesFondo = diseno.fondo.mejorar && urlFondo ? { url: urlFondo, sinFondo: false, contorno: false, mejorar: true } : null;
  const imagenesRecorte = [
    ...diseno.capas.map(opcionesDeCapa).filter((o): o is NonNullable<typeof o> => !!o),
    ...(opcionesFondo ? [opcionesFondo] : []),
  ];
  const { recorteDe, reintentar } = useRecortesImagen(marcaId, imagenesRecorte, true);
  const recorteDeCapa = (c: CapaPortada) => {
    const o = opcionesDeCapa(c);
    const r = o ? recorteDe(o) : undefined;
    return r && { ...r, mejora: esMejora(o!) };
  };
  const reintentarCapa = (c: CapaPortada) => {
    const o = opcionesDeCapa(c);
    if (o) void reintentar(o);
  };
  const recorteFondo = opcionesFondo ? recorteDe(opcionesFondo) : undefined;
  const fondoMejorado = recorteFondo?.estadoRecorte === "LISTO" ? recorteFondo.urlFinal : null;
  const listoDe = useCallback(
    (c: CapaPortada) => {
      const o = opcionesDeCapa(c);
      const r = o ? recorteDe(o) : undefined;
      return r?.estadoRecorte === "LISTO" && r.urlFinal ? { url: r.urlFinal, mejora: esMejora(o!) } : null;
    },
    [opcionesDeCapa, recorteDe],
  );
  const srcDeCapa = useCallback(
    (c: CapaPortada): string | null => listoDe(c)?.url ?? (c.cuadro ? (cuadroUrl ?? null) : (c.url ?? null)),
    [cuadroUrl, listoDe],
  );
  const capaMejorada = useCallback((c: CapaPortada) => !!listoDe(c)?.mejora, [listoDe]);

  const urlsImagenes = diseno.capas.map((c) => (c.tipo === "LOGO" ? logoUrl : c.tipo === "IMAGEN" ? srcDeCapa(c) : null));
  const aspectos = useAspectos([cuadroUrl, logoUrl, ...urlsImagenes]);
  const lienzo = lienzoDe(diseno, cuadroUrl ? aspectos[cuadroUrl] : null);
  const recursos: RecursosDibujo = {
    tema,
    titulo: tituloEjemplo,
    cuadroUrl,
    caraCuadro: cara,
    logoUrl,
    aspectos,
    srcDeCapa,
    capaMejorada,
    fondoMejorado,
    textoSinCuadro: t("cuadroDelVideo"),
  };

  // ---- El tamaño del lienzo en pantalla ----
  const area = useRef<HTMLDivElement>(null);
  const lienzoRef = useRef<HTMLDivElement>(null);
  const [areaTam, setAreaTam] = useState({ ancho: 0, alto: 0 });
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAreaTam({ ancho: e.contentRect.width, alto: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const escalaPantalla = Math.max(0.05, Math.min((areaTam.ancho - 24) / lienzo.ancho, (areaTam.alto - 24) / lienzo.alto));
  const anchoPantalla = lienzo.ancho * escalaPantalla;
  const altoPantalla = lienzo.alto * escalaPantalla;

  // ---- Cambiar capas ----
  const cambiarCapa = useCallback(
    (id: string, c: Partial<CapaPortada>, juntar?: string) =>
      cambiar((d) => ({ ...d, capas: d.capas.map((x) => (x.id === id ? { ...x, ...c } : x)) }), juntar),
    [cambiar],
  );
  const cambiarFondo = (c: Partial<FondoPortada>, juntar?: string) => cambiar((d) => ({ ...d, fondo: { ...d.fondo, ...c } }), juntar);
  const lleno = diseno.capas.length >= MAXIMO_CAPAS_PORTADA;
  const agregar = (nueva: CapaPortada) => {
    if (lleno) return;
    cambiar((d) => ({ ...d, capas: [...d.capas, nueva] }));
    setElegida(nueva.id);
  };
  const borrar = useCallback(
    (id: string) => {
      cambiar((d) => ({ ...d, capas: d.capas.filter((x) => x.id !== id) }));
      setElegida(null);
    },
    [cambiar],
  );
  const duplicar = useCallback(
    (id: string) => {
      const nueva = { id: nuevoIdCapa() };
      cambiar((d) => {
        if (d.capas.length >= MAXIMO_CAPAS_PORTADA) return d;
        const i = d.capas.findIndex((x) => x.id === id);
        if (i < 0) return d;
        const copia = { ...d.capas[i], id: nueva.id, x: entre(d.capas[i].x + 0.04, -0.5, 1.5), y: entre(d.capas[i].y + 0.03, -0.5, 1.5) };
        return { ...d, capas: [...d.capas.slice(0, i + 1), copia, ...d.capas.slice(i + 1)] };
      });
      setElegida(nueva.id);
    },
    [cambiar],
  );
  const mover = (id: string, paso: -1 | 1) =>
    cambiar((d) => {
      const i = d.capas.findIndex((x) => x.id === id);
      const j = i + paso;
      if (i < 0 || j < 0 || j >= d.capas.length) return d;
      const capas = [...d.capas];
      [capas[i], capas[j]] = [capas[j], capas[i]];
      return { ...d, capas };
    });

  // ---- Gestos ----
  const gesto = useRef<Gesto | null>(null);
  const contador = useRef(0);
  const cambiarCapaRef = useRef(cambiarCapa);
  cambiarCapaRef.current = cambiarCapa;

  const centroEnPantalla = (c: CapaPortada) => {
    const r = lienzoRef.current!.getBoundingClientRect();
    const caja = cajaDeCapa(c, lienzo, recursos);
    return { cx: r.left + (caja.cx / lienzo.ancho) * r.width, cy: r.top + (caja.cy / lienzo.alto) * r.height };
  };

  function empezar(e: React.PointerEvent, tipo: Gesto["tipo"], c: CapaPortada, eje?: "ancho" | "alto") {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.stopPropagation();
    e.preventDefault();
    setElegida(c.id);
    const clave = `gesto-${++contador.current}`;
    if (tipo === "mover") {
      // Un texto se dibuja dentro de los márgenes: se arranca de donde se ve.
      const y0 = c.tipo === "TEXTO" ? (medirTexto(c, tituloEjemplo, tema, lienzo)?.centro ?? c.y * lienzo.alto) / lienzo.alto : c.y;
      gesto.current = { tipo, id: c.id, px: e.clientX, py: e.clientY, x0: c.x, y0, clave };
      return;
    }
    const { cx, cy } = centroEnPantalla(c);
    if (tipo === "escalar") gesto.current = { tipo, id: c.id, cx, cy, d0: Math.max(4, Math.hypot(e.clientX - cx, e.clientY - cy)), capa0: c, clave };
    else if (tipo === "lado") gesto.current = { tipo, id: c.id, eje: eje ?? "ancho", cx, cy, clave };
    else gesto.current = { tipo: "girar", id: c.id, cx, cy, clave };
  }

  useEffect(() => {
    const mueve = (e: PointerEvent) => {
      const g = gesto.current;
      const el = lienzoRef.current;
      if (!g || !el) return;
      const r = el.getBoundingClientRect();
      const cambiarC = cambiarCapaRef.current;
      if (g.tipo === "mover") {
        let x = g.x0 + (e.clientX - g.px) / r.width;
        let y = g.y0 + (e.clientY - g.py) / r.height;
        // Se pega al centro, con una guía.
        const v = Math.abs(x - 0.5) < 0.012;
        const h = Math.abs(y - 0.5) < 0.008;
        if (v) x = 0.5;
        if (h) y = 0.5;
        setGuia({ v, h });
        cambiarC(g.id, { x: entre(x, -0.5, 1.5), y: entre(y, -0.5, 1.5) }, g.clave);
      } else if (g.tipo === "escalar") {
        const f = Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / g.d0;
        const c = g.capa0;
        if (c.tipo === "TEXTO") {
          cambiarC(g.id, { tamano: entre((c.tamano ?? 0.12) * f, 0.02, 0.4), ancho: entre(c.ancho * f, 0.1, 1.5) }, g.clave);
        } else if (c.tipo === "FORMA") {
          cambiarC(g.id, { ancho: entre(c.ancho * f, 0.02, 2), alto: entre((c.alto ?? 0.1) * f, 0.005, 2) }, g.clave);
        } else {
          cambiarC(g.id, { ancho: entre(c.ancho * f, 0.02, 2) }, g.clave);
        }
      } else if (g.tipo === "lado") {
        // El puntero llevado a los ejes de la capa (que puede estar girada).
        const actual = disenoRef.current.capas.find((x) => x.id === g.id);
        const rad = (-(actual?.rotacion ?? 0) * Math.PI) / 180;
        const dx = e.clientX - g.cx;
        const dy = e.clientY - g.cy;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        if (g.eje === "ancho") {
          const min = actual?.tipo === "TEXTO" ? 0.1 : 0.02;
          const max = actual?.tipo === "TEXTO" ? 1.5 : 2;
          cambiarC(g.id, { ancho: entre((2 * Math.abs(lx)) / r.width, min, max) }, g.clave);
        } else {
          cambiarC(g.id, { alto: entre((2 * Math.abs(ly)) / r.height, 0.005, 2) }, g.clave);
        }
      } else {
        let grados = (Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * 180) / Math.PI + 90;
        if (grados > 180) grados -= 360;
        const cerca = Math.round(grados / 45) * 45;
        if (Math.abs(grados - cerca) < 4) grados = cerca;
        cambiarC(g.id, { rotacion: Math.round(grados * 10) / 10 }, g.clave);
      }
    };
    const suelta = () => {
      gesto.current = null;
      setGuia({ v: false, h: false });
    };
    window.addEventListener("pointermove", mueve);
    window.addEventListener("pointerup", suelta);
    window.addEventListener("pointercancel", suelta);
    return () => {
      window.removeEventListener("pointermove", mueve);
      window.removeEventListener("pointerup", suelta);
      window.removeEventListener("pointercancel", suelta);
    };
  }, []);

  // ---- Teclado ----
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const destino = e.target as HTMLElement | null;
      const escribiendo = !!destino && (destino.tagName === "INPUT" || destino.tagName === "TEXTAREA" || destino.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "Escape") {
        // Escape es del editor: no le llega a la pantalla de atrás (el calendario cierra con Escape).
        e.stopPropagation();
        if (escribiendo) destino?.blur();
        else if (elegidaRef.current) setElegida(null);
        else cerrarRef.current();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        if (escribiendo) return;
        e.preventDefault();
        if (e.shiftKey) rehacer();
        else deshacer();
        return;
      }
      if (mod && e.key.toLowerCase() === "y" && !escribiendo) {
        e.preventDefault();
        rehacer();
        return;
      }
      if (escribiendo) return;
      const id = elegidaRef.current;
      if (!id) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        borrar(id);
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicar(id);
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const c = disenoRef.current.capas.find((x) => x.id === id);
        if (!c) return;
        const paso = e.shiftKey ? PASO_FLECHA * 4 : PASO_FLECHA;
        const dx = e.key === "ArrowLeft" ? -paso : e.key === "ArrowRight" ? paso : 0;
        const dy = e.key === "ArrowUp" ? -paso : e.key === "ArrowDown" ? paso : 0;
        cambiarCapa(id, { x: entre(c.x + dx, -0.5, 1.5), y: entre(c.y + dy, -0.5, 1.5) }, `flecha-${id}`);
      }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [borrar, duplicar, cambiarCapa, deshacer, rehacer]);
  // ---- Subir imágenes ----
  const archivoCapa = useRef<HTMLInputElement>(null);
  const archivoFondo = useRef<HTMLInputElement>(null);
  const archivoReemplazo = useRef<HTMLInputElement>(null);
  async function subir(file: File | undefined, para: "capa" | "fondo" | "reemplazo") {
    if (!file) return;
    setError(null);
    setSubiendo(para);
    try {
      const url = await uploadImagenClip(file, marcaId);
      if (para === "fondo") cambiarFondo({ tipo: "IMAGEN", url });
      else if (para === "reemplazo" && capa) cambiarCapa(capa.id, { url, cuadro: false });
      else agregar(capaNueva("IMAGEN", { url }));
    } catch (e) {
      setError(e instanceof ErrorDeSubida ? tSubida(e.clave, e.datos) : e instanceof Error ? e.message : t("errorSubir"));
    } finally {
      setSubiendo(null);
    }
  }

  // ---- Ver cómo queda (el dibujo del servidor) ----
  const cliente = useApolloClient();
  const [vista, setVista] = useState<{ imagen: string | null; pendientes: number; fallidos: number; cargando: boolean; error: boolean } | null>(null);
  /** Los avisos del último "Ver cómo queda", con el diseño que revisó (sin clip es la única revisión). */
  const [avisosVista, setAvisosVista] = useState<{ clave: string; avisos: AvisoPortada[] } | null>(null);
  const pedido = useRef(0);
  const verComoQueda = useCallback(
    async (intento = 0, n?: number) => {
      const yo = n ?? ++pedido.current;
      const clave = claveDiseno(disenoRef.current);
      setVista((v) => ({ imagen: v?.imagen ?? null, pendientes: v?.pendientes ?? 0, fallidos: v?.fallidos ?? 0, cargando: true, error: false }));
      try {
        const r = await cliente.query({
          query: VISTA_DISENO_PORTADA,
          variables: {
            marcaId,
            diseno: disenoParaEnviar(disenoRef.current),
            clipId: clipId ?? null,
            texto: texto?.trim() || null,
            seg: seg ?? null,
          },
          fetchPolicy: "no-cache",
        });
        if (yo !== pedido.current) return;
        const v = r.data?.vistaDisenoPortada;
        setVista({ imagen: v?.imagen ?? null, pendientes: v?.recortesPendientes ?? 0, fallidos: v?.recortesFallidos ?? 0, cargando: false, error: !v });
        if (v) setAvisosVista({ clave, avisos: v.avisos ?? [] });
        // Mientras falten recortes se vuelve a pedir sola, un rato.
        if (v?.recortesPendientes && intento < 12) setTimeout(() => void verComoQueda(intento + 1, yo), 5000);
      } catch {
        if (yo !== pedido.current) return;
        setVista((x) => ({ imagen: x?.imagen ?? null, pendientes: 0, fallidos: 0, cargando: false, error: true }));
      }
    },
    [cliente, marcaId, clipId, texto, seg],
  );
  const cerrarVista = () => {
    pedido.current++;
    setVista(null);
  };

  // ---- La revisión (be#249) ----
  // Con clip, sola y sin dibujar; sin clip, la del último "Ver cómo queda" (vale hasta el próximo cambio).
  const revision = useAvisosPortada({ marcaId, clipId, texto: texto?.trim() || null, seg: seg ?? null, diseno }, !clipId);
  const revisadaConVista = !clipId && avisosVista?.clave === claveDiseno(diseno);
  const avisos = clipId ? revision.avisos : revisadaConVista ? avisosVista!.avisos : [];
  const elegirCapaDeAviso = (id: string) => {
    if (diseno.capas.some((c) => c.id === id)) setElegida(id);
  };
  const franja = franjaDeGrilla(lienzo);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      await onGuardar(disenoParaEnviar(diseno));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errorGuardar"));
    } finally {
      setGuardando(false);
    }
  }
  const cerrar = () => {
    if (cambiado && !window.confirm(t("descartar"))) return;
    onCerrar();
  };
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  const cajaElegida = capa ? cajaDeCapa(capa, lienzo, recursos) : null;
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;

  return (
    <>
      {/* Arriba: título, deshacer, ver y guardar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 px-3 sm:px-4">
        <button onClick={cerrar} className="rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label={t("cerrar")}>
          <X className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{titulo}</h2>
        <button onClick={deshacer} disabled={!puedeDeshacer} className="rounded-lg p-2 text-white/70 hover:bg-white/10 disabled:opacity-30" aria-label={t("deshacer")} title={t("deshacer")}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button onClick={rehacer} disabled={!puedeRehacer} className="rounded-lg p-2 text-white/70 hover:bg-white/10 disabled:opacity-30" aria-label={t("rehacer")} title={t("rehacer")}>
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => void verComoQueda()}
          className="hidden items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5 sm:flex"
        >
          <Eye className="h-4 w-4" />
          {t("verComoQueda")}
        </button>
        <button
          onClick={() => void guardar()}
          disabled={guardando}
          className="rounded-lg bg-marca px-3 py-1.5 text-sm font-semibold text-ng-tinta hover:brightness-110 disabled:opacity-60"
        >
          {guardando ? t("guardando") : textoGuardar}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
        {/* El lienzo y, debajo, la zona de la grilla y la revisión */}
        <div className="flex shrink-0 flex-col md:min-h-0 md:flex-1">
          <div
            ref={area}
            className="relative flex h-[58vh] shrink-0 items-center justify-center md:h-auto md:min-h-0 md:flex-1"
            onPointerDown={() => setElegida(null)}
          >
            <div
              ref={lienzoRef}
              className="relative select-none overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10"
              style={{ width: anchoPantalla, height: altoPantalla, touchAction: "none" }}
            >
              <DibujoDiseno diseno={diseno} lienzo={lienzo} recursos={recursos} className="absolute inset-0 h-full w-full" />
              {/* Las cajas para elegir y mover, en el mismo orden que las capas */}
              {diseno.capas.map((c) => {
                const caja = cajaDeCapa(c, lienzo, recursos);
                const recorte = recorteDeCapa(c);
                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) => empezar(e, "mover", c)}
                    className="absolute cursor-move"
                    style={{
                      left: pct(caja.cx - caja.ancho / 2, lienzo.ancho),
                      top: pct(caja.cy - caja.alto / 2, lienzo.alto),
                      width: pct(caja.ancho, lienzo.ancho),
                      height: pct(caja.alto, lienzo.alto),
                      transform: c.rotacion ? `rotate(${c.rotacion}deg)` : undefined,
                      touchAction: "none",
                    }}
                  >
                    <EtiquetaRecorte recorte={recorte} />
                  </div>
                );
              })}
              {recorteFondo && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7">
                  <EtiquetaRecorte recorte={{ ...recorteFondo, mejora: true }} />
                </div>
              )}
              {/* Lo que no se ve en la grilla del perfil, oscurecido */}
              {zonaGrilla && franja.desde > 0 && (
                <>
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-white/60 bg-black/60"
                    style={{ height: pct(franja.desde, 1) }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-white/60 bg-black/60"
                    style={{ height: pct(1 - franja.hasta, 1) }}
                  />
                </>
              )}
              {/* Guías del centro */}
              {guia.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-fuchsia-400/80" />}
              {guia.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-fuchsia-400/80" />}
              {/* La capa elegida: marco y manijas */}
              {capa && cajaElegida && (
                <div
                  className="pointer-events-none absolute outline outline-2 outline-offset-2 outline-sky-400"
                  style={{
                    left: pct(cajaElegida.cx - cajaElegida.ancho / 2, lienzo.ancho),
                    top: pct(cajaElegida.cy - cajaElegida.alto / 2, lienzo.alto),
                    width: pct(cajaElegida.ancho, lienzo.ancho),
                    height: pct(cajaElegida.alto, lienzo.alto),
                    transform: capa.rotacion ? `rotate(${capa.rotacion}deg)` : undefined,
                  }}
                >
                  <Manija className="-bottom-3 -right-3 cursor-nwse-resize" etiqueta={t("escalar")} onPointerDown={(e) => empezar(e, "escalar", capa)} />
                  {(capa.tipo === "TEXTO" || capa.tipo === "FORMA") && (
                    <Manija
                      className="-right-3 top-1/2 -translate-y-1/2 cursor-ew-resize"
                      chica
                      etiqueta={capa.tipo === "TEXTO" ? t("anchoTexto") : t("ancho")}
                      onPointerDown={(e) => empezar(e, "lado", capa, "ancho")}
                    />
                  )}
                  {capa.tipo === "FORMA" && (
                    <Manija className="-bottom-3 left-1/2 -translate-x-1/2 cursor-ns-resize" chica etiqueta={t("alto")} onPointerDown={(e) => empezar(e, "lado", capa, "alto")} />
                  )}
                  <button
                    type="button"
                    aria-label={t("girar")}
                    title={t("girar")}
                    onPointerDown={(e) => empezar(e, "girar", capa)}
                    className="pointer-events-auto absolute -top-10 left-1/2 flex h-7 w-7 -translate-x-1/2 cursor-grab items-center justify-center rounded-full bg-sky-400 text-ng-tinta shadow"
                    style={{ touchAction: "none" }}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Ver cómo queda */}
            {vista && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4" onPointerDown={(e) => e.stopPropagation()}>
                <div className="flex max-h-full w-full max-w-sm flex-col gap-3 rounded-2xl border border-white/10 bg-[#13151b] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t("asiQueda")}</p>
                    <button onClick={cerrarVista} className="rounded p-1 text-white/60 hover:bg-white/10" aria-label={t("cerrar")}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative mx-auto aspect-[9/16] max-h-[60vh] overflow-hidden rounded-lg bg-white/5">
                    {vista.imagen ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL armada por el backend
                      <img src={vista.imagen} alt={t("asiQueda")} className="h-full w-full object-contain" />
                    ) : (
                      !vista.error && <div className="h-full w-full animate-pulse" />
                    )}
                    {vista.cargando && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </span>
                    )}
                  </div>
                  {vista.error && <p className="text-xs text-red-400">{t("errorVista")}</p>}
                  {vista.pendientes > 0 && <p className="text-xs text-amber-300">{t("recortesPendientes", { n: vista.pendientes })}</p>}
                  {vista.fallidos > 0 && <p className="text-xs text-red-400">{t("recortesFallidos", { n: vista.fallidos })}</p>}
                  <p className="text-[11px] text-white/40">{clipId ? t("vistaDelClip") : t("vistaUltimoClip")}</p>
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 space-y-2 border-t border-white/10 px-4 py-3">
            <Interruptor etiqueta={t("zonaGrilla")} ayuda={t("zonaGrillaAyuda")} valor={zonaGrilla} onCambio={setZonaGrilla} />
            {clipId || revisadaConVista ? (
              <AvisosPortada
                avisos={avisos}
                revisando={clipId ? revision.revisando : false}
                conTodoBien
                onElegirCapa={elegirCapaDeAviso}
                className="max-h-40 overflow-y-auto"
              />
            ) : (
              <p className="text-[11px] text-white/40">{t("revisarConVista")}</p>
            )}
          </div>
        </div>

        {/* El panel */}
        <aside className="shrink-0 border-t border-white/10 md:w-[360px] md:overflow-y-auto md:border-l md:border-t-0">
          <div className="space-y-5 p-4">
            <button
              onClick={() => void verComoQueda()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 sm:hidden"
            >
              <Eye className="h-4 w-4" />
              {t("verComoQueda")}
            </button>
            {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            {capa ? (
              <PanelCapa
                capa={capa}
                indice={diseno.capas.findIndex((x) => x.id === capa.id)}
                total={diseno.capas.length}
                tema={tema}
                lleno={lleno}
                subiendo={subiendo === "reemplazo"}
                recorte={recorteDeCapa(capa)}
                cuadroRecortable={!!cuadroRecortable}
                onReintentarRecorte={() => reintentarCapa(capa)}
                onCambiar={(c, juntar) => cambiarCapa(capa.id, c, juntar)}
                onBorrar={() => borrar(capa.id)}
                onDuplicar={() => duplicar(capa.id)}
                onSubir={() => mover(capa.id, 1)}
                onBajar={() => mover(capa.id, -1)}
                onReemplazar={() => archivoReemplazo.current?.click()}
                onListo={() => setElegida(null)}
              />
            ) : (
              <>
                <Seccion titulo={t("agregar")}>
                  <div className="grid grid-cols-3 gap-2">
                    <BotonAgregar icono={<Type className="h-4 w-4" />} texto={t("agregarTexto")} disabled={lleno} onClick={() => agregar(capaNueva("TEXTO", { texto: t("textoNuevo"), y: 0.3 }))} />
                    <BotonAgregar
                      icono={<Heading className="h-4 w-4" />}
                      texto={t("agregarTitulo")}
                      disabled={lleno}
                      onClick={() => agregar(capaNueva("TEXTO", { titulo: true, texto: tituloEjemplo.slice(0, 160), y: 0.72, tamano: 0.12 }))}
                    />
                    <BotonAgregar
                      icono={subiendo === "capa" ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconoImagen className="h-4 w-4" />}
                      texto={t("agregarImagen")}
                      disabled={lleno || !!subiendo}
                      onClick={() => archivoCapa.current?.click()}
                    />
                    <BotonAgregar icono={<Film className="h-4 w-4" />} texto={t("agregarCuadro")} disabled={lleno} onClick={() => agregar(capaNueva("IMAGEN", { cuadro: true, ancho: 0.8 }))} />
                    <BotonAgregar icono={<BadgeCheck className="h-4 w-4" />} texto={t("agregarLogo")} disabled={lleno || !logoUrl} onClick={() => agregar(capaNueva("LOGO"))} />
                    <BotonAgregar icono={<Square className="h-4 w-4" />} texto={t("agregarForma")} disabled={lleno} onClick={() => agregar(capaNueva("FORMA", { y: 0.72 }))} />
                  </div>
                  {!logoUrl && <p className="mt-2 text-[11px] text-white/40">{t("sinLogo")}</p>}
                  {lleno && <p className="mt-2 text-[11px] text-amber-300">{t("maximoCapas", { n: MAXIMO_CAPAS_PORTADA })}</p>}
                </Seccion>

                <PanelFondo
                  fondo={diseno.fondo}
                  subiendo={subiendo === "fondo"}
                  onCambiar={cambiarFondo}
                  onSubir={() => archivoFondo.current?.click()}
                  tema={tema}
                  recorte={recorteFondo && { ...recorteFondo, mejora: true }}
                  onReintentarRecorte={() => opcionesFondo && void reintentar(opcionesFondo)}
                />

                <Seccion titulo={t("capas")}>
                  {diseno.capas.length ? (
                    <ul className="space-y-1">
                      {[...diseno.capas].reverse().map((c) => (
                        <li key={c.id}>
                          <button
                            onClick={() => setElegida(c.id)}
                            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-left text-xs text-white/75 hover:bg-white/5"
                          >
                            <IconoCapa capa={c} />
                            <span className="min-w-0 flex-1 truncate">{nombreCapa(c, t)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-white/40">{t("sinCapas")}</p>
                  )}
                  <p className="mt-2 text-[11px] text-white/35">{t("atajos")}</p>
                </Seccion>
              </>
            )}
          </div>
        </aside>
      </div>

      <input ref={archivoCapa} type="file" accept={FORMATOS_IMAGEN_CLIP.join(",")} className="hidden" onChange={(e) => { void subir(e.target.files?.[0], "capa"); e.target.value = ""; }} />
      <input ref={archivoFondo} type="file" accept={FORMATOS_IMAGEN_CLIP.join(",")} className="hidden" onChange={(e) => { void subir(e.target.files?.[0], "fondo"); e.target.value = ""; }} />
      <input ref={archivoReemplazo} type="file" accept={FORMATOS_IMAGEN_CLIP.join(",")} className="hidden" onChange={(e) => { void subir(e.target.files?.[0], "reemplazo"); e.target.value = ""; }} />
    </>
  );
}

// ---- Piezas del panel ----

function Manija({
  className,
  etiqueta,
  chica,
  onPointerDown,
}: {
  className: string;
  etiqueta: string;
  chica?: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <span
      role="button"
      aria-label={etiqueta}
      title={etiqueta}
      onPointerDown={onPointerDown}
      className={`pointer-events-auto absolute flex items-center justify-center ${chica ? "h-5 w-5" : "h-6 w-6"} ${className}`}
      style={{ touchAction: "none" }}
    >
      <span className={`block rounded-full border-2 border-sky-400 bg-white shadow ${chica ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}`} />
    </span>
  );
}

function Seccion({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-white/50">{titulo}</h3>
        {accion}
      </div>
      {children}
    </section>
  );
}

function BotonAgregar({ icono, texto, disabled, onClick }: { icono: React.ReactNode; texto: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-1.5 py-2.5 text-center text-[11px] leading-tight text-white/75 hover:bg-white/5 disabled:opacity-40"
    >
      {icono}
      {texto}
    </button>
  );
}

const opcion = (activa: boolean) =>
  `rounded-lg border px-2.5 py-1.5 text-left text-xs ${activa ? "border-ng-azul bg-ng-azul/15 text-white" : "border-white/15 text-white/70 hover:bg-white/5"}`;

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  mostrar,
  onCambio,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  mostrar: (v: number) => string;
  onCambio: (v: number) => void;
}) {
  return (
    <label className="mt-3 block">
      <span className="flex justify-between text-xs text-white/60">
        <span>{etiqueta}</span>
        <span className="tabular-nums">{mostrar(valor)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="mt-1 w-full accent-[#FFD400]"
      />
    </label>
  );
}

function Interruptor({ etiqueta, valor, onCambio, ayuda }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void; ayuda?: string }) {
  return (
    <label className="mt-2 flex items-start gap-2 text-sm">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} className="mt-1" />
      <span>
        {etiqueta}
        {ayuda && <span className="block text-[11px] text-white/40">{ayuda}</span>}
      </span>
    </label>
  );
}

function ColorTema({
  etiqueta,
  valor,
  porDefecto,
  onCambio,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  porDefecto: string;
  onCambio: (v: string | null) => void;
}) {
  const t = useTranslations("editorPortada");
  return (
    <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
      <span className="flex-1">{etiqueta}</span>
      <input
        type="color"
        value={valor ?? porDefecto}
        onChange={(e) => onCambio(e.target.value.toUpperCase())}
        className="h-7 w-10 cursor-pointer rounded border border-white/15 bg-transparent"
        aria-label={etiqueta}
      />
      {valor ? (
        <button onClick={() => onCambio(null)} className="rounded border border-white/15 px-2 py-1 hover:bg-white/5">
          {t("delTema")}
        </button>
      ) : (
        <span className="px-2 py-1 text-white/35">{t("delTema")}</span>
      )}
    </div>
  );
}

const porciento = (v: number) => `${Math.round(v * 100)} %`;

/** El recorte de una capa (o del fondo): `mejora` si es la mejorada con IA y no quitar fondo. */
type RecorteDeCapa = RecorteLocal & { mejora: boolean };

/** Sobre el lienzo, mientras se quita el fondo o se mejora con IA (se ve la original), o si falló. */
function EtiquetaRecorte({ recorte }: { recorte?: RecorteDeCapa }) {
  const t = useTranslations("editorPortada");
  if (recorte?.estadoRecorte === "PENDIENTE") {
    return (
      <span className="absolute left-1 top-1 flex items-center gap-1 whitespace-nowrap rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80">
        <Loader2 className="h-3 w-3 animate-spin" />
        {recorte.mejora ? t("mejorando") : t("quitandoFondo")}
      </span>
    );
  }
  if (recorte?.estadoRecorte === "FALLIDO") {
    return (
      <span className="absolute left-1 top-1 whitespace-nowrap rounded bg-red-900/80 px-1.5 py-0.5 text-[10px] text-white">
        {recorte.mejora ? t("mejoraFallo") : t("recorteFallo")}
      </span>
    );
  }
  return null;
}

/** En el panel: en curso (o lento) y, si falló, reintentar. */
function EstadoRecorte({ recorte, onReintentar }: { recorte?: RecorteDeCapa; onReintentar: () => void }) {
  const t = useTranslations("editorPortada");
  if (recorte?.estadoRecorte === "PENDIENTE") {
    const texto = recorte.mejora ? (recorte.lento ? t("mejoraLenta") : t("mejorando")) : recorte.lento ? t("recorteLento") : t("quitandoFondo");
    return <p className="mt-2 text-[11px] text-white/50">{texto}</p>;
  }
  if (recorte?.estadoRecorte === "FALLIDO") {
    return (
      <p className="mt-2 text-[11px] text-red-400">
        {recorte.mejora ? t("mejoraFallo") : t("recorteFallo")}{" "}
        <button onClick={onReintentar} className="underline">
          {t("reintentar")}
        </button>
      </p>
    );
  }
  return null;
}

function PanelFondo({
  fondo,
  subiendo,
  onCambiar,
  onSubir,
  tema,
  recorte,
  onReintentarRecorte,
}: {
  fondo: FondoPortada;
  subiendo: boolean;
  onCambiar: (c: Partial<FondoPortada>, juntar?: string) => void;
  onSubir: () => void;
  tema: Tema;
  /** La mejorada con IA del fondo, si se pidió. */
  recorte?: RecorteDeCapa;
  onReintentarRecorte: () => void;
}) {
  const t = useTranslations("editorPortada");
  const tipos: TipoFondoPortada[] = ["CUADRO", "IMAGEN", "COLOR"];
  return (
    <Seccion titulo={t("fondo")}>
      <div className="grid grid-cols-3 gap-2">
        {tipos.map((x) => (
          <button
            key={x}
            onClick={() => (x === "IMAGEN" && !fondo.url ? onSubir() : onCambiar({ tipo: x }))}
            className={opcion(fondo.tipo === x)}
          >
            {t(`fondos.${x}`)}
          </button>
        ))}
      </div>
      {fondo.tipo === "IMAGEN" && (
        <button onClick={onSubir} disabled={subiendo} className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">
          {subiendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {fondo.url ? t("cambiarImagen") : t("subirImagen")}
        </button>
      )}
      {fondo.tipo === "COLOR" && (
        <ColorTema etiqueta={t("color")} valor={fondo.color} porDefecto={tema.colorFondo} onCambio={(v) => onCambiar({ color: v })} />
      )}
      {fondo.tipo === "CUADRO" && (
        <Interruptor etiqueta={t("centrarCara")} ayuda={t("centrarCaraAyuda")} valor={!!fondo.centrarCara} onCambio={(v) => onCambiar({ centrarCara: v })} />
      )}
      {fondo.tipo !== "COLOR" && (
        <>
          <Interruptor etiqueta={t("mejorar")} ayuda={t("mejorarAyuda")} valor={fondo.mejorar} onCambio={(v) => onCambiar({ mejorar: v })} />
          <EstadoRecorte recorte={recorte} onReintentar={onReintentarRecorte} />
          <Deslizador
            etiqueta={t("desenfoque")}
            valor={fondo.desenfoque}
            min={0}
            max={1}
            paso={0.05}
            mostrar={porciento}
            onCambio={(v) => onCambiar({ desenfoque: v }, "fondo-desenfoque")}
          />
        </>
      )}
      <Deslizador
        etiqueta={t("oscurecer")}
        valor={fondo.oscurecer}
        min={0}
        max={0.7}
        paso={0.05}
        mostrar={porciento}
        onCambio={(v) => onCambiar({ oscurecer: v }, "fondo-oscurecer")}
      />
    </Seccion>
  );
}

function IconoCapa({ capa }: { capa: CapaPortada }) {
  const cls = "h-3.5 w-3.5 shrink-0 text-white/50";
  if (capa.tipo === "TEXTO") return capa.titulo ? <Heading className={cls} /> : <Type className={cls} />;
  if (capa.tipo === "LOGO") return <BadgeCheck className={cls} />;
  if (capa.tipo === "FORMA") return <Square className={cls} />;
  return capa.cuadro ? <Film className={cls} /> : <IconoImagen className={cls} />;
}

function nombreCapa(capa: CapaPortada, t: ReturnType<typeof useTranslations>): string {
  if (capa.tipo === "TEXTO") return capa.titulo ? t("capaTitulo") : capa.texto?.trim() || t("capaTexto");
  if (capa.tipo === "LOGO") return t("capaLogo");
  if (capa.tipo === "FORMA") return t("capaForma");
  return capa.cuadro ? t("capaCuadro") : t("capaImagen");
}

function PanelCapa({
  capa,
  indice,
  total,
  tema,
  lleno,
  subiendo,
  recorte,
  cuadroRecortable,
  onReintentarRecorte,
  onCambiar,
  onBorrar,
  onDuplicar,
  onSubir,
  onBajar,
  onReemplazar,
  onListo,
}: {
  capa: CapaPortada;
  indice: number;
  total: number;
  tema: Tema;
  lleno: boolean;
  subiendo: boolean;
  recorte?: RecorteDeCapa;
  /** El cuadro del clip es uno limpio: su recorte se ve en vivo. */
  cuadroRecortable: boolean;
  onReintentarRecorte: () => void;
  onCambiar: (c: Partial<CapaPortada>, juntar?: string) => void;
  onBorrar: () => void;
  onDuplicar: () => void;
  onSubir: () => void;
  onBajar: () => void;
  onReemplazar: () => void;
  onListo: () => void;
}) {
  const t = useTranslations("editorPortada");
  const tp = useTranslations("portadaMarca");
  const j = (campo: string) => `${capa.id}-${campo}`;
  const fuente = (capa.fuente ?? "ANTON") as FuenteEstilo;
  const estilo = capa.estilo ?? "DOS_COLORES";

  return (
    <>
      <div className="flex items-center gap-2">
        <IconoCapa capa={capa} />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{nombreCapa(capa, t)}</h3>
        <button onClick={onListo} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs hover:bg-white/15">
          {t("listo")}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <BotonIcono etiqueta={t("traerAdelante")} onClick={onSubir} disabled={indice >= total - 1}>
          <ArrowUp className="h-4 w-4" />
        </BotonIcono>
        <BotonIcono etiqueta={t("llevarAtras")} onClick={onBajar} disabled={indice <= 0}>
          <ArrowDown className="h-4 w-4" />
        </BotonIcono>
        <BotonIcono etiqueta={t("duplicar")} onClick={onDuplicar} disabled={lleno}>
          <Copy className="h-4 w-4" />
        </BotonIcono>
        <BotonIcono etiqueta={t("borrar")} onClick={onBorrar} peligro>
          <Trash2 className="h-4 w-4" />
        </BotonIcono>
      </div>

      {capa.tipo === "TEXTO" && (
        <Seccion titulo={t("texto")}>
          <Interruptor etiqueta={t("usarTitulo")} ayuda={t("usarTituloAyuda")} valor={!!capa.titulo} onCambio={(v) => onCambiar({ titulo: v })} />
          <textarea
            value={capa.texto ?? ""}
            onChange={(e) => onCambiar({ texto: e.target.value.slice(0, 160) }, j("texto"))}
            rows={3}
            placeholder={capa.titulo ? t("textoMuestra") : t("escribeTexto")}
            className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.03] px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-ng-azul"
          />
          {capa.titulo && <p className="text-[11px] text-white/40">{t("tituloAyuda")}</p>}

          <p className="mt-3 text-xs text-white/60">{t("estilo")}</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {ESTILOS_PORTADA.map((e) => (
              <button key={e} onClick={() => onCambiar({ estilo: e })} className={opcion(estilo === e)}>
                {tp(`estilos.${e}.nombre`)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/60">{t("fuente")}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FUENTES_PORTADA.map((f) => {
              const def = FUENTES_ESTILO[f];
              return (
                <button
                  key={f}
                  onClick={() => onCambiar({ fuente: f })}
                  className={opcion(fuente === f)}
                  style={{ fontFamily: `"${def.familiaCss}", sans-serif`, fontWeight: def.peso }}
                >
                  {def.familiaCss}
                </button>
              );
            })}
          </div>
          <Interruptor etiqueta={t("mayusculas")} valor={capa.mayusculas !== false} onCambio={(v) => onCambiar({ mayusculas: v })} />
          <ColorTema
            etiqueta={estilo === "CAJA" ? t("colorLetra") : estilo === "DOS_COLORES" ? t("colorPrimerRenglon") : t("colorLetra")}
            valor={capa.color}
            porDefecto={tema.colorTexto}
            onCambio={(v) => onCambiar({ color: v })}
          />
          {estilo !== "LIMPIO" && (
            <ColorTema
              etiqueta={estilo === "CAJA" ? t("colorCaja") : t("colorResto")}
              valor={capa.color2}
              porDefecto={tema.colorPrimario}
              onCambio={(v) => onCambiar({ color2: v })}
            />
          )}
          <Deslizador
            etiqueta={t("tamano")}
            valor={capa.tamano ?? 0.12}
            min={0.02}
            max={0.4}
            paso={0.005}
            mostrar={(v) => `${Math.round(v * 1000) / 10} %`}
            onCambio={(v) => onCambiar({ tamano: v }, j("tamano"))}
          />
          <Deslizador
            etiqueta={t("anchoTexto")}
            valor={entre(capa.ancho, 0.1, 1.5)}
            min={0.1}
            max={1.5}
            paso={0.01}
            mostrar={porciento}
            onCambio={(v) => onCambiar({ ancho: v }, j("ancho"))}
          />
        </Seccion>
      )}

      {capa.tipo === "IMAGEN" && (
        <Seccion titulo={capa.cuadro ? t("capaCuadro") : t("capaImagen")}>
          {capa.cuadro ? (
            <p className="text-[11px] text-white/40">{t("cuadroAyuda")}</p>
          ) : (
            <button onClick={onReemplazar} disabled={subiendo} className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs hover:bg-white/5 disabled:opacity-50">
              {subiendo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("cambiarImagen")}
            </button>
          )}
          <Interruptor etiqueta={t("quitarFondo")} ayuda={t("quitarFondoAyuda")} valor={!!capa.sinFondo} onCambio={(v) => onCambiar({ sinFondo: v })} />
          <Interruptor
            etiqueta={capa.sinFondo ? t("contornoSticker") : t("marcoBlanco")}
            valor={!!capa.contorno}
            onCambio={(v) => onCambiar({ contorno: v })}
          />
          <Interruptor etiqueta={t("mejorar")} ayuda={t("mejorarAyuda")} valor={!!capa.mejorar} onCambio={(v) => onCambiar({ mejorar: v })} />
          {capa.cuadro && !cuadroRecortable && (capa.sinFondo || capa.contorno) && (
            <p className="mt-2 text-[11px] text-amber-300/90">{t("cuadroRecorteAyuda")}</p>
          )}
          <EstadoRecorte recorte={recorte} onReintentar={onReintentarRecorte} />
          <Deslizador etiqueta={t("tamano")} valor={entre(capa.ancho, 0.02, 2)} min={0.05} max={1.5} paso={0.01} mostrar={porciento} onCambio={(v) => onCambiar({ ancho: v }, j("ancho"))} />
        </Seccion>
      )}

      {capa.tipo === "LOGO" && (
        <Seccion titulo={t("capaLogo")}>
          <Deslizador etiqueta={t("tamano")} valor={entre(capa.ancho, 0.02, 2)} min={0.05} max={0.8} paso={0.01} mostrar={porciento} onCambio={(v) => onCambiar({ ancho: v }, j("ancho"))} />
        </Seccion>
      )}

      {capa.tipo === "FORMA" && (
        <Seccion titulo={t("capaForma")}>
          <ColorTema etiqueta={t("color")} valor={capa.color} porDefecto={tema.colorPrimario} onCambio={(v) => onCambiar({ color: v })} />
          <Deslizador etiqueta={t("ancho")} valor={entre(capa.ancho, 0.02, 2)} min={0.02} max={1.2} paso={0.01} mostrar={porciento} onCambio={(v) => onCambiar({ ancho: v }, j("ancho"))} />
          <Deslizador etiqueta={t("alto")} valor={entre(capa.alto ?? 0.1, 0.005, 2)} min={0.005} max={1.2} paso={0.005} mostrar={porciento} onCambio={(v) => onCambiar({ alto: v }, j("alto"))} />
          <Deslizador etiqueta={t("radio")} valor={entre(capa.radio ?? 0, 0, 0.5)} min={0} max={0.5} paso={0.01} mostrar={porciento} onCambio={(v) => onCambiar({ radio: v }, j("radio"))} />
        </Seccion>
      )}

      <Seccion titulo={t("ajustes")}>
        <Deslizador etiqueta={t("opacidad")} valor={capa.opacidad} min={0} max={1} paso={0.05} mostrar={porciento} onCambio={(v) => onCambiar({ opacidad: v }, j("opacidad"))} />
        <Deslizador
          etiqueta={t("rotacion")}
          valor={capa.rotacion}
          min={-180}
          max={180}
          paso={1}
          mostrar={(v) => `${Math.round(v)}°`}
          onCambio={(v) => onCambiar({ rotacion: v }, j("rotacion"))}
        />
      </Seccion>
    </>
  );
}

function BotonIcono({
  etiqueta,
  onClick,
  disabled,
  peligro,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  disabled?: boolean;
  peligro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs disabled:opacity-30 ${
        peligro ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-white/15 text-white/75 hover:bg-white/5"
      }`}
    >
      {children}
      <span>{etiqueta}</span>
    </button>
  );
}
